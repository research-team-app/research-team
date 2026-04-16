import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

import db
from auth import _is_internal, get_verified_user, require_self_id

logger = logging.getLogger(__name__)
router = APIRouter()


# Cognito sub (UUID). Frontend must send attributes.sub — never omit user_id.
class WishlistToggleRequest(BaseModel):
    user_id: UUID
    grant_id: str


async def _get_wishlist_ids(id: UUID):
    query = """
        SELECT user_id, grant_id
        FROM wishlist
        WHERE user_id = $1
    """
    rows = await db.pool.fetch(query, id)
    return [row["grant_id"] for row in rows]


# 1. GET Wishlist (owner only)
@router.get("/wishlist/{id}")
async def get_wishlist_ids(id: UUID, _: str = Depends(require_self_id)):
    try:
        wishlist_ids = await _get_wishlist_ids(id)
        return {"user_id": str(id), "wishlist_grant_ids": wishlist_ids}
    except Exception as e:
        logger.exception("GET wishlist failed: %s", e)
        raise HTTPException(status_code=500, detail="Unexpected server error.")


# 2. ADD Item (Idempotent, owner only)
@router.post("/wishlist", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    req: WishlistToggleRequest, auth: dict = Depends(get_verified_user)
):
    sub = (auth.get("sub") or "").strip()
    if not _is_internal(auth) and sub != str(req.user_id).strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own wishlist",
        )
    query = """
        INSERT INTO wishlist (user_id, grant_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, grant_id) DO NOTHING
    """
    try:
        await db.pool.execute(query, req.user_id, req.grant_id)
        return {"status": "added", "grant_id": req.grant_id}
    except Exception as e:
        logger.exception("POST wishlist failed: %s", e)
        raise HTTPException(status_code=500, detail="Unexpected server error.")


# 3. REMOVE Item (Idempotent, owner only)
@router.delete("/wishlist")
async def remove_from_wishlist(
    req: WishlistToggleRequest, auth: dict = Depends(get_verified_user)
):
    sub = (auth.get("sub") or "").strip()
    if not _is_internal(auth) and sub != str(req.user_id).strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own wishlist",
        )
    query = """
        DELETE FROM wishlist
        WHERE user_id = $1 AND grant_id = $2
    """
    try:
        await db.pool.execute(query, req.user_id, req.grant_id)
        return {"status": "removed", "grant_id": req.grant_id}
    except Exception as e:
        logger.exception("DELETE wishlist failed: %s", e)
        raise HTTPException(status_code=500, detail="Unexpected server error.")


@router.post("/wishlist-grants/{id}")
async def get_wishlist_details(id: UUID, _: str = Depends(require_self_id)):
    """Fetch full grant details for the user's wishlist (owner only)."""
    try:
        wishlist_ids = await _get_wishlist_ids(id)
        if not wishlist_ids:
            return []

        query = """
            SELECT id, number, title, agency_name, opp_status, open_date, close_date
            FROM grants
            WHERE id::text = ANY($1::text[])
        """
        rows = await db.pool.fetch(query, wishlist_ids)
        return [dict(row) for row in rows]
    except Exception as e:
        logger.exception("POST wishlist-grants failed: %s", e)
        raise HTTPException(status_code=500, detail="Unexpected server error.")
