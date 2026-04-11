import asyncio
import html
import json

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

GRANT_STATUSES = ("posted", "forecasted", "closed", "archived")
# Default view shows only open grants; other statuses must be explicitly requested.
DEFAULT_STATUSES = ("posted",)


# AI semantic search — same pattern as users/ai-search (keyword + top_k)
class GrantSearchFuzzyParams(BaseModel):
    keyword: str
    top_k: int = 20


async def _grant_details_from_db(grant_id: str) -> dict | None:
    """Return cached grant details from our DB, or None if not stored yet."""
    try:
        row = await db.pool.fetchrow(
            "SELECT raw_data FROM grant_details WHERE grant_id = $1",
            int(grant_id),
        )
        if not row or not row["raw_data"]:
            return None
        # raw_data is TEXT (DSQL does not support JSONB column type)
        return json.loads(row["raw_data"])
    except Exception:
        return None


def _extract_grant_detail_fields(data: dict) -> dict:
    synopsis_obj = (data.get("data") or {}).get("synopsis") or {}
    applicant_types = synopsis_obj.get("applicantTypes") or []
    funding_instruments = synopsis_obj.get("fundingInstruments") or []
    funding_categories = synopsis_obj.get("fundingActivityCategories") or []

    def _clean(v: str | None) -> str | None:
        s = html.unescape((v or "").strip())
        return s or None

    return {
        "synopsis": _clean(synopsis_obj.get("synopsisDesc")),
        "eligibility": _clean(synopsis_obj.get("applicantEligibilityDesc")),
        "award_floor": synopsis_obj.get("awardFloorFormatted") or None,
        "award_ceiling": synopsis_obj.get("awardCeilingFormatted") or None,
        "cost_sharing": synopsis_obj.get("costSharing"),
        "agency_contact_email": synopsis_obj.get("agencyContactEmail") or None,
        "applicant_types": json.dumps(applicant_types) if applicant_types else None,
        "funding_instruments": json.dumps(funding_instruments)
        if funding_instruments
        else None,
        "funding_categories": json.dumps(funding_categories)
        if funding_categories
        else None,
    }


async def _save_grant_details_to_db(grant_id: str, data: dict) -> None:
    # Best-effort — never raises; raw_data is TEXT (DSQL has no JSONB column type)
    try:
        f = _extract_grant_detail_fields(data)
        await db.pool.execute(
            """INSERT INTO grant_details (
                   grant_id, synopsis, eligibility, award_floor, award_ceiling,
                   cost_sharing, agency_contact_email,
                   applicant_types, funding_instruments, funding_categories,
                   raw_data
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (grant_id) DO NOTHING""",
            int(grant_id),
            f["synopsis"],
            f["eligibility"],
            f["award_floor"],
            f["award_ceiling"],
            f["cost_sharing"],
            f["agency_contact_email"],
            f["applicant_types"],
            f["funding_instruments"],
            f["funding_categories"],
            json.dumps(data),
        )
    except Exception:
        pass  # Don't fail the request if caching fails


@grants_router.get("/grants/{id}")
async def grant_details(id: str):
    # Serve from DB first; fall back to grants.gov and lazily populate the cache.
    cached = await _grant_details_from_db(id)
    if cached:
        return cached

    # Not cached yet — fall back to grants.gov API and lazily populate our DB.
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GRANT_API_BASE_URL}/v1/api/fetchOpportunity",
                json={"opportunityId": id},
                timeout=15.0,
            )

            if response.status_code == 200:
                data = response.json()
                await _save_grant_details_to_db(id, data)
                return data

            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error from grants.gov API: {response.text}",
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Grant details are not yet cached and grants.gov is unreachable.",
        )


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
    """Fetch grants with pagination. Defaults to posted+forecasted; pass status= for closed/archived."""
    offset = (page - 1) * page_size

    # Resolve which statuses to include. Defaults to active-only so we don't
    # scan 89 000 closed/archived rows on every unconstrained request.
    if status and status.strip():
        # Comma-separated values allowed (e.g. "posted,forecasted,closed"); unknown values dropped.
        status_list = [
            s for s in (s.strip() for s in status.split(",")) if s in GRANT_STATUSES
        ]
        active_statuses = status_list if status_list else list(DEFAULT_STATUSES)
    else:
        active_statuses = list(DEFAULT_STATUSES)

    conditions = ["opp_status = ANY($1::text[])"]
    params: list = [active_statuses]

    if search and search.strip():
        p1 = len(params) + 1
        p2 = len(params) + 2
        p3 = len(params) + 3
        conditions.append(
            f"(title ILIKE ${p1} OR number ILIKE ${p2} OR agency_name ILIKE ${p3})"
        )
        p = f"%{search.strip()}%"
        params.extend([p, p, p])
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
    agencies, statuses = await asyncio.gather(
        db.pool.fetch(
            f"SELECT DISTINCT agency_name FROM {DB_TABLE} WHERE agency_name IS NOT NULL AND opp_status = ANY($1::text[]) ORDER BY agency_name",
            list(GRANT_STATUSES),
        ),
        db.pool.fetch(
            f"SELECT DISTINCT opp_status FROM {DB_TABLE} WHERE opp_status = ANY($1::text[]) ORDER BY opp_status",
            list(GRANT_STATUSES),
        ),
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
          AND opp_status IN ('posted', 'forecasted', 'closed', 'archived')
        ORDER BY updated_at DESC
    """
    rows = await db.pool.fetch(sql_query, ids)
    return [dict(row) for row in rows]
