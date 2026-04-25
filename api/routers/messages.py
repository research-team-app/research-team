from __future__ import annotations

import asyncio
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field, ValidationError
from starlette.datastructures import UploadFile

import db
from auth import get_verified_user
from utils import (
    DEFAULT_ATTACHMENT_CONTENT_TYPE,
    MAX_ATTACHMENT_SIZE_BYTES,
    is_missing_relation_error,
    safe_attachment_disposition,
)

messages_router = APIRouter()


class MessageCreateRequest(BaseModel):
    recipient_id: str = Field(..., min_length=1, max_length=100)
    content: str = Field("", max_length=2000)


def _build_attachment_payload(record, message_id: str):
    file_name = (record.get("attachment_file_name") or "").strip()
    if not file_name:
        return None

    return {
        "file_name": file_name,
        "content_type": record.get("attachment_content_type")
        or DEFAULT_ATTACHMENT_CONTENT_TYPE,
        "size_bytes": int(record.get("attachment_size_bytes") or 0),
        "download_url": f"/messages/{message_id}/attachment",
    }


async def _extract_request_payload(request: Request):
    content_type = (request.headers.get("content-type") or "").lower()
    if "multipart/form-data" in content_type:
        form = await request.form()
        recipient_id = str(form.get("recipient_id") or "").strip()
        content = str(form.get("content") or "").strip()

        file_obj = form.get("file")
        attachment = None
        if file_obj is not None:
            if not isinstance(file_obj, UploadFile):
                raise HTTPException(status_code=400, detail="File upload required")
            file_name = str(file_obj.filename or "").strip()
            if not file_name:
                raise HTTPException(
                    status_code=400, detail="Attachment filename is required"
                )

            file_data = await file_obj.read()
            size_bytes = len(file_data)
            if size_bytes <= 0:
                raise HTTPException(status_code=400, detail="Attachment file is empty")
            if size_bytes > MAX_ATTACHMENT_SIZE_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail="Attachment must be 25MB or smaller",
                )

            attachment = {
                "file_name": file_name[:255],
                "content_type": (
                    str(getattr(file_obj, "content_type", "") or "").strip()
                    or DEFAULT_ATTACHMENT_CONTENT_TYPE
                ),
                "size_bytes": size_bytes,
                "file_data": file_data,
            }

        return recipient_id, content, attachment

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid request payload") from exc

    try:
        req = MessageCreateRequest.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    return req.recipient_id.strip(), req.content.strip(), None


@messages_router.post("/messages", status_code=status.HTTP_201_CREATED)
async def send_message(
    request: Request,
    auth: dict = Depends(get_verified_user),
):
    sender_id = (auth.get("sub") or "").strip()
    recipient_id, content, attachment = await _extract_request_payload(request)

    if not sender_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not recipient_id:
        raise HTTPException(status_code=400, detail="Recipient is required")
    if sender_id == recipient_id:
        raise HTTPException(status_code=400, detail="You cannot message yourself")
    if len(content) > 2000:
        raise HTTPException(
            status_code=400,
            detail="Message content cannot exceed 2000 characters",
        )
    if not content and not attachment:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    recipient_exists = await db.pool.fetchval(
        "SELECT 1 FROM users WHERE id::text = $1",
        recipient_id,
    )
    if not recipient_exists:
        raise HTTPException(status_code=404, detail="Recipient not found")

    message_id = str(uuid4())
    attachment_id = str(uuid4()) if attachment else None

    try:
        async with db.pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    INSERT INTO user_messages (id, sender_id, recipient_id, content)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, sender_id, recipient_id, content, is_read, created_at
                    """,
                    message_id,
                    sender_id,
                    recipient_id,
                    content,
                )
                if attachment and attachment_id:
                    await conn.execute(
                        """
                        INSERT INTO user_message_attachments (
                            id,
                            message_id,
                            uploader_id,
                            file_name,
                            content_type,
                            size_bytes,
                            file_data
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        attachment_id,
                        message_id,
                        sender_id,
                        attachment["file_name"],
                        attachment["content_type"],
                        attachment["size_bytes"],
                        attachment["file_data"],
                    )
    except Exception as e:
        if is_missing_relation_error(e, "user_messages") or is_missing_relation_error(
            e, "user_message_attachments"
        ):
            raise HTTPException(
                status_code=503,
                detail="Messaging service unavailable. Please try again later.",
            ) from e
        raise HTTPException(status_code=500, detail="Send message failed.")

    return {
        "id": row["id"],
        "sender_id": row["sender_id"],
        "recipient_id": row["recipient_id"],
        "content": row["content"],
        "is_read": bool(row["is_read"]),
        "created_at": row["created_at"],
        "attachment": (
            {
                "file_name": attachment["file_name"],
                "content_type": attachment["content_type"],
                "size_bytes": attachment["size_bytes"],
                "download_url": f"/messages/{row['id']}/attachment",
            }
            if attachment
            else None
        ),
    }


