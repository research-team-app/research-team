from __future__ import annotations

import asyncio
import logging
from typing import Any
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field, ValidationError
from starlette.datastructures import UploadFile

import db
from auth import _is_internal, get_verified_user
from utils import (
    DEFAULT_ATTACHMENT_CONTENT_TYPE,
    MAX_ATTACHMENT_SIZE_BYTES,
    is_missing_relation_error,
)

_log = logging.getLogger(__name__)
feed_router = APIRouter()


class FeedPostCreateRequest(BaseModel):
    content: str = Field("", max_length=5000)


def _feed_attachment_payload(
    record: dict[str, Any], post_id: str
) -> dict[str, Any] | None:
    file_name = (record.get("attachment_file_name") or "").strip()
    if not file_name:
        return None
    return {
        "file_name": file_name,
        "content_type": record.get("attachment_content_type")
        or DEFAULT_ATTACHMENT_CONTENT_TYPE,
        "size_bytes": int(record.get("attachment_size_bytes") or 0),
        "download_url": f"/feed/posts/{post_id}/attachment",
    }


async def _extract_feed_post_payload(request: Request):
    content_type = (request.headers.get("content-type") or "").lower()
    if "multipart/form-data" in content_type:
        form = await request.form()
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

        return content, attachment

    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid request payload") from exc

    try:
        req = FeedPostCreateRequest.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    return req.content.strip(), None


class FeedPostUpdateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class FeedCommentCreateRequest(BaseModel):
    post_id: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=2000)
    parent_comment_id: str | None = Field(default=None, max_length=100)


class FeedLikeToggleRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    post_id: str = Field(..., min_length=1, max_length=100)


def _display_name(
    first_name: str | None,
    last_name: str | None,
    username: str | None = None,
    email: str | None = None,
) -> str:
    full = f"{(first_name or '').strip()} {(last_name or '').strip()}".strip()
    if full:
        return full
    if (username or "").strip():
        return (username or "").strip()
    if (email or "").strip():
        return (email or "").strip().split("@", 1)[0]
    return "Researcher"


def _build_author_payload(
    author_id: str | None,
    first_name: str | None = None,
    last_name: str | None = None,
    username: str | None = None,
    email: str | None = None,
    title: str | None = None,
    profile_image_url: str | None = None,
    deleted_at: Any | None = None,
) -> dict[str, Any]:
    """
    Build author payload with deleted user handling.

    If deleted_at is not None, returns:
    - id: None (disables profile links)
    - name: "[Deleted User]"
    - All other fields: empty strings

    Otherwise, uses existing _display_name() logic to build normal author payload.
    """
    if deleted_at is not None:
        return {
            "id": None,
            "first_name": "",
            "last_name": "",
            "name": "[Deleted User]",
            "title": "",
            "profile_image_url": "",
        }

    # Normal user payload construction
    full_name = _display_name(first_name, last_name, username, email)
    return {
        "id": author_id,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "name": full_name,
        "title": title or "",
        "profile_image_url": profile_image_url or "",
    }


@feed_router.get("/feed/likes/post/{post_id}")
async def list_post_likes(post_id: str, limit: int = Query(200, ge=1, le=1000)):
    try:
        rows = await db.pool.fetch(
            """
            SELECT
                l.user_id,
                l.created_at,
                u.first_name,
                u.last_name,
                u.username,
                u.email,
                u.title,
                u.profile_image_url
            FROM feed_likes l
            LEFT JOIN users u ON u.id::text = l.user_id
            WHERE l.post_id = $1
            ORDER BY l.created_at DESC
            LIMIT $2
            """,
            post_id,
            limit,
        )
    except Exception as e:
        if is_missing_relation_error(e, "feed_likes"):
            return {"post_id": post_id, "items": [], "total": 0}
        raise HTTPException(
            status_code=500, detail=f"Post likes query failed: {str(e)}"
        )

    items = []
    for r in rows:
        row = dict(r)
        first_name = row.get("first_name") or ""
        last_name = row.get("last_name") or ""
        name = _display_name(
            first_name,
            last_name,
            row.get("username"),
            row.get("email"),
        )
        items.append(
            {
                "user_id": row.get("user_id"),
                "name": name,
                "first_name": first_name,
                "last_name": last_name,
                "title": row.get("title") or "",
                "profile_image_url": row.get("profile_image_url") or "",
                "liked_at": row.get("created_at"),
            }
        )
    return {"post_id": post_id, "items": items, "total": len(items)}


