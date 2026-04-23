from __future__ import annotations

from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field, ValidationError
from starlette.datastructures import UploadFile

import db
from auth import _is_internal, get_optional_user, get_verified_user
from utils import (
    DEFAULT_ATTACHMENT_CONTENT_TYPE,
    MAX_ATTACHMENT_SIZE_BYTES,
    is_missing_relation_error,
)

groups_router = APIRouter()


class GroupCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str = Field("", max_length=2000)
    visibility: str = Field("public", pattern="^(public|private)$")


class GroupMessageCreateRequest(BaseModel):
    content: str = Field("", max_length=2000)


class GroupMessageReplyCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_reply_id: str | None = Field(None, min_length=1, max_length=120)


class GroupInviteRequest(BaseModel):
    user_id: str | None = Field(None, min_length=1, max_length=120)
    email: str | None = Field(None, min_length=3, max_length=320)


class GroupVisibilityUpdateRequest(BaseModel):
    visibility: str = Field(..., pattern="^(public|private)$")


def _build_group_attachment_payload(record, group_id: str, message_id: str):
    file_name = (record.get("attachment_file_name") or "").strip()
    if not file_name:
        return None

    return {
        "file_name": file_name,
        "content_type": record.get("attachment_content_type")
        or DEFAULT_ATTACHMENT_CONTENT_TYPE,
        "size_bytes": int(record.get("attachment_size_bytes") or 0),
        "download_url": f"/groups/{group_id}/messages/{message_id}/attachment",
    }


async def _extract_group_message_payload(request: Request):
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
        req = GroupMessageCreateRequest.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    return req.content.strip(), None


async def _get_group(group_id: str):
    return await db.pool.fetchrow("SELECT * FROM groups WHERE id = $1", group_id)


async def _get_membership(group_id: str, user_id: str):
    return await db.pool.fetchrow(
        """
        SELECT group_id, user_id, role, status, created_at
        FROM group_memberships
        WHERE group_id = $1 AND user_id = $2
        """,
        group_id,
        user_id,
    )


async def _get_group_message(group_id: str, message_id: str):
    return await db.pool.fetchrow(
        """
        SELECT id, group_id, sender_id, content, created_at
        FROM group_messages
        WHERE group_id = $1 AND id = $2
        """,
        group_id,
        message_id,
    )


async def _require_group_access(
    group_id: str, user_id: str, *, require_active: bool = True
):
    group = await _get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if user_id == "internal":
        return group, {"role": "owner", "status": "active", "user_id": "internal"}

    membership = await _get_membership(group_id, user_id)

    if require_active:
        is_active = bool(membership and (membership.get("status") or "") == "active")
        if not is_active:
            raise HTTPException(
                status_code=403, detail="You are not a member of this group"
            )

    return group, membership


