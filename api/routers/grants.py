import httpx
from fastapi import APIRouter, Body, HTTPException, Query, status
from pydantic import BaseModel

import db
from services.vector_utility import VectorUtility

grants_router = APIRouter()

GRANT_API_BASE_URL = "https://api.grants.gov"
DB_TABLE = "grants"
AWS_REGION = "us-east-1"
vector_utility = VectorUtility(
    vector_bucket="grants-vectors", vector_index="grants-vectors-index"
)

# Include active, closed, and archived (same set as cron summary)
GRANT_STATUSES = ("posted", "active", "closed", "archived", "forecasted")


# AI semantic search — same pattern as users/ai-search (keyword + top_k)
class GrantSearchFuzzyParams(BaseModel):
    keyword: str
    top_k: int = 20


@grants_router.get("/grants/{id}")
async def grant_details(id: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRANT_API_BASE_URL}/v1/api/fetchOpportunity",
                json={"opportunityId": id},
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error from grants.gov API: {response.text}",
                )

            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")


@grants_router.get("/grants")
async def grants(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(
        24, ge=1, le=5000, description="Items per page (large for bulk catalog)"
    ),
    search: str | None = Query(
        None,
        description="Search in title, number, agency (full database, not limited to current page)",
    ),
    status: str | None = Query(
        None, description="Filter by opp_status (e.g. posted, closed)"
    ),
    agency: str | None = Query(None, description="Filter by agency name"),
    open_date_from: str | None = Query(None, description="Open date from (YYYY-MM-DD)"),
    open_date_to: str | None = Query(None, description="Open date to (YYYY-MM-DD)"),
    close_date_from: str | None = Query(
        None, description="Close date from (YYYY-MM-DD)"
    ),
    close_date_to: str | None = Query(None, description="Close date to (YYYY-MM-DD)"),
):
    """Fetch grants with pagination. Includes posted, active, closed, and archived."""
    offset = (page - 1) * page_size
    conditions = ["opp_status = ANY($1::text[])"]
    params: list = [list(GRANT_STATUSES)]

    if search and search.strip():
        p1 = len(params) + 1
        p2 = len(params) + 2
        p3 = len(params) + 3
        conditions.append(
            f"(title ILIKE ${p1} OR number ILIKE ${p2} OR agency_name ILIKE ${p3})"
        )
        p = f"%{search.strip()}%"
        params.extend([p, p, p])
    if status and status.strip():
        conditions.append(f"opp_status = ${len(params) + 1}")
        params.append(status.strip())
    if agency and agency.strip():
        conditions.append(f"agency_name = ${len(params) + 1}")
        params.append(agency.strip())
    if open_date_from:
        conditions.append(f"open_date >= ${len(params) + 1}")
        params.append(open_date_from)
    if open_date_to:
        conditions.append(f"open_date <= ${len(params) + 1}")
        params.append(open_date_to)
    if close_date_from:
        conditions.append(f"close_date >= ${len(params) + 1}")
        params.append(close_date_from)
    if close_date_to:
        conditions.append(f"close_date <= ${len(params) + 1}")
        params.append(close_date_to)

    where_sql = " AND ".join(conditions)
    count_sql = f"SELECT COUNT(*) FROM {DB_TABLE} WHERE {where_sql}"
    total = await db.pool.fetchval(count_sql, *params)

    data_sql = f"""
        SELECT id, number, title, agency_code, agency_name, opp_status, open_date, close_date
        FROM {DB_TABLE}
        WHERE {where_sql}
        ORDER BY updated_at DESC
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """
    params.extend([page_size, offset])
    rows = await db.pool.fetch(data_sql, *params)
    items = [dict(row) for row in rows]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@grants_router.get("/grants/options/filters")
async def grants_filter_options():
    """Return distinct agency and status values for filter dropdowns."""
    agencies = await db.pool.fetch(
        f"SELECT DISTINCT agency_name FROM {DB_TABLE} WHERE agency_name IS NOT NULL AND opp_status = ANY($1::text[]) ORDER BY agency_name",
        list(GRANT_STATUSES),
    )
    statuses = await db.pool.fetch(
        f"SELECT DISTINCT opp_status FROM {DB_TABLE} WHERE opp_status = ANY($1::text[]) ORDER BY opp_status",
        list(GRANT_STATUSES),
    )
    return {
        "agencies": [r["agency_name"] for r in agencies],
        "statuses": [r["opp_status"] for r in statuses],
    }


async def _search_grants_ai_impl(params: GrantSearchFuzzyParams):
    """Shared implementation for ai-search (with or without trailing slash)."""
    try:
        vectors = vector_utility.query_vectors(
            keyword=params.keyword.strip(), topK=params.top_k
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI search grant failed: {str(e)}",
        )
    ids = [str(item["key"]) for item in vectors]
    return {"ids": ids}


@grants_router.post("/grants/ai-search")
async def search_grants_ai(params: GrantSearchFuzzyParams = Body(...)):
    """Convert keyword to embedding and search grants vector index (semantic search). Same pattern as users/ai-search."""
    return await _search_grants_ai_impl(params)


class GrantSearchParams(BaseModel):
    ids: list[int]


@grants_router.post("/grants")
async def grant_by_ids(grant_search_params: GrantSearchParams):
    """Fetch all the grants by ids"""
    ids = grant_search_params.ids

    # Handle empty list to avoid unnecessary DB call
    if not ids:
        return []

    sql_query = f"""
        SELECT id, number, title, agency_name, opp_status, open_date, close_date
        FROM {DB_TABLE}
        WHERE id = ANY($1::int[])
        ORDER BY updated_at DESC
    """
    rows = await db.pool.fetch(sql_query, ids)
    return [dict(row) for row in rows]
