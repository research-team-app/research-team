import logging

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

import db
from auth import admin
from utils import enforce_rate_limit

contact_router = APIRouter()
logger = logging.getLogger(__name__)


class ContactRequest(BaseModel):
    firstname: str = Field(..., min_length=1, max_length=255)
    lastname: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=500)
    message: str = Field(..., min_length=1, max_length=10000)


@contact_router.post("/contact-us")
async def post_message(request: ContactRequest, raw_request: Request):
    """Inserts into contact_us (id defaults via gen_random_uuid() in DB)."""
    enforce_rate_limit(
        raw_request,
        bucket="contact-us",
        max_requests=5,
        window_seconds=60,
    )
    contact_data = request.model_dump()
    try:
        await db.pool.execute(
            """
            INSERT INTO contact_us (firstname, lastname, email, subject, message)
            VALUES ($1, $2, $3, $4, $5)
            """,
            contact_data["firstname"],
            contact_data["lastname"],
            str(contact_data["email"]),
            contact_data["subject"],
            contact_data["message"],
        )
    except Exception as e:
        logger.exception("contact_us insert failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit message. Please try again.",
        )

    return {
        "message": "Successfully submitted contact message",
        "data": {
            "firstname": request.firstname,
            "lastname": request.lastname,
            "email": request.email,
            "subject": request.subject,
            "message": request.message,
        },
    }


@contact_router.get("/contact-us")
@admin
async def list_messages():
    rows = await db.pool.fetch("SELECT * FROM contact_us ORDER BY id DESC LIMIT 100")
    return [dict(row) for row in rows]


@contact_router.get("/contact-us/{message_id}")
@admin
async def get_message(message_id: str):
    row = await db.pool.fetchrow("SELECT * FROM contact_us WHERE id = $1", message_id)
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    return dict(row)


@contact_router.delete("/contact-us/{message_id}")
@admin
async def delete_message(message_id: str):
    row = await db.pool.fetchrow(
        "DELETE FROM contact_us WHERE id = $1 RETURNING *", message_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    return dict(row)
