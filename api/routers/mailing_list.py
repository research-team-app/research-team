from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

import db
from auth import admin
from utils import enforce_rate_limit

mailing_list_router = APIRouter()


class MailingListSubscribe(BaseModel):
    email: EmailStr


@mailing_list_router.get("/mailing-list", response_model=list[str])
@admin
async def get_mailing_list():
    """Fetch the mailing list from the database."""
    try:
        result = await db.pool.fetch(
            "SELECT email FROM mailing_list ORDER BY created_at DESC"
        )
        return [row["email"] for row in result]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected server error.",
        )


@mailing_list_router.post("/mailing-list")
async def subscribe_mailing_list(item: MailingListSubscribe, raw_request: Request):
    """Subscribe an email to the newsletter (Stay Updated). Idempotent: already-subscribed returns success."""
    enforce_rate_limit(
        raw_request,
        bucket="mailing-list",
        max_requests=5,
        window_seconds=60,
    )
    email = str(item.email).strip().lower()
    try:
        await db.pool.execute(
            "INSERT INTO mailing_list (email) VALUES ($1)",
            email,
        )
        return {
            "message": "Thanks for subscribing! We'll keep you updated.",
            "ok": True,
        }
    except Exception as e:
        err_lower = str(e).lower()
        # Already subscribed (unique constraint) -> treat as success
        if "unique" in err_lower or "duplicate" in err_lower:
            return {
                "message": "Thanks for subscribing! We'll keep you updated.",
                "ok": True,
            }
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected server error.",
        )


@mailing_list_router.delete("/mailing-list")
@admin
async def remove_from_mailing_list(email: str):
    """Remove an email from the mailing list."""
    try:
        result = await db.pool.fetch(
            "DELETE FROM mailing_list WHERE email = $1 RETURNING email", email
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found in mailing list",
            )
        return {"message": "Email removed from mailing list"}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected server error.",
        )