@groups_router.post("/groups", status_code=status.HTTP_201_CREATED)
async def create_group(
    req: GroupCreateRequest, auth: dict = Depends(get_verified_user)
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group_id = str(uuid4())
    name = req.name.strip()
    description = req.description.strip()
    visibility = req.visibility.strip().lower()

    if visibility not in {"public", "private"}:
        raise HTTPException(
            status_code=400, detail="Visibility must be public or private"
        )

    try:
        group_row = await db.pool.fetchrow(
            """
            INSERT INTO groups (id, name, description, visibility, owner_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, description, visibility, owner_id, created_at
            """,
            group_id,
            name,
            description,
            visibility,
            user_id,
        )
        await db.pool.execute(
            """
            INSERT INTO group_memberships (group_id, user_id, role, status)
            VALUES ($1, $2, 'owner', 'active')
            ON CONFLICT (group_id, user_id)
            DO UPDATE SET role = 'owner', status = 'active'
            """,
            group_id,
            user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Group create failed.")

    return {"group": dict(group_row)}


@groups_router.get("/groups")
async def list_groups(
    mine_only: bool = Query(False),
    search: str | None = Query(None),
    public_only: bool = Query(False),
    auth: dict | None = Depends(get_optional_user),
):
    user_id = ((auth or {}).get("sub") or "").strip()
    if not user_id:
        if mine_only:
            raise HTTPException(status_code=401, detail="Not authenticated")
        public_only = True

    try:
        if mine_only:
            rows = await db.pool.fetch(
                """
                SELECT g.*, gm.role, gm.status
                FROM groups g
                JOIN group_memberships gm ON gm.group_id = g.id
                WHERE gm.user_id = $1
                  AND (
                    $2::text IS NULL
                    OR g.name ILIKE ('%' || $2 || '%')
                    OR g.description ILIKE ('%' || $2 || '%')
                  )
                ORDER BY g.created_at DESC
                """,
                user_id,
                (search or "").strip() or None,
            )
        else:
            rows = await db.pool.fetch(
                """
                SELECT
                    g.*,
                    gm.role,
                    gm.status,
                    EXISTS (
                        SELECT 1 FROM group_memberships gm2
                        WHERE gm2.group_id = g.id
                          AND gm2.user_id = $1
                          AND gm2.status = 'active'
                    ) AS is_member
                FROM groups g
                LEFT JOIN group_memberships gm
                  ON gm.group_id = g.id
                 AND gm.user_id = $1
                WHERE
                    (
                        CASE
                            WHEN $2::boolean THEN g.visibility = 'public'
                            ELSE (
                                g.visibility = 'public'
                                OR EXISTS (
                                    SELECT 1 FROM group_memberships gm3
                                    WHERE gm3.group_id = g.id
                                      AND gm3.user_id = $1
                                )
                            )
                        END
                    )
                    AND (
                        $3::text IS NULL
                        OR g.name ILIKE ('%' || $3 || '%')
                        OR g.description ILIKE ('%' || $3 || '%')
                    )
                ORDER BY g.created_at DESC
                """,
                user_id,
                public_only,
                (search or "").strip() or None,
            )
    except Exception as e:
        if is_missing_relation_error(e, "groups"):
            return {"items": []}
        raise HTTPException(status_code=500, detail="Group list failed.")

    items = [dict(r) for r in rows]
    if not user_id:
        for item in items:
            item.pop("role", None)
            item.pop("status", None)
            item["is_member"] = False
    return {"items": items}


@groups_router.post("/groups/{group_id}/join-request")
async def request_to_join_group(group_id: str, auth: dict = Depends(get_verified_user)):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group = await _get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if (group.get("visibility") or "public") == "private":
        raise HTTPException(
            status_code=403,
            detail="Private teams are invite-only",
        )

    try:
        await db.pool.execute(
            """
            INSERT INTO group_memberships (group_id, user_id, role, status)
            VALUES ($1, $2, 'member', 'pending')
            ON CONFLICT (group_id, user_id)
            DO UPDATE SET status =
                CASE
                    WHEN group_memberships.status = 'active' THEN 'active'
                    ELSE 'pending'
                END
            """,
            group_id,
            user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Join request failed.")

    return {"status": "pending"}


@groups_router.post("/groups/{group_id}/invite")
async def invite_to_group(
    group_id: str,
    req: GroupInviteRequest,
    auth: dict = Depends(get_verified_user),
):
    inviter_id = (auth.get("sub") or "").strip()
    if not inviter_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group, inviter_membership = await _require_group_access(
        group_id,
        inviter_id,
        require_active=True,
    )

    inviter_role = (inviter_membership.get("role") or "").strip()
    if inviter_role not in {"owner", "admin"} and group.get("owner_id") != inviter_id:
        raise HTTPException(status_code=403, detail="Only owner/admin can invite users")

    requested_user_id = (req.user_id or "").strip()
    requested_email = (req.email or "").strip().lower()

    if not requested_user_id and not requested_email:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    target_id = requested_user_id
    if requested_email:
        target_row = await db.pool.fetchrow(
            """
            SELECT id::text AS id
            FROM users
            WHERE LOWER(email) = $1
            LIMIT 1
            """,
            requested_email,
        )
        if not target_row:
            raise HTTPException(
                status_code=404, detail="User not found for provided email"
            )
        target_id = str(target_row["id"])

    if not target_id:
        raise HTTPException(status_code=400, detail="Unable to resolve target user")

    target_exists = await db.pool.fetchval(
        "SELECT 1 FROM users WHERE id::text = $1", target_id
    )
    if not target_exists:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        await db.pool.execute(
            """
            INSERT INTO group_memberships (group_id, user_id, role, status)
            VALUES ($1, $2, 'member', 'active')
            ON CONFLICT (group_id, user_id)
            DO UPDATE SET status = 'active'
            """,
            group_id,
            target_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Invite failed.")

    return {"status": "active", "user_id": target_id}


@groups_router.patch("/groups/{group_id}")
async def update_group_visibility(
    group_id: str,
    req: GroupVisibilityUpdateRequest,
    auth: dict = Depends(get_verified_user),
):
    actor_id = (auth.get("sub") or "").strip()
    if not actor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group, actor_membership = await _require_group_access(
        group_id, actor_id, require_active=True
    )
    actor_role = (actor_membership.get("role") or "").strip()
    if actor_role not in {"owner", "admin"} and group.get("owner_id") != actor_id:
        raise HTTPException(
            status_code=403, detail="Only owner/admin can update team visibility"
        )

    visibility = req.visibility.strip().lower()
    if visibility not in {"public", "private"}:
        raise HTTPException(
            status_code=400, detail="Visibility must be public or private"
        )

    try:
        row = await db.pool.fetchrow(
            """
            UPDATE groups
            SET visibility = $2
            WHERE id = $1
            RETURNING id, name, description, visibility, owner_id, created_at
            """,
            group_id,
            visibility,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Update team visibility failed.")

    if not row:
        raise HTTPException(status_code=404, detail="Group not found")

    return {"group": dict(row)}


@groups_router.post("/groups/{group_id}/members/{user_id}/decline")
async def decline_member_request(
    group_id: str,
    user_id: str,
    auth: dict = Depends(get_verified_user),
):
    actor_id = (auth.get("sub") or "").strip()
    if not actor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group, actor_membership = await _require_group_access(
        group_id, actor_id, require_active=True
    )
    actor_role = (actor_membership.get("role") or "").strip()
    if actor_role not in {"owner", "admin"} and group.get("owner_id") != actor_id:
        raise HTTPException(
            status_code=403, detail="Only owner/admin can decline requests"
        )

    target = await _get_membership(group_id, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Request not found")
    if (target.get("status") or "") != "pending":
        raise HTTPException(
            status_code=400, detail="Only pending requests can be declined"
        )

    try:
        await db.pool.execute(
            """
            DELETE FROM group_memberships
            WHERE group_id = $1 AND user_id = $2 AND status = 'pending'
            """,
            group_id,
            user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Decline failed.")

    return {"status": "declined", "user_id": user_id}


@groups_router.post("/groups/{group_id}/members/{user_id}/approve")
async def approve_member(
    group_id: str,
    user_id: str,
    auth: dict = Depends(get_verified_user),
):
    approver_id = (auth.get("sub") or "").strip()
    if not approver_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group, approver_membership = await _require_group_access(
        group_id, approver_id, require_active=True
    )
    approver_role = (approver_membership.get("role") or "").strip()
    if approver_role not in {"owner", "admin"} and group.get("owner_id") != approver_id:
        raise HTTPException(status_code=403, detail="Only owner/admin can approve")

    target = await _get_membership(group_id, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Request not found")

    try:
        await db.pool.execute(
            """
            UPDATE group_memberships
            SET status = 'active'
            WHERE group_id = $1 AND user_id = $2
            """,
            group_id,
            user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Approve failed.")

    return {"status": "active", "user_id": user_id}


@groups_router.delete("/groups/{group_id}/members/me")
async def leave_group(group_id: str, auth: dict = Depends(get_verified_user)):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group = await _get_group(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    membership = await _get_membership(group_id, user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")

    role = (membership.get("role") or "").strip()
    if role == "owner":
        # Transfer ownership to another active member if possible.
        # If owner is the only member, archive by deleting group and related rows.
        successor = await db.pool.fetchrow(
            """
            SELECT user_id
            FROM group_memberships
            WHERE group_id = $1
              AND user_id <> $2
              AND status = 'active'
            ORDER BY
              CASE role
                WHEN 'admin' THEN 0
                WHEN 'member' THEN 1
                ELSE 2
              END,
              created_at ASC
            LIMIT 1
            """,
            group_id,
            user_id,
        )

        try:
            if successor and successor.get("user_id"):
                successor_id = str(successor.get("user_id"))
                await db.pool.execute(
                    """
                    UPDATE groups
                    SET owner_id = $2
                    WHERE id = $1
                    """,
                    group_id,
                    successor_id,
                )
                await db.pool.execute(
                    """
                    UPDATE group_memberships
                    SET role = 'owner', status = 'active'
                    WHERE group_id = $1 AND user_id = $2
                    """,
                    group_id,
                    successor_id,
                )
                await db.pool.execute(
                    "DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2",
                    group_id,
                    user_id,
                )
                return {
                    "status": "left",
                    "group_id": group_id,
                    "ownership_transferred_to": successor_id,
                }

            # No active successor available; remove team artifacts.
            await db.pool.execute(
                "DELETE FROM group_messages WHERE group_id = $1", group_id
            )
            await db.pool.execute(
                "DELETE FROM group_memberships WHERE group_id = $1", group_id
            )
            await db.pool.execute("DELETE FROM groups WHERE id = $1", group_id)
            return {"status": "left", "group_id": group_id, "group_deleted": True}
        except Exception:
            raise HTTPException(status_code=500, detail="Leave group failed.")

    try:
        await db.pool.execute(
            "DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2",
            group_id,
            user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Leave group failed.")

    return {"status": "left", "group_id": group_id}


@groups_router.delete("/groups/{group_id}/members/{user_id}")
async def remove_group_member(
    group_id: str,
    user_id: str,
    auth: dict = Depends(get_verified_user),
):
    actor_id = (auth.get("sub") or "").strip()
    if not actor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group, actor_membership = await _require_group_access(
        group_id, actor_id, require_active=True
    )
    actor_role = (actor_membership.get("role") or "").strip()
    if actor_role not in {"owner", "admin"} and group.get("owner_id") != actor_id:
        raise HTTPException(
            status_code=403, detail="Only owner/admin can remove members"
        )

    target = await _get_membership(group_id, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    target_role = (target.get("role") or "").strip()

    if user_id == actor_id:
        raise HTTPException(
            status_code=400, detail="Use leave team for removing yourself"
        )

    # Only owner may remove owner/admin members.
    if (
        not _is_internal(auth)
        and target_role in {"owner", "admin"}
        and group.get("owner_id") != actor_id
    ):
        raise HTTPException(
            status_code=403, detail="Only owner can remove owner/admin members"
        )

    try:
        await db.pool.execute(
            "DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2",
            group_id,
            user_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Remove member failed.")

    return {"status": "removed", "group_id": group_id, "user_id": user_id}


@groups_router.delete("/groups/{group_id}")
async def delete_group(group_id: str, auth: dict = Depends(get_verified_user)):
    actor_id = (auth.get("sub") or "").strip()
    if not actor_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group, actor_membership = await _require_group_access(
        group_id, actor_id, require_active=True
    )
    actor_role = (actor_membership.get("role") or "").strip()
    if actor_role not in {"owner", "admin"} and group.get("owner_id") != actor_id:
        raise HTTPException(status_code=403, detail="Only owner/admin can delete team")

    try:
        await db.pool.execute(
            "DELETE FROM group_message_replies WHERE group_id = $1", group_id
        )
        await db.pool.execute(
            "DELETE FROM group_messages WHERE group_id = $1", group_id
        )
        await db.pool.execute(
            "DELETE FROM group_memberships WHERE group_id = $1", group_id
        )
        await db.pool.execute("DELETE FROM groups WHERE id = $1", group_id)
    except Exception:
        raise HTTPException(status_code=500, detail="Delete team failed.")

    return {"status": "deleted", "group_id": group_id}


@groups_router.get("/groups/{group_id}/members")
async def list_group_members(group_id: str, auth: dict = Depends(get_verified_user)):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_group_access(group_id, user_id, require_active=False)

    rows = await db.pool.fetch(
        """
        SELECT
            gm.group_id,
            gm.user_id,
            gm.role,
            gm.status,
            gm.created_at,
            u.first_name,
            u.last_name,
            u.title,
            u.profile_image_url
        FROM group_memberships gm
        LEFT JOIN users u ON u.id::text = gm.user_id
        WHERE gm.group_id = $1
        ORDER BY gm.created_at ASC
        """,
        group_id,
    )

    items = []
    for r in rows:
        first_name = r.get("first_name") or ""
        last_name = r.get("last_name") or ""
        name = f"{first_name} {last_name}".strip() or "Researcher"
        items.append(
            {
                "group_id": r["group_id"],
                "user_id": r["user_id"],
                "role": r["role"],
                "status": r["status"],
                "created_at": r["created_at"],
                "user": {
                    "id": r["user_id"],
                    "name": name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "title": r.get("title") or "",
                    "profile_image_url": r.get("profile_image_url") or "",
                },
            }
        )

    return {"items": items}


@groups_router.get("/groups/{group_id}/messages")
async def list_group_messages(
    group_id: str,
    limit: int = Query(100, ge=1, le=300),
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_group_access(group_id, user_id, require_active=True)

    rows = await db.pool.fetch(
        """
        SELECT
            gm.id,
            gm.group_id,
            gm.sender_id,
            gm.content,
            gm.created_at,
            a.file_name AS attachment_file_name,
            a.content_type AS attachment_content_type,
            a.size_bytes AS attachment_size_bytes,
            u.first_name,
            u.last_name,
            u.title,
            u.profile_image_url
        FROM group_messages gm
        LEFT JOIN group_message_attachments a ON a.message_id = gm.id
        LEFT JOIN users u ON u.id::text = gm.sender_id
        WHERE gm.group_id = $1
        ORDER BY gm.created_at ASC
        LIMIT $2
        """,
        group_id,
        limit,
    )

    items = []
    for r in rows:
        first_name = r.get("first_name") or ""
        last_name = r.get("last_name") or ""
        sender_name = f"{first_name} {last_name}".strip() or "Researcher"
        items.append(
            {
                "id": r["id"],
                "group_id": r["group_id"],
                "sender_id": r["sender_id"],
                "content": r["content"],
                "created_at": r["created_at"],
                "sender": {
                    "id": r["sender_id"],
                    "name": sender_name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "title": r.get("title") or "",
                    "profile_image_url": r.get("profile_image_url") or "",
                },
                "attachment": _build_group_attachment_payload(
                    r,
                    r["group_id"],
                    r["id"],
                ),
            }
        )

    return {"items": items, "total": len(items)}


@groups_router.post("/groups/{group_id}/messages", status_code=status.HTTP_201_CREATED)
async def send_group_message(
    group_id: str,
    request: Request,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_group_access(group_id, user_id, require_active=True)

    content, attachment = await _extract_group_message_payload(request)
    if len(content) > 2000:
        raise HTTPException(
            status_code=400,
            detail="Message content cannot exceed 2000 characters",
        )
    if not content and not attachment:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    message_id = str(uuid4())
    attachment_id = str(uuid4()) if attachment else None
    try:
        async with db.pool.acquire() as conn:
            async with conn.transaction():
                row = await conn.fetchrow(
                    """
                    INSERT INTO group_messages (id, group_id, sender_id, content)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, group_id, sender_id, content, created_at
                    """,
                    message_id,
                    group_id,
                    user_id,
                    content,
                )
                if attachment and attachment_id:
                    await conn.execute(
                        """
                        INSERT INTO group_message_attachments (
                            id,
                            group_id,
                            message_id,
                            uploader_id,
                            file_name,
                            content_type,
                            size_bytes,
                            file_data
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        """,
                        attachment_id,
                        group_id,
                        message_id,
                        user_id,
                        attachment["file_name"],
                        attachment["content_type"],
                        attachment["size_bytes"],
                        attachment["file_data"],
                    )
    except Exception as e:
        if is_missing_relation_error(e, "group_messages") or is_missing_relation_error(
            e, "group_message_attachments"
        ):
            raise HTTPException(
                status_code=503,
                detail="Groups service unavailable. Please try again later.",
            ) from e
        raise HTTPException(status_code=500, detail="Send group message failed.")

    return {
        "id": row["id"],
        "group_id": row["group_id"],
        "sender_id": row["sender_id"],
        "content": row["content"],
        "created_at": row["created_at"],
        "attachment": (
            {
                "file_name": attachment["file_name"],
                "content_type": attachment["content_type"],
                "size_bytes": attachment["size_bytes"],
                "download_url": f"/groups/{group_id}/messages/{row['id']}/attachment",
            }
            if attachment
            else None
        ),
    }


@groups_router.patch("/groups/{group_id}/messages/{message_id}")
async def update_group_message(
    group_id: str,
    message_id: str,
    req: GroupMessageCreateRequest,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_group_access(group_id, user_id, require_active=True)

    message = await _get_group_message(group_id, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    if str(message["sender_id"]) != user_id:
        raise HTTPException(
            status_code=403, detail="You can only edit your own messages"
        )

    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    try:
        row = await db.pool.fetchrow(
            """
            UPDATE group_messages SET content = $1
            WHERE id = $2 AND group_id = $3
            RETURNING id, group_id, sender_id, content, created_at
            """,
            content,
            message_id,
            group_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Update message failed.")

    return {
        "id": row["id"],
        "group_id": row["group_id"],
        "sender_id": row["sender_id"],
        "content": row["content"],
        "created_at": row["created_at"],
    }


@groups_router.delete("/groups/{group_id}/messages/{message_id}")
async def delete_group_message(
    group_id: str,
    message_id: str,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    group, membership = await _require_group_access(
        group_id, user_id, require_active=True
    )

    message = await _get_group_message(group_id, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    is_own = str(message["sender_id"]) == user_id
    is_admin = (membership.get("role") or "") in {"owner", "admin"}
    if not is_own and not is_admin:
        raise HTTPException(
            status_code=403, detail="You can only delete your own messages"
        )

    try:
        await db.pool.execute(
            "DELETE FROM group_messages WHERE id = $1 AND group_id = $2",
            message_id,
            group_id,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Delete message failed.")

    return {"status": "deleted", "message_id": message_id}


@groups_router.get("/groups/{group_id}/messages/{message_id}/attachment")
async def download_group_message_attachment(
    group_id: str,
    message_id: str,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_group_access(group_id, user_id, require_active=True)

    row = await db.pool.fetchrow(
        """
        SELECT
            a.file_name,
            a.content_type,
            a.file_data
        FROM group_message_attachments a
        WHERE a.group_id = $1 AND a.message_id = $2
        """,
        group_id,
        message_id,
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


@groups_router.get("/groups/{group_id}/messages/{message_id}/replies")
async def list_group_message_replies(
    group_id: str,
    message_id: str,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_group_access(group_id, user_id, require_active=True)

    parent_message = await _get_group_message(group_id, message_id)
    if not parent_message:
        raise HTTPException(status_code=404, detail="Message not found")

    rows = await db.pool.fetch(
        """
        SELECT
            r.id,
            r.group_id,
            r.message_id,
            r.parent_reply_id,
            r.sender_id,
            r.content,
            r.created_at,
            u.first_name,
            u.last_name,
            u.title,
            u.profile_image_url
        FROM group_message_replies r
        LEFT JOIN users u ON u.id::text = r.sender_id
        WHERE r.group_id = $1 AND r.message_id = $2
        ORDER BY r.created_at ASC
        """,
        group_id,
        message_id,
    )

    items = []
    for r in rows:
        first_name = r.get("first_name") or ""
        last_name = r.get("last_name") or ""
        sender_name = f"{first_name} {last_name}".strip() or "Researcher"
        items.append(
            {
                "id": r["id"],
                "group_id": r["group_id"],
                "message_id": r["message_id"],
                "parent_reply_id": r.get("parent_reply_id"),
                "sender_id": r["sender_id"],
                "content": r["content"],
                "created_at": r["created_at"],
                "sender": {
                    "id": r["sender_id"],
                    "name": sender_name,
                    "first_name": first_name,
                    "last_name": last_name,
                    "title": r.get("title") or "",
                    "profile_image_url": r.get("profile_image_url") or "",
                },
            }
        )

    return {"items": items, "total": len(items)}


@groups_router.post(
    "/groups/{group_id}/messages/{message_id}/replies",
    status_code=status.HTTP_201_CREATED,
)
@groups_router.post(
    "/groups/{group_id}/messages/{message_id}/replies/",
    status_code=status.HTTP_201_CREATED,
)
async def create_group_message_reply(
    group_id: str,
    message_id: str,
    req: GroupMessageReplyCreateRequest,
    auth: dict = Depends(get_verified_user),
):
    user_id = (auth.get("sub") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    await _require_group_access(group_id, user_id, require_active=True)

    parent_message = await _get_group_message(group_id, message_id)
    if not parent_message:
        raise HTTPException(status_code=404, detail="Message not found")

    parent_reply_id = (req.parent_reply_id or "").strip() or None
    if parent_reply_id:
        parent_reply = await db.pool.fetchrow(
            """
            SELECT id
            FROM group_message_replies
            WHERE id = $1 AND group_id = $2 AND message_id = $3
            """,
            parent_reply_id,
            group_id,
            message_id,
        )
        if not parent_reply:
            raise HTTPException(status_code=404, detail="Parent reply not found")

    content = req.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Reply content cannot be empty")

    reply_id = str(uuid4())
    try:
        row = await db.pool.fetchrow(
            """
            INSERT INTO group_message_replies (
                id,
                group_id,
                message_id,
                parent_reply_id,
                sender_id,
                content
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, group_id, message_id, parent_reply_id, sender_id, content, created_at
            """,
            reply_id,
            group_id,
            message_id,
            parent_reply_id,
            user_id,
            content,
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Create reply failed.")

    return {
        "id": row["id"],
        "group_id": row["group_id"],
        "message_id": row["message_id"],
        "parent_reply_id": row.get("parent_reply_id"),
        "sender_id": row["sender_id"],
        "content": row["content"],
        "created_at": row["created_at"],
    }
