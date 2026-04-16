from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import JSONResponse

import db
from auth import require_bug_report_admin, verify_admin_token
from utils import is_missing_relation_error

admin_router = APIRouter()


@admin_router.get("/admin/reports")
async def list_post_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin: dict = Depends(require_bug_report_admin),
):
    """List all reported posts with reporter info, newest first."""
    offset = (page - 1) * page_size
    try:
        total = await db.pool.fetchval("SELECT COUNT(*) FROM post_reports")
        rows = await db.pool.fetch(
            """
            SELECT
                r.id,
                r.post_id,
                r.reporter_id,
                r.reason,
                r.created_at,
                p.content AS post_content,
                p.author_id AS post_author_id,
                u_author.first_name AS author_first_name,
                u_author.last_name AS author_last_name,
                u_reporter.first_name AS reporter_first_name,
                u_reporter.last_name AS reporter_last_name
            FROM post_reports r
            LEFT JOIN feed_posts p ON p.id = r.post_id
            LEFT JOIN users u_author ON u_author.id::text = p.author_id
            LEFT JOIN users u_reporter ON u_reporter.id::text = r.reporter_id
            ORDER BY r.created_at DESC
            LIMIT $1 OFFSET $2
            """,
            page_size,
            offset,
        )
    except Exception as e:
        if is_missing_relation_error(e, "post_reports"):
            return {"items": [], "total": 0, "page": page, "page_size": page_size}
        raise HTTPException(status_code=500, detail="Reports query failed.")

    items = []
    for r in rows:
        row = dict(r)
        items.append(
            {
                "id": row["id"],
                "post_id": row["post_id"],
                "reason": row["reason"],
                "reported_at": row["created_at"],
                "post_content": (row.get("post_content") or "")[:300],
                "post_author": {
                    "id": row.get("post_author_id"),
                    "name": f"{row.get('author_first_name') or ''} {row.get('author_last_name') or ''}".strip()
                    or "Unknown",
                },
                "reporter": {
                    "id": row["reporter_id"],
                    "name": f"{row.get('reporter_first_name') or ''} {row.get('reporter_last_name') or ''}".strip()
                    or "Unknown",
                },
            }
        )

    return {
        "items": items,
        "total": int(total or 0),
        "page": page,
        "page_size": page_size,
    }


@admin_router.get("/admin/docs", include_in_schema=False)
async def admin_docs(token: str = Query(...)):
    verify_admin_token(token)
    return get_swagger_ui_html(
        openapi_url=f"/admin/openapi.json?token={token}",
        title="Research Team API — Admin Docs",
    )


@admin_router.get("/admin/openapi.json", include_in_schema=False)
async def admin_openapi(request: Request, token: str = Query(...)):
    verify_admin_token(token)
    return JSONResponse(request.app.openapi())


@admin_router.delete("/admin/posts/{post_id}", status_code=status.HTTP_200_OK)
async def admin_delete_post(
    post_id: str,
    _admin: dict = Depends(require_bug_report_admin),
):
    """Hard-delete a post and all its interactions (admin only)."""
    exists = await db.pool.fetchval("SELECT 1 FROM feed_posts WHERE id = $1", post_id)
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")

    try:
        async with db.pool.acquire() as conn:
            async with conn.transaction():
                # Clear reports
                try:
                    await conn.execute(
                        "DELETE FROM post_reports WHERE post_id = $1", post_id
                    )
                except Exception:
                    pass
                # Clear likes / dislikes / comments / attachments
                for table in (
                    "feed_likes",
                    "feed_dislikes",
                    "feed_comments",
                    "feed_post_attachments",
                ):
                    try:
                        await conn.execute(
                            f"DELETE FROM {table} WHERE post_id = $1", post_id
                        )
                    except Exception:
                        pass
                await conn.execute("DELETE FROM feed_posts WHERE id = $1", post_id)
    except Exception:
        raise HTTPException(status_code=500, detail="Delete failed.")

    return {"status": "deleted", "post_id": post_id}
