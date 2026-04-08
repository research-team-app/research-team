"""
Cognito JWT verification for API. Protects user-owned resources (profile, wishlist, profile picture).
Public: GET grants, GET grants/{id}, GET users, GET users/{id}, POST grants/ai-search, POST users/ai-search.

Route decorators: use @authenticated or @admin on route handlers to enforce access.
- @authenticated: requires valid Bearer token (any logged-in user).
- @admin: requires valid Bearer token and sub in BUG_REPORT_ADMIN_SUBS.

Internal token: for Glue/cron, use POST /auth/token with INTERNAL_API_KEY to get a Bearer token.
Use get_verified_user_or_internal when a route should accept either Cognito or internal token.
"""

import inspect
import os
import time
from collections.abc import Callable
from functools import wraps
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient


# For Glue/cron: shared secret. Set INTERNAL_API_KEY in .env; use it in POST /auth/token to get a Bearer token.
def _load_internal_api_key() -> str:
    raw = os.environ.get("INTERNAL_API_KEY", "").strip()
    if raw and raw[0] in ("'", '"') and raw[-1] == raw[0]:
        raw = raw[1:-1].strip()
    return raw


INTERNAL_API_KEY = _load_internal_api_key()
INTERNAL_JWT_ISSUER = "research-team-api"
INTERNAL_JWT_AUDIENCE = "research-team-internal"
INTERNAL_TOKEN_EXPIRY_SECONDS = 86400  # 24 hours

COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", "").strip()
COGNITO_REGION = os.environ.get("COGNITO_REGION", "us-east-1").strip()
# If pool ID is not set, auth is disabled (no verification)
AUTH_ENABLED = bool(COGNITO_USER_POOL_ID)

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient | None:
    global _jwks_client
    if not AUTH_ENABLED:
        return None
    if _jwks_client is None:
        jwks_url = (
            f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/"
            f"{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
        )
        _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=300)
    return _jwks_client


def _verify_token(token: str) -> dict:
    """Verify Cognito JWT and return payload. Raises HTTPException on failure."""
    if not AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured (COGNITO_USER_POOL_ID missing)",
        )
    client = _get_jwks_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured",
        )
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing sub",
        )
    return payload


security = HTTPBearer(auto_error=False)


