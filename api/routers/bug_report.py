import logging

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

import db
from auth import admin
from utils import enforce_rate_limit

bug_report_router = APIRouter()
logger = logging.getLogger(__name__)


class BugReportRequest(BaseModel):
    email: EmailStr
    subject: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=20000)


@bug_report_router.post("/report-bug")
async def submit_bug_report(request: BugReportRequest, raw_request: Request):
    """Insert into bug_reports table."""
    enforce_rate_limit(
        raw_request,
        bucket="report-bug",
        max_requests=10,
        window_seconds=60,
    )
    try:
        await db.pool.execute(
            """
            INSERT INTO bug_reports (email, subject, description)
            VALUES ($1, $2, $3)
            """,
            str(request.email),
            request.subject,
            request.description,
        )
    except Exception as e:
        logger.exception("bug_reports insert failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit bug report. Please try again.",
        )
    return {"message": "Bug report submitted. Thank you.", "ok": True}


@bug_report_router.get("/report-bug")
@admin
async def list_bug_reports():
    """Return all bug reports, newest first. Admin only."""
    rows = await db.pool.fetch(
        "SELECT * FROM bug_reports ORDER BY created_at DESC LIMIT 100"
    )
    return [dict(row) for row in rows]


@bug_report_router.get("/report-bug/{bug_id}")
@admin
async def get_bug_report(bug_id: str):
    """Return a single bug report by id. Admin only."""
    row = await db.pool.fetchrow("SELECT * FROM bug_reports WHERE id = $1", bug_id)
    if not row:
        raise HTTPException(status_code=404, detail="Bug report not found")
    return dict(row)


@bug_report_router.delete("/report-bug/{bug_id}")
@admin
async def delete_bug_report(bug_id: str):
    """Delete a bug report by id. Admin only."""
    row = await db.pool.fetchrow(
        "DELETE FROM bug_reports WHERE id = $1 RETURNING *", bug_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bug report not found")
    return dict(row)
