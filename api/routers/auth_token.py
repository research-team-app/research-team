"""
Token endpoint for Glue / cron jobs. Exchange INTERNAL_API_KEY for a Bearer token.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from auth import INTERNAL_API_KEY, INTERNAL_TOKEN_EXPIRY_SECONDS, create_internal_token

auth_token_router = APIRouter()


class TokenRequest(BaseModel):
    """Request body for POST /auth/token. Use the same value as INTERNAL_API_KEY in .env."""

    api_key: str = Field(
        ..., min_length=1, description="Internal API key (INTERNAL_API_KEY)"
    )


@auth_token_router.post("/auth/token")
async def get_internal_token(request: TokenRequest):
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
