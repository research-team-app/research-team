"""
Token endpoint for Glue / cron jobs. Exchange INTERNAL_API_KEY for a Bearer token.
"""

import os
import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from auth import INTERNAL_API_KEY, INTERNAL_TOKEN_EXPIRY_SECONDS, create_internal_token

auth_token_router = APIRouter()


def _load_positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        return max(1, int(raw))
    except (TypeError, ValueError):
        return default


_RATE_LIMIT_WINDOW_SECONDS = _load_positive_int_env("AUTH_TOKEN_RATE_LIMIT_WINDOW", 60)
_RATE_LIMIT_MAX_REQUESTS = _load_positive_int_env("AUTH_TOKEN_RATE_LIMIT_MAX", 20)
_token_attempts: dict[str, deque[float]] = defaultdict(deque)


def _enforce_auth_token_rate_limit(client_id: str) -> None:
    now = time.time()
    cutoff = now - _RATE_LIMIT_WINDOW_SECONDS
    attempts = _token_attempts[client_id]
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    if len(attempts) >= _RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many token requests. Please try again later.",
        )
    attempts.append(now)


class TokenRequest(BaseModel):
    """Request body for POST /auth/token. Use the same value as INTERNAL_API_KEY in .env."""

    api_key: str = Field(
        ..., min_length=1, description="Internal API key (INTERNAL_API_KEY)"
    )


@auth_token_router.post("/auth/token")
async def get_internal_token(request: TokenRequest, raw_request: Request):
    """
    Exchange internal API key for a Bearer token (for Glue, cron, server-to-server).
    Set INTERNAL_API_KEY in .env; pass the same value in the request body.
    Use the returned access_token in the Authorization header: Bearer <access_token>.
    """
    if not INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Internal token not configured (INTERNAL_API_KEY missing)",
        )

    client_host = (raw_request.client.host if raw_request.client else None) or "unknown"
    _enforce_auth_token_rate_limit(client_host)

    key_from_request = request.api_key.strip()
    if key_from_request != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid api_key. Use the exact value of INTERNAL_API_KEY from the API's environment (no extra spaces or quotes).",
        )
    access_token = create_internal_token()
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": INTERNAL_TOKEN_EXPIRY_SECONDS,
    }