@messages_router.get("/messages/inbox")
async def list_inbox_messages(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        total, unread_count = await asyncio.gather(
            db.pool.fetchval(
                "SELECT COUNT(*) FROM user_messages WHERE recipient_id = $1",
                user_id,
            ),
            db.pool.fetchval(
                "SELECT COUNT(*) FROM user_messages WHERE recipient_id = $1 AND is_read = FALSE",
                user_id,
            ),
        )

        rows = await db.pool.fetch(
            """
            SELECT
                m.id,
                m.sender_id,
                m.recipient_id,
                m.content,
                m.is_read,
                m.created_at,
                a.file_name AS attachment_file_name,
                a.content_type AS attachment_content_type,
                a.size_bytes AS attachment_size_bytes,
                u.first_name,
                u.last_name,
                u.title,
                u.profile_image_url
            FROM user_messages m
            LEFT JOIN user_message_attachments a ON a.message_id = m.id
            LEFT JOIN users u ON u.id::text = m.sender_id
            WHERE m.recipient_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id,
            limit,
            offset,
        )
    except Exception as e:
        if is_missing_relation_error(e, "user_messages"):
            return {"items": [], "total": 0, "unread_count": 0}
        raise HTTPException(status_code=500, detail="Inbox query failed.")

    items = []
    for r in rows:
        first_name = r.get("first_name") or ""
        last_name = r.get("last_name") or ""
        sender_name = f"{first_name} {last_name}".strip() or "Researcher"
        items.append(
            {
                "id": r["id"],
                "sender": {
                    "id": r["sender_id"],
                    "name": sender_name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "title": r.get("title") or "",
                    "profile_image_url": r.get("profile_image_url") or "",
                },
                "recipient_id": r["recipient_id"],
                "content": r["content"],
                "is_read": bool(r["is_read"]),
                "created_at": r["created_at"],
                "attachment": _build_attachment_payload(r, r["id"]),
            }
        )

    return {
        "items": items,
        "total": int(total or 0),
        "unread_count": int(unread_count or 0),
    }


@messages_router.get("/messages/sent")
async def list_sent_messages(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        total = await db.pool.fetchval(
            "SELECT COUNT(*) FROM user_messages WHERE sender_id = $1",
            user_id,
        )

        rows = await db.pool.fetch(
            """
            SELECT
                m.id,
                m.sender_id,
                m.recipient_id,
                m.content,
                m.is_read,
                m.created_at,
                a.file_name AS attachment_file_name,
                a.content_type AS attachment_content_type,
                a.size_bytes AS attachment_size_bytes,
                u.first_name,
                u.last_name,
                u.title,
                u.profile_image_url
            FROM user_messages m
            LEFT JOIN user_message_attachments a ON a.message_id = m.id
            LEFT JOIN users u ON u.id::text = m.recipient_id
            WHERE m.sender_id = $1
            ORDER BY m.created_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id,
            limit,
            offset,
        )
    except Exception as e:
        if is_missing_relation_error(e, "user_messages"):
            return {"items": [], "total": 0}
        raise HTTPException(status_code=500, detail="Sent query failed.")

    items = []
    for r in rows:
        first_name = r.get("first_name") or ""
        last_name = r.get("last_name") or ""
        recipient_name = f"{first_name} {last_name}".strip() or "Researcher"
        items.append(
            {
                "id": r["id"],
                "recipient": {
                    "id": r["recipient_id"],
                    "name": recipient_name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "title": r.get("title") or "",
                    "profile_image_url": r.get("profile_image_url") or "",
                },
                "sender_id": r["sender_id"],
                "content": r["content"],
                "is_read": bool(r["is_read"]),
                "created_at": r["created_at"],
                "attachment": _build_attachment_payload(r, r["id"]),
            }
        )

    return {
        "items": items,
        "total": int(total or 0),
    }


@messages_router.get("/messages/conversations")
async def list_conversations(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conversations_query = """
            WITH scoped AS (
                SELECT
                    m.id,
                    m.sender_id,
                    m.recipient_id,
                    m.content,
                    m.is_read,
                    m.created_at,
                    CASE
                        WHEN m.sender_id = $1 THEN m.recipient_id
                        ELSE m.sender_id
                    END AS other_user_id
                FROM user_messages m
                WHERE m.sender_id = $1 OR m.recipient_id = $1
            ),
            ranked AS (
                SELECT
                    s.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY s.other_user_id
                        ORDER BY s.created_at DESC
                    ) AS rn
                FROM scoped s
            ),
            unread AS (
                SELECT
                    sender_id AS other_user_id,
                    COUNT(*)::int AS unread_count
                FROM user_messages
                WHERE recipient_id = $1 AND is_read = FALSE
                GROUP BY sender_id
            )
            SELECT
                r.other_user_id,
                r.id,
                r.sender_id,
                r.recipient_id,
                r.content,
                r.is_read,
                r.created_at,
                a.file_name AS attachment_file_name,
                a.content_type AS attachment_content_type,
                a.size_bytes AS attachment_size_bytes,
                u.first_name,
                u.last_name,
                u.title,
                u.profile_image_url,
                COALESCE(unread.unread_count, 0)::int AS unread_count
            FROM ranked r
            LEFT JOIN user_message_attachments a ON a.message_id = r.id
            LEFT JOIN users u ON u.id::text = r.other_user_id
            LEFT JOIN unread ON unread.other_user_id = r.other_user_id
            WHERE r.rn = 1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
            """

    try:
        rows = await db.pool.fetch(
            conversations_query,
            user_id,
            limit,
            offset,
        )
    except Exception as e:
        if is_missing_relation_error(e, "user_messages"):
            return {"items": [], "total": 0}
        raise HTTPException(status_code=500, detail="Conversations query failed.")

    items = []
    for r in rows:
        first_name = r.get("first_name") or ""
        last_name = r.get("last_name") or ""
        name = f"{first_name} {last_name}".strip() or "Researcher"
        items.append(
            {
                "user": {
                    "id": r["other_user_id"],
                    "name": name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "title": r.get("title") or "",
                    "profile_image_url": r.get("profile_image_url") or "",
                },
                "last_message": {
                    "id": r["id"],
                    "sender_id": r["sender_id"],
                    "recipient_id": r["recipient_id"],
                    "content": r["content"],
                    "is_read": bool(r["is_read"]),
                    "created_at": r["created_at"],
                    "attachment": _build_attachment_payload(r, r["id"]),
                },
                "unread_count": int(r["unread_count"] or 0),
            }
        )

    return {"items": items, "total": len(items)}


@messages_router.get("/messages/thread/{other_user_id}")
async def get_conversation_thread(
    other_user_id: str,
    limit: int = Query(80, ge=1, le=300),
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        rows = await db.pool.fetch(
            """
            SELECT
                m.id,
                m.sender_id,
                m.recipient_id,
                m.content,
                m.is_read,
                m.created_at,
                a.file_name AS attachment_file_name,
                a.content_type AS attachment_content_type,
                a.size_bytes AS attachment_size_bytes
            FROM user_messages m
            LEFT JOIN user_message_attachments a ON a.message_id = m.id
            WHERE
                (m.sender_id = $1 AND m.recipient_id = $2)
                OR
                (m.sender_id = $2 AND m.recipient_id = $1)
            ORDER BY m.created_at ASC
            LIMIT $3
            """,
            user_id,
            other_user_id,
            limit,
        )
    except Exception as e:
        if is_missing_relation_error(e, "user_messages"):
            return {"items": [], "total": 0}
        raise HTTPException(status_code=500, detail="Thread query failed.")

    items = [
        {
            "id": r["id"],
            "sender_id": r["sender_id"],
            "recipient_id": r["recipient_id"],
            "content": r["content"],
            "is_read": bool(r["is_read"]),
            "created_at": r["created_at"],
            "attachment": _build_attachment_payload(r, r["id"]),
        }
        for r in rows
    ]

    return {"items": items, "total": len(items)}


@messages_router.patch("/messages/thread/{other_user_id}/read")
async def mark_thread_as_read(
    other_user_id: str,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        await db.pool.execute(
            """
            UPDATE user_messages
            SET is_read = TRUE
            WHERE recipient_id = $1
              AND sender_id = $2
              AND is_read = FALSE
            """,
            user_id,
            other_user_id,
        )
    except Exception as e:
        if is_missing_relation_error(e, "user_messages"):
            return {"status": "ok", "updated": 0}
        raise HTTPException(status_code=500, detail="Mark thread read failed.")

    return {"status": "ok"}


@messages_router.get("/messages/unread-count")
async def get_unread_count(auth: dict = Depends(get_verified_user)):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        unread_count = await db.pool.fetchval(
            "SELECT COUNT(*) FROM user_messages WHERE recipient_id = $1 AND is_read = FALSE",
            user_id,
        )
    except Exception as e:
        if is_missing_relation_error(e, "user_messages"):
            return {"unread_count": 0}
        raise HTTPException(status_code=500, detail="Unread count query failed.")

    return {"unread_count": int(unread_count or 0)}


@messages_router.get("/messages/{message_id}/attachment")
async def download_message_attachment(
    message_id: str,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    row = await db.pool.fetchrow(
        """
        SELECT
            m.sender_id,
            m.recipient_id,
            a.file_name,
            a.content_type,
            a.file_data
        FROM user_messages m
        JOIN user_message_attachments a ON a.message_id = m.id
        WHERE m.id = $1
        """,
        message_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")

    if user_id not in {
        (row["sender_id"] or "").strip(),
        (row["recipient_id"] or "").strip(),
    }:
        raise HTTPException(
            status_code=403, detail="You do not have access to this attachment"
        )

    return Response(
        content=bytes(row["file_data"]),
        media_type=(row["content_type"] or DEFAULT_ATTACHMENT_CONTENT_TYPE),
        headers={
            "Content-Disposition": safe_attachment_disposition(row["file_name"]),
        },
    )


@messages_router.patch("/messages/{message_id}/read")
async def mark_message_as_read(
    message_id: str,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    row = await db.pool.fetchrow(
        "SELECT id, recipient_id, is_read FROM user_messages WHERE id = $1",
        message_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    if (row["recipient_id"] or "").strip() != user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only mark your own inbox messages",
        )

    if not bool(row["is_read"]):
        await db.pool.execute(
            "UPDATE user_messages SET is_read = TRUE WHERE id = $1",
            message_id,
        )

    return {"status": "read", "message_id": message_id}