def _author_payload(row: dict[str, Any]) -> dict[str, Any]:
    return _build_author_payload(
        author_id=row.get("author_id"),
        first_name=row.get("first_name"),
        last_name=row.get("last_name"),
        username=row.get("username"),
        email=row.get("email"),
        title=row.get("title"),
        profile_image_url=row.get("profile_image_url"),
        deleted_at=row.get("deleted_at"),
    )


@feed_router.get("/feed/posts")
async def list_feed_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * page_size
    _posts_query_with_deleted = """
            SELECT
                p.id,
                p.author_id,
                p.content,
                p.created_at,
                p.updated_at,
                a.file_name AS attachment_file_name,
                a.content_type AS attachment_content_type,
                a.size_bytes AS attachment_size_bytes,
                u.first_name,
                u.last_name,
                u.username,
                u.email,
                u.title,
                u.profile_image_url,
                u.deleted_at
            FROM feed_posts p
            LEFT JOIN feed_post_attachments a ON a.post_id = p.id
            LEFT JOIN users u ON u.id::text = p.author_id
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
            """
    _posts_query_no_deleted = """
            SELECT
                p.id,
                p.author_id,
                p.content,
                p.created_at,
                p.updated_at,
                a.file_name AS attachment_file_name,
                a.content_type AS attachment_content_type,
                a.size_bytes AS attachment_size_bytes,
                u.first_name,
                u.last_name,
                u.username,
                u.email,
                u.title,
                u.profile_image_url
            FROM feed_posts p
            LEFT JOIN feed_post_attachments a ON a.post_id = p.id
            LEFT JOIN users u ON u.id::text = p.author_id
            ORDER BY p.created_at DESC
            LIMIT $1 OFFSET $2
            """
    try:
        total = await db.pool.fetchval("SELECT COUNT(*) FROM feed_posts")
        rows = await db.pool.fetch(_posts_query_with_deleted, page_size, offset)
    except Exception as e:
        if is_missing_relation_error(e, "feed_posts"):
            return {
                "items": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
            }
        # Fallback: deleted_at column may not exist yet
        if "deleted_at" in str(e):
            try:
                total = await db.pool.fetchval("SELECT COUNT(*) FROM feed_posts")
                rows = await db.pool.fetch(_posts_query_no_deleted, page_size, offset)
            except Exception:
                raise HTTPException(status_code=500, detail="Feed query failed.")
        else:
            raise HTTPException(status_code=500, detail="Feed query failed.")

    post_ids = [str(dict(r)["id"]) for r in rows]
    likes_counts: dict[str, int] = {}
    dislikes_counts: dict[str, int] = {}
    comments_counts: dict[str, int] = {}

    if post_ids:

        async def _fetch_likes():
            try:
                rows = await db.pool.fetch(
                    """
                    SELECT post_id, COUNT(*)::int AS likes_count
                    FROM feed_likes
                    WHERE post_id = ANY($1::text[])
                    GROUP BY post_id
                    """,
                    post_ids,
                )
                return {str(r["post_id"]): int(r["likes_count"]) for r in rows}
            except Exception as e:
                if not is_missing_relation_error(e, "feed_likes"):
                    raise HTTPException(
                        status_code=500, detail=f"Likes count query failed: {e}"
                    )
                return {}

        async def _fetch_comments():
            try:
                rows = await db.pool.fetch(
                    """
                    SELECT post_id, COUNT(*)::int AS comments_count
                    FROM feed_comments
                    WHERE post_id = ANY($1::text[])
                    GROUP BY post_id
                    """,
                    post_ids,
                )
                return {str(r["post_id"]): int(r["comments_count"]) for r in rows}
            except Exception as e:
                if not is_missing_relation_error(e, "feed_comments"):
                    raise HTTPException(
                        status_code=500, detail=f"Comments count query failed: {e}"
                    )
                return {}

        async def _fetch_dislikes():
            try:
                rows = await db.pool.fetch(
                    """
                    SELECT post_id, COUNT(*)::int AS dislikes_count
                    FROM feed_dislikes
                    WHERE post_id = ANY($1::text[])
                    GROUP BY post_id
                    """,
                    post_ids,
                )
                return {str(r["post_id"]): int(r["dislikes_count"]) for r in rows}
            except Exception as e:
                if not is_missing_relation_error(e, "feed_dislikes"):
                    raise HTTPException(
                        status_code=500, detail=f"Dislikes count query failed: {e}"
                    )
                return {}

        likes_counts, comments_counts, dislikes_counts = await asyncio.gather(
            _fetch_likes(), _fetch_comments(), _fetch_dislikes()
        )

    items = []
    for r in rows:
        row = dict(r)
        pid = str(row["id"])
        items.append(
            {
                "id": row["id"],
                "author": _author_payload(row),
                "content": row["content"],
                "likes_count": likes_counts.get(pid, 0),
                "dislikes_count": dislikes_counts.get(pid, 0),
                "comments_count": comments_counts.get(pid, 0),
                "attachment": _feed_attachment_payload(row, pid),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
        )

    return {
        "items": items,
        "total": int(total or 0),
        "page": page,
        "page_size": page_size,
    }


@feed_router.post("/feed/posts", status_code=status.HTTP_201_CREATED)
async def create_feed_post(
    request: Request,
    auth: dict = Depends(get_verified_user),
):
    author_id = (auth.get("sub") or "").strip()
    content, attachment = await _extract_feed_post_payload(request)
    if not author_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if len(content) > 5000:
        raise HTTPException(
            status_code=400,
            detail="Post content cannot exceed 5000 characters",
        )
    if not content and not attachment:
        raise HTTPException(status_code=400, detail="Post content cannot be empty")

    post_id = str(uuid4())
    attachment_id = str(uuid4()) if attachment else None
    try:
        async with db.pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    INSERT INTO feed_posts (id, author_id, content)
                    VALUES ($1, $2, $3)
                    RETURNING id, author_id, content, created_at, updated_at
                    """,
                    post_id,
                    author_id,
                    content,
                )
                if attachment and attachment_id:
                    await conn.execute(
                        """
                        INSERT INTO feed_post_attachments (
                            id,
                            post_id,
                            uploader_id,
                            file_name,
                            content_type,
                            size_bytes,
                            file_data
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        """,
                        attachment_id,
                        post_id,
                        author_id,
                        attachment["file_name"],
                        attachment["content_type"],
                        attachment["size_bytes"],
                        attachment["file_data"],
                    )
    except Exception as e:
        if is_missing_relation_error(e, "feed_posts") or is_missing_relation_error(
            e, "feed_post_attachments"
        ):
            raise HTTPException(
                status_code=503,
                detail="Feed schema is not initialized yet",
            ) from e
        raise HTTPException(status_code=500, detail=f"Create post failed: {str(e)}")

    user = await db.pool.fetchrow(
        """
        SELECT first_name, last_name, username, email, title, profile_image_url
        FROM users
        WHERE id::text = $1
        """,
        author_id,
    )
    user_data = dict(user) if user else {}

    return {
        "id": row["id"],
        "author": {
            "id": author_id,
            "first_name": user_data.get("first_name") or "",
            "last_name": user_data.get("last_name") or "",
            "name": _display_name(
                user_data.get("first_name"),
                user_data.get("last_name"),
                user_data.get("username"),
                user_data.get("email"),
            ),
            "title": user_data.get("title") or "",
            "profile_image_url": user_data.get("profile_image_url") or "",
        },
        "content": row["content"],
        "likes_count": 0,
        "dislikes_count": 0,
        "comments_count": 0,
        "attachment": (
            {
                "file_name": attachment["file_name"],
                "content_type": attachment["content_type"],
                "size_bytes": attachment["size_bytes"],
                "download_url": f"/feed/posts/{post_id}/attachment",
            }
            if attachment
            else None
        ),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@feed_router.get("/feed/posts/{post_id}/attachment")
async def download_feed_post_attachment(post_id: str):
    row = await db.pool.fetchrow(
        """
        SELECT file_name, content_type, file_data
        FROM feed_post_attachments
        WHERE post_id = $1
        """,
        post_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_name = (row["file_name"] or "download").strip() or "download"
    encoded_file_name = quote(file_name)
    return Response(
        content=bytes(row["file_data"]),
        media_type=(row["content_type"] or DEFAULT_ATTACHMENT_CONTENT_TYPE),
        headers={
            "Content-Disposition": (
                f"attachment; filename=\"{file_name}\"; filename*=UTF-8''{encoded_file_name}"
            )
        },
    )


@feed_router.delete("/feed/posts/{post_id}")
async def delete_feed_post(
    post_id: str,
    auth: dict = Depends(get_verified_user),
):
    sub = (auth.get("sub") or "").strip()
    row = await db.pool.fetchrow(
        "SELECT id, author_id FROM feed_posts WHERE id = $1",
        post_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    if not _is_internal(auth) and (row["author_id"] or "").strip() != sub:
        raise HTTPException(status_code=403, detail="You can only delete your own post")

    await db.pool.execute("DELETE FROM feed_posts WHERE id = $1", post_id)
    return {"status": "deleted", "post_id": post_id}


@feed_router.patch("/feed/posts/{post_id}")
async def update_feed_post(
    post_id: str,
    req: FeedPostUpdateRequest,
    auth: dict = Depends(get_verified_user),
):
    sub = (auth.get("sub") or "").strip()
    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Post content cannot be empty")

    row = await db.pool.fetchrow(
        "SELECT id, author_id FROM feed_posts WHERE id = $1",
        post_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    if not _is_internal(auth) and (row["author_id"] or "").strip() != sub:
        raise HTTPException(status_code=403, detail="You can only edit your own post")

    updated = await db.pool.fetchrow(
        """
        UPDATE feed_posts
        SET content = $2, updated_at = now()
        WHERE id = $1
        RETURNING id, author_id, content, created_at, updated_at
        """,
        post_id,
        content,
    )

    user = await db.pool.fetchrow(
        """
        SELECT first_name, last_name, username, email, title, profile_image_url
        FROM users
        WHERE id::text = $1
        """,
        sub,
    )
    user_data = dict(user) if user else {}

    likes_count = await db.pool.fetchval(
        "SELECT COUNT(*) FROM feed_likes WHERE post_id = $1",
        post_id,
    )
    dislikes_count = await db.pool.fetchval(
        "SELECT COUNT(*) FROM feed_dislikes WHERE post_id = $1",
        post_id,
    )
    comments_count = await db.pool.fetchval(
        "SELECT COUNT(*) FROM feed_comments WHERE post_id = $1",
        post_id,
    )
    attachment_row = await db.pool.fetchrow(
        """
        SELECT file_name AS attachment_file_name,
               content_type AS attachment_content_type,
               size_bytes AS attachment_size_bytes
        FROM feed_post_attachments
        WHERE post_id = $1
        """,
        post_id,
    )
    attachment_data = dict(attachment_row) if attachment_row else {}

    return {
        "id": updated["id"],
        "author": {
            "id": sub,
            "first_name": user_data.get("first_name") or "",
            "last_name": user_data.get("last_name") or "",
            "name": _display_name(
                user_data.get("first_name"),
                user_data.get("last_name"),
                user_data.get("username"),
                user_data.get("email"),
            ),
            "title": user_data.get("title") or "",
            "profile_image_url": user_data.get("profile_image_url") or "",
        },
        "content": updated["content"],
        "likes_count": int(likes_count or 0),
        "dislikes_count": int(dislikes_count or 0),
        "comments_count": int(comments_count or 0),
        "attachment": _feed_attachment_payload(attachment_data, post_id),
        "created_at": updated["created_at"],
        "updated_at": updated["updated_at"],
    }


@feed_router.get("/feed/comments/{post_id}")
async def list_feed_comments(
    post_id: str,
    limit: int = Query(100, ge=1, le=500),
):
    try:
        rows = await db.pool.fetch(
            """
            SELECT
                c.id,
                c.post_id,
                c.author_id,
                c.parent_comment_id,
                c.content,
                c.created_at,
                c.updated_at,
                u.first_name,
                u.last_name,
                u.username,
                u.email,
                u.title,
                u.profile_image_url
            FROM feed_comments c
            LEFT JOIN users u ON u.id::text = c.author_id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
            LIMIT $2
            """,
            post_id,
            limit,
        )
    except Exception as e:
        if is_missing_relation_error(e, "feed_comments"):
            return {"items": [], "total": 0}
        raise HTTPException(status_code=500, detail=f"Comments query failed: {str(e)}")

    items = []
    for r in rows:
        row = dict(r)
        items.append(
            {
                "id": row["id"],
                "post_id": row["post_id"],
                "parent_comment_id": row.get("parent_comment_id"),
                "author": _author_payload(row),
                "content": row["content"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
        )

    return {"items": items, "total": len(items)}


@feed_router.post("/feed/comments", status_code=status.HTTP_201_CREATED)
async def create_feed_comment(
    req: FeedCommentCreateRequest,
    auth: dict = Depends(get_verified_user),
):
    author_id = (auth.get("sub") or "").strip()
    content = req.content.strip()
    post_id = req.post_id.strip()
    parent_comment_id = (req.parent_comment_id or "").strip() or None

    if not author_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not content:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    exists = await db.pool.fetchval("SELECT 1 FROM feed_posts WHERE id = $1", post_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")

    if parent_comment_id:
        parent_exists = await db.pool.fetchval(
            "SELECT 1 FROM feed_comments WHERE id = $1 AND post_id = $2",
            parent_comment_id,
            post_id,
        )
        if not parent_exists:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment_id = str(uuid4())
    try:
        row = await db.pool.fetchrow(
            """
            INSERT INTO feed_comments (id, post_id, author_id, parent_comment_id, content)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, post_id, author_id, parent_comment_id, content, created_at, updated_at
            """,
            comment_id,
            post_id,
            author_id,
            parent_comment_id,
            content,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Create comment failed.")

    user = await db.pool.fetchrow(
        """
        SELECT first_name, last_name, username, email, title, profile_image_url
        FROM users
        WHERE id::text = $1
        """,
        author_id,
    )
    user_data = dict(user) if user else {}

    return {
        "id": row["id"],
        "post_id": row["post_id"],
        "parent_comment_id": row.get("parent_comment_id"),
        "author": {
            "id": author_id,
            "first_name": user_data.get("first_name") or "",
            "last_name": user_data.get("last_name") or "",
            "name": _display_name(
                user_data.get("first_name"),
                user_data.get("last_name"),
                user_data.get("username"),
                user_data.get("email"),
            ),
            "title": user_data.get("title") or "",
            "profile_image_url": user_data.get("profile_image_url") or "",
        },
        "content": row["content"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


@feed_router.delete("/feed/comments/{comment_id}")
async def delete_feed_comment(
    comment_id: str,
    auth: dict = Depends(get_verified_user),
):
    sub = (auth.get("sub") or "").strip()
    row = await db.pool.fetchrow(
        "SELECT id, author_id, post_id FROM feed_comments WHERE id = $1",
        comment_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")
    if not _is_internal(auth) and (row["author_id"] or "").strip() != sub:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own comment",
        )

    await db.pool.execute(
        "DELETE FROM feed_comments WHERE id = $1 OR parent_comment_id = $1",
        comment_id,
    )
    return {
        "status": "deleted",
        "comment_id": comment_id,
        "post_id": row["post_id"],
    }


@feed_router.get("/feed/likes/{user_id}")
async def list_user_likes(user_id: str, auth: dict = Depends(get_verified_user)):
    sub = (auth.get("sub") or "").strip()
    if not _is_internal(auth) and sub != user_id.strip():
        raise HTTPException(
            status_code=403,
            detail="You can only access your own likes",
        )

    try:
        rows = await db.pool.fetch(
            "SELECT post_id FROM feed_likes WHERE user_id = $1",
            user_id,
        )
    except Exception as e:
        if is_missing_relation_error(e, "feed_likes"):
            return {"user_id": user_id, "post_ids": []}
        raise HTTPException(status_code=500, detail=f"Likes query failed: {str(e)}")
    return {"user_id": user_id, "post_ids": [r["post_id"] for r in rows]}


@feed_router.get("/feed/dislikes/{user_id}")
async def list_user_dislikes(user_id: str, auth: dict = Depends(get_verified_user)):
    sub = (auth.get("sub") or "").strip()
    if sub != user_id.strip():
        raise HTTPException(
            status_code=403,
            detail="You can only access your own dislikes",
        )

    try:
        rows = await db.pool.fetch(
            "SELECT post_id FROM feed_dislikes WHERE user_id = $1",
            user_id,
        )
    except Exception as e:
        if is_missing_relation_error(e, "feed_dislikes"):
            return {"user_id": user_id, "post_ids": []}
        raise HTTPException(status_code=500, detail=f"Dislikes query failed: {str(e)}")
    return {"user_id": user_id, "post_ids": [r["post_id"] for r in rows]}


@feed_router.post("/feed/likes", status_code=status.HTTP_201_CREATED)
async def add_like(
    req: FeedLikeToggleRequest,
    auth: dict = Depends(get_verified_user),
):
    sub = (auth.get("sub") or "").strip()
    if sub != req.user_id.strip():
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own likes",
        )

    exists = await db.pool.fetchval(
        "SELECT 1 FROM feed_posts WHERE id = $1", req.post_id
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")

    try:
        await db.pool.execute(
            """
            INSERT INTO feed_likes (post_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (post_id, user_id) DO NOTHING
            """,
            req.post_id,
            req.user_id,
        )
        await db.pool.execute(
            "DELETE FROM feed_dislikes WHERE post_id = $1 AND user_id = $2",
            req.post_id,
            req.user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Add like failed.")
    return {"status": "liked", "post_id": req.post_id}


@feed_router.delete("/feed/likes")
async def remove_like(
    req: FeedLikeToggleRequest,
    auth: dict = Depends(get_verified_user),
):
    sub = (auth.get("sub") or "").strip()
    if sub != req.user_id.strip():
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own likes",
        )

    try:
        await db.pool.execute(
            "DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2",
            req.post_id,
            req.user_id,
        )
    except Exception as e:
        if is_missing_relation_error(e, "feed_likes"):
            raise HTTPException(
                status_code=503,
                detail="Feed likes table is not initialized yet",
            )
        raise HTTPException(status_code=500, detail=f"Remove like failed: {str(e)}")
    return {"status": "unliked", "post_id": req.post_id}


@feed_router.post("/feed/dislikes", status_code=status.HTTP_201_CREATED)
async def add_dislike(
    req: FeedLikeToggleRequest,
    auth: dict = Depends(get_verified_user),
):
    sub = (auth.get("sub") or "").strip()
    if sub != req.user_id.strip():
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own dislikes",
        )

    exists = await db.pool.fetchval(
        "SELECT 1 FROM feed_posts WHERE id = $1", req.post_id
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")

    try:
        await db.pool.execute(
            """
            INSERT INTO feed_dislikes (post_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (post_id, user_id) DO NOTHING
            """,
            req.post_id,
            req.user_id,
        )
        await db.pool.execute(
            "DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2",
            req.post_id,
            req.user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Add dislike failed.")

    return {"status": "disliked", "post_id": req.post_id}


@feed_router.delete("/feed/dislikes")
async def remove_dislike(
    req: FeedLikeToggleRequest,
    auth: dict = Depends(get_verified_user),
):
    sub = (auth.get("sub") or "").strip()
    if sub != req.user_id.strip():
        raise HTTPException(
            status_code=403,
            detail="You can only modify your own dislikes",
        )

    try:
        await db.pool.execute(
            "DELETE FROM feed_dislikes WHERE post_id = $1 AND user_id = $2",
            req.post_id,
            req.user_id,
        )
    except Exception as e:
        if is_missing_relation_error(e, "feed_dislikes"):
            raise HTTPException(
                status_code=503,
                detail="Feed dislikes table is not initialized yet",
            )
        raise HTTPException(status_code=500, detail=f"Remove dislike failed: {str(e)}")
    return {"status": "undisliked", "post_id": req.post_id}


class FeedReportRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)


@feed_router.post("/feed/posts/{post_id}/report", status_code=status.HTTP_201_CREATED)
async def report_feed_post(
    post_id: str,
    req: FeedReportRequest,
    auth: dict = Depends(get_verified_user),
):
    reporter_id = (auth.get("sub") or "").strip()
    if not reporter_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    exists = await db.pool.fetchval("SELECT 1 FROM feed_posts WHERE id = $1", post_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")

    try:
        await db.pool.execute(
            """
            INSERT INTO post_reports (post_id, reporter_id, reason)
            VALUES ($1, $2, $3)
            ON CONFLICT (post_id, reporter_id) DO UPDATE SET reason = EXCLUDED.reason
            """,
            post_id,
            reporter_id,
            req.reason.strip(),
        )
    except Exception as e:
        _log.exception(
            "report insert failed post_id=%s reporter=%s err=%s",
            post_id,
            reporter_id,
            e,
        )
        raise HTTPException(status_code=500, detail=f"Report failed: {str(e)}")

    return {"status": "reported", "post_id": post_id}
