import asyncio
import json
import logging
import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import boto3
import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, EmailStr, Field

import db
from auth import (
    COGNITO_REGION,
    COGNITO_USER_POOL_ID,
    get_optional_user,
    get_verified_user,
    get_verified_user_or_internal,
    require_self_id,
)
from services.vector_utility import VectorUtility

DB_TABLE = "users"
users_router = APIRouter()
users_vector_utility = VectorUtility(
    vector_bucket="users-vectors", vector_index="users-vectors-index"
)
grants_vector_utility = VectorUtility(
    vector_bucket="grants-vectors", vector_index="grants-vectors-index"
)
# Logical JSON fields stored as TEXT in the database
JSON_TEXT_FIELDS = [
    "academic_status",
    "publications",
    "current_projects",
    "education",
    "experience",
    "grants",
    "research_interests",
]


class ResearcherBase(BaseModel):
    id: str | None = None
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    profile_image_url: str | None = None
    title: str | None = None
    institution: str | None = None
    department: str | None = None
    bio: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    google_scholar_url: str | None = None
    orcid_id: str | None = None
    research_gate_url: str | None = None
    personal_website: str | None = None
    twitter_handle: str | None = None
    resume_url: str | None = None
    status: str | None = None  # 'public' | 'private' | later 'verified', 'premium'
    current_projects: Any | None = None
    academic_status: Any | None = None
    research_interests: Any | None = None
    education: Any | None = None
    experience: Any | None = None
    publications: Any | None = None
    grants: Any | None = None


class ResearcherCreate(ResearcherBase):
    id: str = Field(...)  # type: ignore[assignment]
    email: EmailStr = Field(...)  # type: ignore[assignment]
    first_name: str = Field(...)  # type: ignore[assignment]
    last_name: str = Field(...)  # type: ignore[assignment]
    username: str = Field(...)


class ResearcherUpdate(ResearcherBase):
    # All fields optional for partial updates
    pass


def serialize_json_value(value: Any) -> str | None:
    """
    Convert Python objects to JSON text suitable for a TEXT/VARCHAR column.
    None stays None (NULL); scalars/dicts/lists become proper JSON.
    If a string is not valid JSON, it is wrapped as a JSON string value.
    """
    if value is None:
        return None
    if isinstance(value, (dict, list, int, float, bool)):
        return json.dumps(value)
    if isinstance(value, str):
        try:
            json.loads(value)  # already valid JSON
            return value
        except Exception:
            return json.dumps(value)
    return json.dumps(value)


def row_to_dict(row) -> dict:
    """
    Convert a DB row to a dict, deserializing JSON TEXT fields back into Python objects.
    """
    record = dict(row)
    for field in JSON_TEXT_FIELDS:
        raw = record.get(field)
        if raw is None or not isinstance(raw, str):
            continue
        try:
            record[field] = json.loads(raw)
        except Exception:
            # Leave raw string if not valid JSON
            pass
    return record


class UserAISearchParams(BaseModel):
    keyword: str
    top_k: int = 20


def _try_delete_cognito_user(
    client,
    user_pool_id: str,
    username: str,
) -> bool:
    try:
        client.admin_delete_user(UserPoolId=user_pool_id, Username=username)
        return True
    except Exception as e:
        code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
        if code in ("UserNotFoundException", "ResourceNotFoundException"):
            return False
        raise


def _resolve_and_delete_cognito_user(
    *,
    user_id: str,
    email: str | None,
    cognito_id: str | None,
    app_username: str | None,
) -> bool:
    """Best-effort Cognito deletion for native and federated users.

    Returns True if a Cognito user was deleted, False if no matching Cognito user was found.
    Raises for non-recoverable AWS errors.
    """
    if not (COGNITO_USER_POOL_ID and COGNITO_REGION):
        return False

    client = boto3.client("cognito-idp", region_name=COGNITO_REGION)

    direct_candidates = [
        (user_id or "").strip(),
        (cognito_id or "").strip(),
        (app_username or "").strip(),
        (email or "").strip(),
    ]
    tried: set[str] = set()
    for candidate in direct_candidates:
        if not candidate or candidate in tried:
            continue
        tried.add(candidate)
        if _try_delete_cognito_user(client, COGNITO_USER_POOL_ID, candidate):
            return True

    # Federated identities often have provider-prefixed usernames.
    # Resolve by immutable sub first, then by email.
    lookup_filters = [f'sub = "{(user_id or "").strip()}"']
    if email and email.strip():
        lookup_filters.append(f'email = "{email.strip()}"')

    for cognito_filter in lookup_filters:
        try:
            resp = client.list_users(
                UserPoolId=COGNITO_USER_POOL_ID, Filter=cognito_filter
            )
            for user in resp.get("Users", []) or []:
                resolved_username = (user.get("Username") or "").strip()
                if not resolved_username or resolved_username in tried:
                    continue
                tried.add(resolved_username)
                if _try_delete_cognito_user(
                    client,
                    COGNITO_USER_POOL_ID,
                    resolved_username,
                ):
                    return True
        except Exception as e:
            code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
            if code in ("UserNotFoundException", "ResourceNotFoundException"):
                continue
            raise

    logging.getLogger(__name__).warning(
        "Cognito user not found for deletion. Tried identifiers=%s filters=%s",
        list(tried),
        lookup_filters,
    )
    return False


