from __future__ import annotations

import json
import os

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, JSONResponse

import db
from auth import require_admin_access
from utils import is_missing_relation_error

IS_LOCAL = os.getenv("IS_LOCAL", "false").lower() == "true"

admin_router = APIRouter()


@admin_router.get("/admin/reports")
async def list_post_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin: dict = Depends(require_admin_access),
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


# /admin/docs is intentionally public HTML — it contains no sensitive data itself.
# Locally (IS_LOCAL=true) it renders Swagger immediately with the full spec embedded.
# In production it shows a token gate; the spec is fetched from /admin/openapi.json
# with the supplied Bearer token so the auth check still happens server-side.
@admin_router.get("/admin/docs", include_in_schema=False)
async def admin_docs(request: Request):
    base = str(request.base_url).rstrip("/")

    if IS_LOCAL:
        openapi_json = json.dumps(request.app.openapi()).replace("</", "<\\/")
        return HTMLResponse(
            f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Research Team API — Admin Docs (local)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({{
      spec: {openapi_json},
      dom_id: "#swagger-ui",
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
    }});
  </script>
</body>
</html>"""
        )

    return HTMLResponse(
        f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Research Team API — Admin Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body {{ margin: 0; font-family: sans-serif; background: #fafafa; }}
    #gate {{
      display: flex; align-items: center; gap: 10px;
      padding: 14px 20px; background: #1a1a2e; color: #fff;
    }}
    #gate label {{ font-size: 13px; white-space: nowrap; }}
    #gate input {{
      flex: 1; padding: 6px 10px; border-radius: 4px; border: none;
      font-size: 13px; font-family: monospace;
    }}
    #gate button {{
      padding: 6px 16px; border-radius: 4px; border: none;
      background: #4f8ef7; color: #fff; cursor: pointer; font-size: 13px;
    }}
    #gate button:hover {{ background: #3a7de0; }}
    #msg {{ font-size: 13px; color: #f87171; }}
  </style>
</head>
<body>
  <div id="gate">
    <label for="tok">Bearer token:</label>
    <input id="tok" type="password" placeholder="Paste your admin or internal token" autocomplete="off">
    <button onclick="loadSpec()">Load</button>
    <span id="msg"></span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    const SPEC_URL = "{base}/admin/openapi.json";
    const SK = "admin_docs_token";

    async function loadSpec() {{
      const token = document.getElementById("tok").value.trim();
      if (!token) {{ setMsg("Paste a token first."); return; }}
      setMsg("");
      const res = await fetch(SPEC_URL, {{
        headers: {{ Authorization: "Bearer " + token }}
      }});
      if (!res.ok) {{
        setMsg(res.status === 401 ? "Invalid or expired token." :
               res.status === 403 ? "Not an admin." : "Error " + res.status);
        return;
      }}
      sessionStorage.setItem(SK, token);
      const spec = await res.json();
      document.getElementById("gate").style.display = "none";
      SwaggerUIBundle({{
        spec,
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        requestInterceptor: (req) => {{
          req.headers["Authorization"] = "Bearer " + token;
          return req;
        }},
      }});
    }}

    function setMsg(t) {{ document.getElementById("msg").textContent = t; }}

    // Auto-load if a token was saved this session
    const saved = sessionStorage.getItem(SK);
    if (saved) {{ document.getElementById("tok").value = saved; loadSpec(); }}
  </script>
</body>
</html>""",
    )


@admin_router.get("/admin/openapi.json", include_in_schema=False)
async def admin_openapi(
    request: Request,
    _admin: dict = Depends(require_admin_access),
):
    return JSONResponse(request.app.openapi())


@admin_router.delete("/admin/posts/{post_id}", status_code=status.HTTP_200_OK)
async def admin_delete_post(
    post_id: str,
    _admin: dict = Depends(require_admin_access),
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
