from fastapi import APIRouter

import db

cron_summary_router = APIRouter()


@cron_summary_router.get("/cron_summary")
async def get_cron_summary():
    """
    Endpoint to retrieve the summary of cron jobs.
    """
    result = await db.pool.fetchrow(
        "SELECT * FROM grants_summary_cron ORDER BY created DESC LIMIT 1"
    )
    if not result:
        return {"message": "No cron summary found."}
    return dict(result)