def get_verified_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    """Dependency: require valid Bearer token and return token payload (includes 'sub').
    Internal token (INTERNAL_API_KEY) is accepted as a superuser on any route."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = credentials.credentials
    # Internal token acts as superuser — accepted on every protected route.
    internal = verify_internal_token(token)
    if internal is not None:
        return internal
    return _verify_token(token)


def _is_internal(payload: dict) -> bool:
    return payload.get("sub") == "internal"


def require_self(
    resource_id: str,
    payload: Annotated[dict, Depends(get_verified_user)],
) -> str:
    """Dependency: ensure token sub matches resource_id. Internal token bypasses this check."""
    if _is_internal(payload):
        return (resource_id or "").strip()
    sub = (payload.get("sub") or "").strip()
    rid = (resource_id or "").strip()
    if sub != rid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own resource",
        )
    return rid


def require_self_id(
    payload: Annotated[dict, Depends(get_verified_user)],
    id: str | UUID,
) -> str:
    """Dependency for path param 'id': require token sub == id. Internal token bypasses this check."""
    if _is_internal(payload):
        return str(id).strip() if id is not None else ""
    sub = (payload.get("sub") or "").strip()
    rid = str(id).strip() if id is not None else ""
    if sub != rid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own resource",
        )
    return rid


def require_self_user_id(
    payload: Annotated[dict, Depends(get_verified_user)],
    user_id: str,
) -> str:
    """Dependency for path param 'user_id': require token sub == user_id. Internal token bypasses this check."""
    if _is_internal(payload):
        return (user_id or "").strip()
    sub = (payload.get("sub") or "").strip()
    rid = (user_id or "").strip()
    if sub != rid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own resource",
        )
    return rid


# Admin allowlist for bug report (and similar) admin-only endpoints.
# Comma-separated Cognito user IDs (sub). Only these users can GET/DELETE bug reports.
ADMIN_SUBS: set[str] | None = None


def _get_admin_subs() -> set[str]:
    global ADMIN_SUBS
    if ADMIN_SUBS is None:
        raw = (os.environ.get("ADMIN_SUBS") or "").strip()
        ADMIN_SUBS = {s.strip() for s in raw.split(",") if s.strip()}
    return ADMIN_SUBS


def require_bug_report_admin(
    payload: Annotated[dict, Depends(get_verified_user)],
) -> dict:
    """Dependency: require valid Bearer token and that token's sub is in ADMIN_SUBS.
    Internal token is always allowed."""
    if _is_internal(payload):
        return payload
    sub = (payload.get("sub") or "").strip()
    admin_subs = _get_admin_subs()
    if not admin_subs:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin list not configured (ADMIN_SUBS)",
        )
    if sub not in admin_subs:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Contact an administrator if you need access.",
        )
    return payload


# ---- Internal token (Glue / cron) -------------------------------------------


def create_internal_token() -> str:
    """Create a short-lived JWT for internal callers (Glue, cron). Requires INTERNAL_API_KEY to be set."""
    if not INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal token not configured (INTERNAL_API_KEY missing)",
        )
    now = int(time.time())
    payload = {
        "sub": "internal",
        "iss": INTERNAL_JWT_ISSUER,
        "aud": INTERNAL_JWT_AUDIENCE,
        "iat": now,
        "exp": now + INTERNAL_TOKEN_EXPIRY_SECONDS,
    }
    return jwt.encode(
        payload,
        INTERNAL_API_KEY,
        algorithm="HS256",
    )


def verify_internal_token(token: str) -> dict | None:
    """Verify internal JWT. Returns payload if valid, None otherwise (no exception)."""
    if not INTERNAL_API_KEY:
        return None
    try:
        payload = jwt.decode(
            token,
            INTERNAL_API_KEY,
            algorithms=["HS256"],
            audience=INTERNAL_JWT_AUDIENCE,
            issuer=INTERNAL_JWT_ISSUER,
        )
        return payload
    except jwt.PyJWTError:
        return None


def get_verified_user_or_internal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict:
    """Dependency: require valid Bearer token — either Cognito JWT or internal (Glue/cron) JWT."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = credentials.credentials
    # Try internal token first (no network)
    internal = verify_internal_token(token)
    if internal is not None:
        return internal
    # Only fall back to Cognito if auth is configured (avoid 503 when only internal is used)
    if AUTH_ENABLED:
        return _verify_token(token)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )


# ---- Route decorators: @authenticated, @admin ---------------------------------


def _inject_auth_dependency(
    f: Callable,
    dependency: Callable,
    param_name: str = "_auth",
) -> Callable:
    """Wrap a route handler so FastAPI injects the given dependency. Preserves signature for path/query params."""
    sig = inspect.signature(f)
    params = list(sig.parameters.values())
    auth_param = inspect.Parameter(
        param_name,
        inspect.Parameter.KEYWORD_ONLY,
        default=Depends(dependency),
        annotation=dict,
    )
    params.append(auth_param)
    new_sig = sig.replace(parameters=params)

    @wraps(f)
    async def wrapped(*args, **kwargs):
        kwargs.pop(param_name, None)
        if inspect.iscoroutinefunction(f):
            return await f(*args, **kwargs)
        return f(*args, **kwargs)

    wrapped.__signature__ = new_sig
    return wrapped


def authenticated(f: Callable) -> Callable:
    """Decorator: require valid Bearer token. Use on route handlers that need any logged-in user."""
    return _inject_auth_dependency(f, get_verified_user)


def admin(f: Callable) -> Callable:
    """Decorator: require valid Bearer token and sub in BUG_REPORT_ADMIN_SUBS. Use for admin-only routes."""
    return _inject_auth_dependency(f, require_bug_report_admin)


def verify_admin_token(token: str) -> dict:
    """Verify a raw Bearer token string and confirm the sub is in ADMIN_SUBS.
    Used by query-param protected endpoints (e.g. /admin/docs). Raises HTTPException on failure."""
    payload = _verify_token(token)
    if _is_internal(payload):
        return payload
    sub = (payload.get("sub") or "").strip()
    admin_subs = _get_admin_subs()
    if not admin_subs or sub not in admin_subs:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )
    return payload