@users_router.post("/users/ai-search")
async def search_users_ai(params: UserAISearchParams = Body(...)):
    """Convert keyword to embedding and search users vector index (semantic search)."""
    try:
        vectors = users_vector_utility.query_vectors(
            keyword=params.keyword, topK=params.top_k
        )
    except Exception as e:
        logging.getLogger(__name__).exception("users/ai-search failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI search failed.",
        )
    ids = [str(item["key"]) for item in vectors]
    return {"ids": ids}


@users_router.get("/users")
async def list_users(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(
        12, ge=1, le=5000, description="Items per page (large values for bulk catalog)"
    ),
    search: str | None = Query(None, description="Search in name, email, institution"),
    ids: str | None = Query(
        None,
        description="Comma-separated user ids to fetch (overrides pagination when set)",
    ),
):
    """Fetch users (collaborators) with pagination, or by ids for AI result set."""
    try:
        if ids and ids.strip():
            id_list = [x.strip() for x in ids.split(",") if x.strip()]
            if not id_list:
                return {"items": [], "total": 0, "page": 1, "page_size": 0}
            rows = await db.pool.fetch(
                f"SELECT * FROM {DB_TABLE} WHERE id::text = ANY($1::text[]) ORDER BY first_name, last_name",
                id_list,
            )
            items = [row_to_dict(r) for r in rows]
            return {
                "items": items,
                "total": len(items),
                "page": 1,
                "page_size": len(items),
            }

        offset = (page - 1) * page_size
        conditions = ["1=1"]
        params: list[Any] = []

        # Only list users with status = 'public'
        conditions.append("(status IS NULL OR status = 'public')")

        if search and search.strip():
            q = f"%{search.strip()}%"
            conditions.append(
                "(first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR institution ILIKE $1)"
            )
            params.append(q)

        where_sql = " AND ".join(conditions)
        count_sql = f"SELECT COUNT(*) FROM {DB_TABLE} WHERE {where_sql}"
        total = await db.pool.fetchval(count_sql, *params)

        data_sql = f"""
            SELECT * FROM {DB_TABLE}
            WHERE {where_sql}
            ORDER BY first_name, last_name
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params.extend([page_size, offset])
        rows = await db.pool.fetch(data_sql, *params)
        items = [row_to_dict(r) for r in rows]
        return {"items": items, "total": total, "page": page, "page_size": page_size}
    except Exception:
        raise HTTPException(status_code=500, detail="Unexpected Error")


@users_router.get("/users/{id}")
async def get_user(
    id: str,
    auth: dict | None = Depends(get_optional_user),
):
    try:
        row = await db.pool.fetchrow(f"SELECT * FROM {DB_TABLE} WHERE id = $1", id)
    except Exception:
        raise HTTPException(status_code=500, detail="UnExpected Error")
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    user = row_to_dict(row)
    # Private profiles are only visible to the owner — return 404 to everyone else
    # so we don't leak the existence of private accounts.
    if user.get("status") == "private":
        caller_sub = (auth or {}).get("sub", "")
        if caller_sub != id:
            raise HTTPException(status_code=404, detail="User not found")
    return user


@users_router.delete("/users/{id}")
async def delete_user(
    id: str = Path(...),
    _: str = Depends(require_self_id),
    auth_payload: dict = Depends(get_verified_user),
):
    row = None
    cognito_deleted = False
    try:
        token_email = str(auth_payload.get("email") or "").strip().lower()

        # Capture user data before deletion so we can remove Cognito identity reliably.
        existing = await db.pool.fetchrow(
            f"SELECT * FROM {DB_TABLE} WHERE id = $1",
            id,
        )

        # Legacy safety: if row wasn't keyed by sub/id, resolve via token email.
        if not existing and token_email:
            existing = await db.pool.fetchrow(
                f"SELECT * FROM {DB_TABLE} WHERE lower(email) = lower($1) LIMIT 1",
                token_email,
            )

        source = dict(existing) if existing else {}
        if COGNITO_USER_POOL_ID and COGNITO_REGION:
            cognito_deleted = _resolve_and_delete_cognito_user(
                user_id=id,
                email=source.get("email"),
                cognito_id=source.get("id"),
                app_username=source.get("username"),
            )

        # Soft delete: set deleted_at timestamp instead of hard delete
        row = await db.pool.fetchrow(
            f"UPDATE {DB_TABLE} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *",
            id,
        )
        if not row and token_email:
            try:
                row = await db.pool.fetchrow(
                    f"UPDATE {DB_TABLE} SET deleted_at = NOW() WHERE lower(email) = lower($1) AND deleted_at IS NULL RETURNING *",
                    token_email,
                )
            except Exception:
                pass
        if row:
            try:
                users_vector_utility.delete_vectors(keys=[id])
            except Exception as vector_err:
                logging.getLogger(__name__).warning(
                    "Vector delete failed for user %s: %s", id, vector_err
                )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user. Please try again.",
        )
    return {
        "message": "User soft deleted",
        "user": row_to_dict(row) if row else None,
        "cognito_deleted": cognito_deleted,
    }


@users_router.post("/users")
async def create_user(
    researcher: ResearcherCreate,
    auth_payload: dict = Depends(get_verified_user_or_internal),
):
    # Cognito user: must create only their own profile (sub == researcher.id).
    # Internal (e.g. Lambda PostConfirmation): allowed to create the user in the payload.
    if (auth_payload.get("sub") or "").strip() != "internal":
        if (auth_payload.get("sub") or "").strip() != (researcher.id or "").strip():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create a profile for yourself",
            )

    # Idempotency for Cognito PostConfirmation/Lambda retries:
    # if this user already exists, treat as success.
    existing = await db.pool.fetchrow(
        f"SELECT * FROM {DB_TABLE} WHERE id = $1 OR email = $2 LIMIT 1",
        researcher.id,
        researcher.email,
    )
    if existing:
        existing_id = str(existing.get("id") or "").strip()
        existing_email = str(existing.get("email") or "").strip().lower()
        requested_email = str(researcher.email or "").strip().lower()

        # Recovery path: same email, different id (e.g., account recreated).
        if (
            existing_email
            and existing_email == requested_email
            and existing_id != researcher.id
        ):
            try:
                recovered = await db.pool.fetchrow(
                    f"""
                    UPDATE {DB_TABLE}
                    SET id = $1,
                        first_name = $2,
                        last_name = $3
                    WHERE lower(email) = lower($4)
                    RETURNING *
                    """,
                    researcher.id,
                    researcher.first_name,
                    researcher.last_name,
                    researcher.email,
                )
                if recovered:
                    return {
                        "message": "User recovered by email",
                        "user": row_to_dict(recovered),
                    }
            except Exception as recover_err:
                logging.getLogger(__name__).warning(
                    "User recovery by email failed for %s: %s",
                    researcher.email,
                    recover_err,
                )
        return {
            "message": "User already exists",
            "user": row_to_dict(existing),
        }

    payload = researcher.model_dump(exclude_none=True)
    payload.setdefault("status", "public")

    try:
        # check if user name is unique
        existing_username = await db.pool.fetchval(
            f"SELECT COUNT(*) FROM {DB_TABLE} WHERE username = $1",
            payload["username"],
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Unexpected Error")
    duplicate_username = (existing_username or 0) > 0

    if duplicate_username:
        raise HTTPException(status_code=409, detail="User name  is already taken")

    # Build column list and parameter arrays inline
    column_names: list[str] = []
    placeholders: list[str] = []
    values: list[Any] = []
    param_index = 1

    for field_name, field_value in payload.items():
        if field_name in JSON_TEXT_FIELDS:
            values.append(serialize_json_value(field_value))
        else:
            values.append(field_value)
        column_names.append(field_name)
        placeholders.append(f"${param_index}")
        param_index += 1

    sql = f"""
        INSERT INTO users ({", ".join(column_names)})
        VALUES ({", ".join(placeholders)})
        RETURNING *
    """

    try:
        row = await db.pool.fetchrow(sql, *values)
    except Exception as insert_err:
        logging.getLogger(__name__).warning(
            "create_user INSERT failed for %s: %s", researcher.id, insert_err
        )
        # If concurrent/in-flight creation caused a unique-key conflict,
        # return existing row as success to keep PostConfirmation stable.
        try:
            existing_after = await db.pool.fetchrow(
                f"SELECT * FROM {DB_TABLE} WHERE id = $1 OR email = $2 LIMIT 1",
                researcher.id,
                researcher.email,
            )
        except Exception:
            existing_after = None
        if existing_after:
            return {
                "message": "User already exists",
                "user": row_to_dict(existing_after),
            }
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user. Please try again.",
        )

    # Vector indexing is best-effort — a failure here must not undo the DB insert.
    try:
        user_info_embedded = extract_user_text_for_embedding(payload)
        users_vector_utility.put_vectors(
            [{"key": researcher.id, "text": user_info_embedded}]
        )
    except Exception as vec_err:
        logging.getLogger(__name__).warning(
            "Vector put failed for new user %s (non-fatal): %s", researcher.id, vec_err
        )

    return {"message": "User updated successfully", "user": row_to_dict(row)}


@users_router.put("/users/{id}")
async def update_user(
    id: str,
    researcher: ResearcherUpdate = Body(..., description="JSON field to update"),
    _: str = Depends(require_self_id),
):
    payload = researcher.model_dump(exclude_unset=True, exclude_none=True)
    # Prevent users from overwriting identity/auth fields
    for protected in ("id", "email", "cognito_id"):
        payload.pop(protected, None)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    set_clauses: list[str] = []
    values: list[Any] = []
    param_index = 1

    for field_name, field_value in payload.items():
        if field_name in JSON_TEXT_FIELDS:
            values.append(serialize_json_value(field_value))
        else:
            values.append(field_value)
        set_clauses.append(f"{field_name} = ${param_index}")
        param_index += 1
    # Add id parameter
    values.append(id)
    sql = f"""
        UPDATE {DB_TABLE}
        SET {", ".join(set_clauses)}
        WHERE id = ${len(values)}
        RETURNING *
    """

    try:
        row = await db.pool.fetchrow(sql, *values)
        # Update vector index for this user
        user_info_embedded = extract_user_text_for_embedding(payload)
        users_vector_utility.put_vectors([{"key": id, "text": user_info_embedded}])
    except Exception as e:
        logging.getLogger(__name__).exception(
            "Profile update failed for user %s: %s", id, e
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update profile. Please try again.",
        )

    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated successfully", "user": row_to_dict(row)}


def extract_user_text_for_embedding(user_data: dict) -> str:
    """
    Extracts and cleans relevant profile data for vector search.
    """
    parts = []

    # 1. Basic Identity & Role
    full_name = (
        f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip()
    )
    title = user_data.get("title")
    inst = user_data.get("institution")

    header = f"Name: {full_name}"
    if title:
        header += f", Title: {title}"
    if inst:
        header += f", Institution: {inst}"
    parts.append(header)

    # 2. Bio - High semantic weight
    if user_data.get("bio"):
        parts.append(f"Biography: {user_data['bio']}")

    # 3. Research Interests (List of strings)
    interests = user_data.get("research_interests", [])
    if interests:
        parts.append(f"Research Interests: {', '.join(interests)}")

    # 4. Current Projects (List of dicts)
    projects = user_data.get("current_projects", [])
    if projects:
        proj_strings = [
            f"{p.get('title')}: {p.get('description')}"
            for p in projects
            if p.get("title")
        ]
        parts.append(f"Projects: {'; '.join(proj_strings)}")

    # 5. Education (List of dicts)
    education = user_data.get("education", [])
    if education:
        edu_strings = [
            f"{e.get('degree')} from {e.get('institution')}"
            for e in education
            if e.get("degree")
        ]
        parts.append(f"Education: {'; '.join(edu_strings)}")

    text_to_embed = " | ".join(parts)
    return " ".join(text_to_embed.split())


class OrcidImportRequest(BaseModel):
    orcid_id: str


@users_router.post("/users/{id}/import-orcid")
async def import_orcid_profile(
    id: str = Path(...),
    body: OrcidImportRequest = Body(...),
    _: str = Depends(require_self_id),
):
    """
    Fetch a public ORCID profile and return parsed fields for preview.
    The client decides which fields to apply to the profile.
    """
    orcid_id = body.orcid_id.strip()
    if not re.fullmatch(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]", orcid_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid ORCID format. Expected: 0000-0000-0000-0000",
        )

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://pub.orcid.org/v3.0/{orcid_id}",
                headers={"Accept": "application/json"},
                timeout=15.0,
            )
        if resp.status_code == 404:
            raise HTTPException(
                status_code=404, detail="ORCID profile not found or is private"
            )
        resp.raise_for_status()
        data = resp.json()
    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502, detail=f"ORCID returned {e.response.status_code}"
        )
    except Exception:
        raise HTTPException(status_code=502, detail="Could not fetch ORCID profile")

    result: dict[str, Any] = {}
    person = data.get("person") or {}

    # Name
    name = person.get("name") or {}
    given = ((name.get("given-names") or {}).get("value") or "").strip()
    family = ((name.get("family-name") or {}).get("value") or "").strip()
    if given:
        result["first_name"] = given
    if family:
        result["last_name"] = family

    # Biography
    bio = ((person.get("biography") or {}).get("content") or "").strip()
    if bio:
        result["bio"] = bio

    # Keywords → research_interests
    kws = [
        k.get("content", "").strip()
        for k in ((person.get("keywords") or {}).get("keyword") or [])
        if k.get("content")
    ]
    if kws:
        result["research_interests"] = kws[:15]

    # Researcher URLs → personal_website / linkedin_url
    for ru in (person.get("researcher-urls") or {}).get("researcher-url") or []:
        url_val = (((ru.get("url") or {}).get("value")) or "").strip()
        url_name = (ru.get("url-name") or "").lower()
        if not url_val:
            continue
        if "linkedin" in url_name and not result.get("linkedin_url"):
            result["linkedin_url"] = url_val
        elif not result.get("personal_website"):
            result["personal_website"] = url_val

    acts = data.get("activities-summary") or {}

    # Employments → experience
    employments: list[dict] = []
    for ag in (acts.get("employments") or {}).get("affiliation-group") or []:
        for sw in ag.get("summaries") or []:
            emp = sw.get("employment-summary") or {}
            org = ((emp.get("organization") or {}).get("name") or "").strip()
            role = (emp.get("role-title") or "").strip()
            dept = (emp.get("department-name") or "").strip()
            sy = ((emp.get("start-date") or {}).get("year") or {}).get("value")
            ey = ((emp.get("end-date") or {}).get("year") or {}).get("value")
            if org or role:
                employments.append(
                    {
                        "company": org,
                        "title": role,
                        "department": dept,
                        "start_year": int(sy) if sy else None,
                        "end_year": int(ey) if ey else None,
                        "current": ey is None,
                    }
                )
    if employments:
        result["experience"] = employments[:10]

    # Educations
    educations: list[dict] = []
    for ag in (acts.get("educations") or {}).get("affiliation-group") or []:
        for sw in ag.get("summaries") or []:
            edu = sw.get("education-summary") or {}
            org = ((edu.get("organization") or {}).get("name") or "").strip()
            degree = (edu.get("role-title") or "").strip()
            field = (edu.get("department-name") or "").strip()
            sy = ((edu.get("start-date") or {}).get("year") or {}).get("value")
            ey = ((edu.get("end-date") or {}).get("year") or {}).get("value")
            if org:
                educations.append(
                    {
                        "institution": org,
                        "degree": degree,
                        "field_of_study": field,
                        "start_year": int(sy) if sy else None,
                        "end_year": int(ey) if ey else None,
                    }
                )
    if educations:
        result["education"] = educations[:10]

    if not result:
        raise HTTPException(
            status_code=422,
            detail="No importable data found — make sure the ORCID profile is public.",
        )
    return result


@users_router.get("/users/{id}/export")
async def export_user_data(
    id: str,
    _: str = Depends(require_self_id),
):
    """Export all data belonging to the authenticated user as a single JSON object."""

    def _serialise(rows: list) -> list[dict]:
        out = []
        for r in rows:
            d = dict(r)
            for k, v in d.items():
                if hasattr(v, "isoformat"):
                    d[k] = v.isoformat()
            out.append(d)
        return out

    user_row = await db.pool.fetchrow(f"SELECT * FROM {DB_TABLE} WHERE id = $1", id)
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")

    user = row_to_dict(user_row)
    for k, v in list(user.items()):
        if hasattr(v, "isoformat"):
            user[k] = v.isoformat()

    # Run all independent queries in parallel — cuts wall-clock time by ~8x.
    (
        wishlist_rows,
        following_rows,
        followers_rows,
        sent_rows,
        received_rows,
        post_rows,
        comment_rows,
        membership_rows,
    ) = await asyncio.gather(
        db.pool.fetch(
            "SELECT grant_id, created_at FROM wishlist WHERE user_id = $1 ORDER BY created_at DESC",
            id,
        ),
        db.pool.fetch(
            "SELECT following_id, created_at FROM user_follows WHERE follower_id = $1 ORDER BY created_at DESC",
            id,
        ),
        db.pool.fetch(
            "SELECT follower_id, created_at FROM user_follows WHERE following_id = $1 ORDER BY created_at DESC",
            id,
        ),
        db.pool.fetch(
            "SELECT id, recipient_id, content, is_read, created_at FROM user_messages WHERE sender_id = $1 ORDER BY created_at DESC",
            id,
        ),
        db.pool.fetch(
            "SELECT id, sender_id, content, is_read, created_at FROM user_messages WHERE recipient_id = $1 ORDER BY created_at DESC",
            id,
        ),
        db.pool.fetch(
            "SELECT id, content, created_at, updated_at FROM feed_posts WHERE author_id = $1 ORDER BY created_at DESC",
            id,
        ),
        db.pool.fetch(
            "SELECT id, post_id, parent_comment_id, content, created_at FROM feed_comments WHERE author_id = $1 ORDER BY created_at DESC",
            id,
        ),
        db.pool.fetch(
            "SELECT group_id, role, status, created_at FROM group_memberships WHERE user_id = $1 ORDER BY created_at DESC",
            id,
        ),
    )

    # Secondary lookups — can run in parallel with each other (no JOINs in DSQL).
    grant_ids = [int(r["grant_id"]) for r in wishlist_rows]
    group_ids = [r["group_id"] for r in membership_rows]

    async def _fetch_grant_lookup(ids: list[int]) -> dict[int, dict]:
        if not ids:
            return {}
        rows = await db.pool.fetch(
            "SELECT id, title, agency_name, number, opp_status FROM grants WHERE id = ANY($1::int[])",
            ids,
        )
        return {r["id"]: dict(r) for r in rows}

    async def _fetch_group_lookup(ids: list[str]) -> dict[str, str]:
        if not ids:
            return {}
        rows = await db.pool.fetch(
            "SELECT id, name FROM groups WHERE id = ANY($1::text[])",
            ids,
        )
        return {r["id"]: r["name"] for r in rows}

    grant_lookup, group_lookup = await asyncio.gather(
        _fetch_grant_lookup(grant_ids),
        _fetch_group_lookup(group_ids),
    )

    # Wishlist — attach grant metadata
    wishlist = []
    for r in wishlist_rows:
        entry = dict(r)
        if hasattr(entry.get("created_at"), "isoformat"):
            entry["created_at"] = entry["created_at"].isoformat()
        g = grant_lookup.get(entry["grant_id"], {})
        entry["title"] = g.get("title")
        entry["agency_name"] = g.get("agency_name")
        entry["number"] = g.get("number")
        entry["opp_status"] = g.get("opp_status")
        wishlist.append(entry)

    # Groups — attach group names
    groups = []
    for r in membership_rows:
        entry = _serialise([r])[0]
        entry["name"] = group_lookup.get(entry["group_id"])
        groups.append(entry)

    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "profile": user,
        "wishlist": wishlist,
        "following": _serialise(list(following_rows)),
        "followers": _serialise(list(followers_rows)),
        "messages": {
            "sent": _serialise(list(sent_rows)),
            "received": _serialise(list(received_rows)),
        },
        "feed": {
            "posts": _serialise(list(post_rows)),
            "comments": _serialise(list(comment_rows)),
        },
        "groups": groups,
    }


@users_router.get("/matching_grants/{id}")
async def find_matching_grants(id: UUID):
    """Return list of similar grant ids based on user profile vector (empty if none / error)."""
    try:
        # boto3 is synchronous — run in a thread so the event loop stays free.
        vectors = await asyncio.to_thread(users_vector_utility.get_vectors, [str(id)])
        if not vectors:
            return []
        user_info = vectors[0]
        data = user_info.get("data") if isinstance(user_info, dict) else None
        if not data or "float32" not in data:
            return []
        grant_vectors = await asyncio.to_thread(
            grants_vector_utility.query_vectors_with_vector,
            vector=data["float32"],
        )
        if not grant_vectors:
            return []
        return [item["key"] for item in grant_vectors]
    except Exception as e:
        logging.getLogger(__name__).warning("matching_grants fallback: %s", e)
        return []
