from fastapi import APIRouter, Depends, HTTPException, Path, status

import db
from auth import _is_internal, get_verified_user

follows_router = APIRouter()


@follows_router.post("/follows/{target_id}")
async def follow_user(
    target_id: str = Path(...),
    auth_payload: dict = Depends(get_verified_user),
):
    follower_id = (auth_payload.get("sub") or "").strip()
    if not follower_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    if follower_id == target_id.strip():
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    target = await db.pool.fetchrow("SELECT id FROM users WHERE id = $1", target_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        await db.pool.execute(
            "INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            follower_id,
            target_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to follow user.")
    return {"message": "Followed successfully"}


@follows_router.delete("/follows/{target_id}")
async def unfollow_user(
    target_id: str = Path(...),
    auth_payload: dict = Depends(get_verified_user),
):
    follower_id = (auth_payload.get("sub") or "").strip()
    if not follower_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    try:
        await db.pool.execute(
            "DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2",
            follower_id,
            target_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to unfollow user.")
    return {"message": "Unfollowed successfully"}


@follows_router.get("/follows/{user_id}/stats")
async def get_follow_stats(user_id: str = Path(...)):
    """Public endpoint: follower and following counts for any user."""
    try:
        followers = await db.pool.fetchval(
            "SELECT COUNT(*) FROM user_follows WHERE following_id = $1", user_id
        )
        following = await db.pool.fetchval(
            "SELECT COUNT(*) FROM user_follows WHERE follower_id = $1", user_id
        )
    except Exception:
        return {"followers": 0, "following": 0}
    return {"followers": int(followers or 0), "following": int(following or 0)}


@follows_router.get("/follows/{viewer_id}/check/{target_id}")
async def check_following(
    viewer_id: str = Path(...),
    target_id: str = Path(...),
    auth: dict = Depends(get_verified_user),
):
    """Check whether viewer_id currently follows target_id. The viewer must be the caller."""
    sub = (auth.get("sub") or "").strip()
    if not _is_internal(auth) and sub != viewer_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only check your own follow state",
        )
    try:
        row = await db.pool.fetchrow(
            "SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2",
            viewer_id,
            target_id,
        )
    except Exception:
        return {"is_following": False}
    return {"is_following": row is not None}


@follows_router.get("/follows/{user_id}/followers")
async def get_followers(user_id: str = Path(...)):
    """Get list of users who follow the specified user."""
    try:
        rows = await db.pool.fetch(
            """
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.title,
                u.institution,
                u.profile_image_url,
                uf.created_at as followed_at
            FROM user_follows uf
            JOIN users u ON u.id::text = uf.follower_id
            WHERE uf.following_id = $1
            ORDER BY uf.created_at DESC
            """,
            user_id,
        )
        return {
            "followers": [
                {
                    "id": row["id"],
                    "first_name": row["first_name"] or "",
                    "last_name": row["last_name"] or "",
                    "name": f"{row['first_name'] or ''} {row['last_name'] or ''}".strip()
                    or "Researcher",
                    "title": row["title"] or "",
                    "institution": row["institution"] or "",
                    "profile_image_url": row["profile_image_url"] or "",
                    "followed_at": row["followed_at"],
                }
                for row in rows
            ]
        }
    except Exception as e:
        # If table doesn't exist, return empty list
        if "user_follows" in str(e).lower() and "does not exist" in str(e).lower():
            return {"followers": []}
        raise HTTPException(status_code=500, detail="Failed to get followers.")


@follows_router.get("/follows/{user_id}/following")
async def get_following(user_id: str = Path(...)):
    """Get list of users that the specified user follows."""
    try:
        rows = await db.pool.fetch(
            """
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.title,
                u.institution,
                u.profile_image_url,
                uf.created_at as followed_at
            FROM user_follows uf
            JOIN users u ON u.id::text = uf.following_id
            WHERE uf.follower_id = $1
            ORDER BY uf.created_at DESC
            """,
            user_id,
        )
        return {
            "following": [
                {
                    "id": row["id"],
                    "first_name": row["first_name"] or "",
                    "last_name": row["last_name"] or "",
                    "name": f"{row['first_name'] or ''} {row['last_name'] or ''}".strip()
                    or "Researcher",
                    "title": row["title"] or "",
                    "institution": row["institution"] or "",
                    "profile_image_url": row["profile_image_url"] or "",
                    "followed_at": row["followed_at"],
                }
                for row in rows
            ]
        }
    except Exception as e:
        # If table doesn't exist, return empty list
        if "user_follows" in str(e).lower() and "does not exist" in str(e).lower():
            return {"following": []}
        raise HTTPException(status_code=500, detail="Failed to get following.")
