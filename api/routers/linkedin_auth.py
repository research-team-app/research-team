"""
LinkedIn OAuth 2.0 (OpenID Connect) integration.

Setup steps for LinkedIn Developer App:
1.  Go to https://www.linkedin.com/developers/apps/new
2.  Create an app (attach a LinkedIn Company Page — required by LinkedIn)
3.  Under "Products", request "Sign In with LinkedIn using OpenID Connect"
4.  Under "Auth" → "OAuth 2.0 settings" → add Authorized Redirect URL:
      http://localhost:8000/auth/linkedin/callback   (local dev)
      https://api.yourapp.com/auth/linkedin/callback  (production)
5.  Copy Client ID and Client Secret
6.  Set env vars:
      LINKEDIN_CLIENT_ID=...
      LINKEDIN_CLIENT_SECRET=...
      LINKEDIN_REDIRECT_URI=http://localhost:8000/auth/linkedin/callback
      FRONTEND_URL=http://localhost:3000
"""

import os
import uuid
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

linkedin_auth_router = APIRouter()

LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "").strip()
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "").strip()
LINKEDIN_REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URI", "").strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").strip()

# Short-lived in-memory cache: import_id → profile data (single-use, max 500 entries)
_import_cache: dict[str, dict[str, Any]] = {}
_MAX_CACHE = 500


def _configured() -> bool:
    return bool(LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET and LINKEDIN_REDIRECT_URI)


@linkedin_auth_router.get("/auth/linkedin/configured")
async def linkedin_configured():
    """Frontend checks this to decide whether to show the LinkedIn button."""
    return {"configured": _configured()}


@linkedin_auth_router.get("/auth/linkedin")
async def linkedin_auth_start(user_id: str = Query(...)):
    """
    Step 1: Redirect the user's browser to LinkedIn OAuth consent screen.
    Called by the frontend via window.location.href.
    """
    if not _configured():
        raise HTTPException(
            status_code=501,
            detail="LinkedIn integration not configured. "
            "Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI.",
        )

    # Encode user_id into state so we can redirect back to their profile
    state = f"{user_id}:{uuid.uuid4()}"

    auth_url = (
        "https://www.linkedin.com/oauth/v2/authorization"
        "?response_type=code"
        f"&client_id={LINKEDIN_CLIENT_ID}"
        f"&redirect_uri={LINKEDIN_REDIRECT_URI}"
        "&scope=openid%20profile%20email"
        f"&state={state}"
    )
    return RedirectResponse(auth_url)


@linkedin_auth_router.get("/auth/linkedin/callback")
async def linkedin_auth_callback(
    code: str | None = Query(None),
    state: str = Query(...),
    error: str | None = Query(None),
):
    """
    Step 2: LinkedIn redirects here after the user grants consent.
    Exchange code → access token → fetch profile → cache → redirect to frontend.
    """
    user_id = state.split(":")[0] if ":" in state else ""
    base_redirect = f"{FRONTEND_URL}/profile?id={user_id}"

    if error or not code:
        # User denied — send them back without import
        return RedirectResponse(base_redirect)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Exchange authorization code for access token
            token_resp = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": LINKEDIN_REDIRECT_URI,
                    "client_id": LINKEDIN_CLIENT_ID,
                    "client_secret": LINKEDIN_CLIENT_SECRET,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            token_resp.raise_for_status()
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise ValueError(f"No access_token in response: {token_data}")

            # Fetch profile via OIDC userinfo endpoint
            # Gives: sub, name, given_name, family_name, picture, email, locale
            profile_resp = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            profile_resp.raise_for_status()
            profile = profile_resp.json()

    except Exception as exc:
        # Store error so frontend can surface a message
        import_id = str(uuid.uuid4())
        _import_cache[import_id] = {"_error": str(exc)}
        return RedirectResponse(f"{base_redirect}&linkedin_import={import_id}")

    # Build the importable payload
    payload: dict[str, Any] = {}
    if profile.get("given_name"):
        payload["first_name"] = profile["given_name"]
    if profile.get("family_name"):
        payload["last_name"] = profile["family_name"]
    if profile.get("picture"):
        payload["profile_image_url"] = profile["picture"]
    # headline is sometimes present as profile["headline"]
    if profile.get("headline"):
        payload["title"] = profile["headline"]

    # Evict if cache is full
    if len(_import_cache) >= _MAX_CACHE:
        for k in list(_import_cache.keys())[:100]:
            _import_cache.pop(k, None)

    import_id = str(uuid.uuid4())
    _import_cache[import_id] = payload

    return RedirectResponse(f"{base_redirect}&linkedin_import={import_id}")


@linkedin_auth_router.get("/auth/linkedin/import/{import_id}")
async def get_linkedin_import(import_id: str):
    """
    Step 3: Frontend calls this (once) to retrieve and consume the cached import.
    Returns the profile fields found from LinkedIn.
    """
    data = _import_cache.pop(import_id, None)
    if data is None:
        raise HTTPException(
            status_code=404, detail="Import session not found or already consumed"
        )
    if "_error" in data:
        raise HTTPException(
            status_code=502, detail=f"LinkedIn auth failed: {data['_error']}"
        )
    return data
