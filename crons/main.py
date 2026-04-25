from __future__ import annotations

import asyncio
import html
import json
import logging
import os
import sys
import time
from array import array
from collections.abc import Sequence
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Any

import asyncpg
import boto3
import httpx
from botocore.exceptions import ClientError
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

if TYPE_CHECKING:
    from mypy_boto3_bedrock_runtime import BedrockRuntimeClient
    from mypy_boto3_s3vectors import S3VectorsClient

RUN_LOCAL = os.getenv("RUN_LOCAL", "false").lower() == "true"


def _get_param(key: str, default: str | None = None) -> str | None:
    """Read a config value from AWS Glue job parameters or local .env file."""
    if RUN_LOCAL:
        from dotenv import load_dotenv  # type: ignore

        load_dotenv()
        return os.getenv(key, default)
    else:
        from awsglue.utils import getResolvedOptions  # type: ignore

        options = getResolvedOptions(
            os.sys.argv,
            [
                "GRANTS_API_URL",
                "DB_DSN",
                "DB_TABLE",
                "GRANTS_ROWS",
                "EMBED_MODEL",
                "VECTOR_BUCKET",
                "VECTOR_INDEX",
                "SUMMARY_TABLE",
            ],
        )
        return options.get(key, default)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
GRANTS_API_URL = _get_param("GRANTS_API_URL", "https://api.grants.gov/v1/api/search2")
FETCH_OPPORTUNITY_URL = "https://api.grants.gov/v1/api/fetchOpportunity"
DB_DSN = _get_param("DB_DSN")
DB_TABLE = _get_param("DB_TABLE")
SUMMARY_TABLE = _get_param("SUMMARY_TABLE")
VECTOR_BUCKET = _get_param("VECTOR_BUCKET")
VECTOR_INDEX = _get_param("VECTOR_INDEX")
AWS_REGION = "us-east-1"

# How many grants to request per API page. Increase this to reduce pages needed.
# With GRANTS_ROWS=500 and ~8 000 active grants, you need ~16 pages — well within
# the GRANTS_MAX_PAGES=30 default. Raise GRANTS_MAX_PAGES if the warning fires.
GRANTS_ROWS = int(_get_param("GRANTS_ROWS") or "500")
GRANTS_MAX_PAGES = int(os.getenv("GRANTS_MAX_PAGES", "30"))

# Max grants.gov detail fetches per run for grants that are missing details.
# Kept low to respect the 60 req/min rate limit (1 s sleep per call).
DETAILS_CATCHUP_LIMIT = int(os.getenv("DETAILS_CATCHUP_LIMIT", "200"))
ARCHIVED_CATCHUP_LIMIT = int(os.getenv("ARCHIVED_CATCHUP_LIMIT", "500"))

# asyncpg has a hard limit of 65 535 query parameters per statement.
# With 8 columns per grant row: 65535 / 8 = 8191 rows max.
# We use 500 to stay well within that limit.
DB_UPSERT_BATCH_SIZE = 500

MAX_RETRIES = 3

# ---------------------------------------------------------------------------
# AWS session
# ---------------------------------------------------------------------------
session = boto3.Session(profile_name="research-team") if RUN_LOCAL else boto3.Session()

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(name)s - %(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)

logger.info(f"{RUN_LOCAL=}")
logger.info(f"{GRANTS_API_URL=}")
logger.info("DB_DSN configured: %s", bool(DB_DSN))
logger.info(f"{DB_TABLE=}")
logger.info(f"{GRANTS_ROWS=}")
logger.info(f"{GRANTS_MAX_PAGES=}")
logger.info(f"{VECTOR_BUCKET=} | {VECTOR_INDEX=}")
logger.info(f"{MAX_RETRIES=} | {AWS_REGION=}")

if not VECTOR_BUCKET or not VECTOR_INDEX or not DB_TABLE or not SUMMARY_TABLE or not DB_DSN:
    logger.error("Missing required config: VECTOR_BUCKET, VECTOR_INDEX, DB_TABLE, SUMMARY_TABLE, or DB_DSN.")
    sys.exit()

# ---------------------------------------------------------------------------
# Run summary — written to the summary table at the end of each job
# ---------------------------------------------------------------------------
SUMMARY: dict[str, Any] = {
    "started_at": datetime.now(timezone.utc).isoformat(),
    "db_closed": 0,
    "db_archived": 0,
    "db_added": 0,
    "db_added_ids": [],
    "vectors_removed": 0,
    "vectors_removed_ids": [],
    "vectors_added": 0,
    "vectors_added_ids": [],
    "vectors_added_cleanup": 0,
    "vectors_removed_cleanup": 0,
    "details_fetched": 0,
    "details_catchup": 0,
    "errors": [],
}


class Status:
    FORECASTED = "forecasted"
    POSTED = "posted"
    CLOSED = "closed"
    ARCHIVED = "archived"


http_client = httpx.Client(
    timeout=httpx.Timeout(120.0),
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
)


class RetryableHTTP(Exception):
    """Raised for transient HTTP errors that should be retried."""

    def __init__(self, code: int, url: str, msg: str = ""):
        super().__init__(f"HTTP {code} for {url}. {msg}".strip())
        self.code = code
        self.url = url


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------


class DBUtility:
    _IN_CLAUSE_BATCH_SIZE = 5000

    def __init__(self):
        self.db_conn = None

    @staticmethod
    def custom_json_serializer(obj):
        if isinstance(obj, set):
            return list(obj)
        raise TypeError

    async def connect(self, dsn: str) -> None:
        """Open an authenticated connection to AWS DSQL."""
        dsql = session.client("dsql", region_name=AWS_REGION)
        token = dsql.generate_db_connect_admin_auth_token(dsn, AWS_REGION)
        logger.info("DSQL auth token obtained")
        self.db_conn = await asyncpg.connect(
            user="admin",
            password=token,
            host=dsn,
            port=5432,
            database="postgres",
            ssl=True,
        )

    @staticmethod
    def _as_int(v: Any) -> Any:
        return int(v) if isinstance(v, str) and v.isdigit() else v

    @staticmethod
    def _as_pg_date(v: Any) -> date | None:
        if v is None or v == "":
            return None
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            try:
                return date.fromisoformat(v)
            except Exception:
                return None
        return None

    async def get_active_ids(self) -> set[str]:
        """Return IDs of all posted/forecasted grants in the database."""
        rows = await self.db_conn.fetch(
            f"SELECT id FROM {DB_TABLE} WHERE opp_status IN ($1,$2)",
            Status.FORECASTED,
            Status.POSTED,
        )
        return {str(r["id"]) for r in rows}

    async def update_status_for_ids(self, ids: Sequence[str], status: str) -> int:
        """Bulk-update opp_status for a list of grant IDs. Returns rows affected."""
        if not ids:
            return 0
        id_list = [DBUtility._as_int(x) for x in ids]
        placeholders = ",".join(f"${i}" for i in range(2, len(id_list) + 2))
        sql = f"UPDATE {DB_TABLE} SET opp_status=$1 WHERE id IN ({placeholders})"
        tag = await self.db_conn.execute(sql, status, *id_list)
        try:
            return int(tag.split()[-1])
        except Exception:
            return 0

    async def upsert_grants(self, rows: list[dict[str, Any]]) -> None:
        """Insert active grants; update all fields if the grant already exists.

        This handles three cases in one SQL statement:
          - Brand-new grant  → INSERT
          - Field change (title, dates, agency) → UPDATE via ON CONFLICT
          - Grant re-opened after being closed/archived → UPDATE resets status to active

        Batched to DB_UPSERT_BATCH_SIZE rows to stay within asyncpg's 65 535
        parameter limit (8 columns × 500 rows = 4 000 params per batch).
        """
        if not rows:
            return
        cols = [
            "id",
            "number",
            "title",
            "agency_code",
            "agency_name",
            "open_date",
            "close_date",
            "opp_status",
        ]
        update_cols = [c for c in cols if c != "id"]
        conflict_clause = f"ON CONFLICT (id) DO UPDATE SET {', '.join(c + ' = EXCLUDED.' + c for c in update_cols)}"

        for batch_start in range(0, len(rows), DB_UPSERT_BATCH_SIZE):
            batch = rows[batch_start : batch_start + DB_UPSERT_BATCH_SIZE]
            per = len(cols)
            placeholders, params = [], []
            for i, r in enumerate(batch):
                base = i * per
                placeholders.append("(" + ",".join(f"${base + j + 1}" for j in range(per)) + ")")
                params.extend(
                    [
                        DBUtility._as_int(r["id"]),
                        r.get("number"),
                        r.get("title"),
                        r.get("agency_code"),
                        r.get("agency_name"),
                        DBUtility._as_pg_date(r.get("open_date")),
                        DBUtility._as_pg_date(r.get("close_date")),
                        r.get("opp_status"),
                    ]
                )
            sql = f"INSERT INTO {DB_TABLE} ({', '.join(cols)}) VALUES {', '.join(placeholders)} {conflict_clause}"
            await self.db_conn.execute(sql, *params)

    async def upsert_grant_details(self, grant_id: str, fields: dict[str, Any], raw_data: dict[str, Any]) -> None:
        """Store full fetchOpportunity response plus extracted columns.

        raw_data is stored as TEXT because AWS DSQL does not support JSONB.
        Uses DO NOTHING so we don't overwrite details that are already stored.
        """
        await self.db_conn.execute(
            """INSERT INTO grant_details (
                   grant_id, synopsis, eligibility, award_floor, award_ceiling,
                   cost_sharing, agency_contact_email,
                   applicant_types, funding_instruments, funding_categories,
                   raw_data
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               ON CONFLICT (grant_id) DO NOTHING""",
            DBUtility._as_int(grant_id),
            fields.get("synopsis"),
            fields.get("eligibility"),
            fields.get("award_floor"),
            fields.get("award_ceiling"),
            fields.get("cost_sharing"),
            fields.get("agency_contact_email"),
            fields.get("applicant_types"),
            fields.get("funding_instruments"),
            fields.get("funding_categories"),
            json.dumps(raw_data),
        )

    async def get_active_ids_without_details(self) -> set[str]:
        """Return IDs of active grants that have no row in grant_details yet.

        Uses two separate queries instead of a JOIN to stay compatible with DSQL.
        """
        active_rows = await self.db_conn.fetch(
            f"SELECT id FROM {DB_TABLE} WHERE opp_status IN ($1, $2)",
            Status.FORECASTED,
            Status.POSTED,
        )
        active_ids = {int(r["id"]) for r in active_rows}
        # Only check grant_details for the active set — avoids a full table scan
        # as grant_details grows with historical grants over time
        detail_ids = await self._get_existing_detail_ids(active_ids)
        return {str(x) for x in (active_ids - detail_ids)}

    async def get_archived_ids_without_details(self) -> set[str]:
        """Return IDs of archived grants that have no row in grant_details yet."""
        archived_rows = await self.db_conn.fetch(
            f"SELECT id FROM {DB_TABLE} WHERE opp_status = $1",
            Status.ARCHIVED,
        )
        archived_ids = {int(r["id"]) for r in archived_rows}
        detail_ids = await self._get_existing_detail_ids(archived_ids)
        return {str(x) for x in (archived_ids - detail_ids)}

    async def _get_existing_detail_ids(self, ids: set[int]) -> set[int]:
        """Return subset of IDs that already exist in grant_details."""
        if not ids:
            return set()

        existing: set[int] = set()
        id_list = list(ids)
        for i in range(0, len(id_list), self._IN_CLAUSE_BATCH_SIZE):
            batch = id_list[i : i + self._IN_CLAUSE_BATCH_SIZE]
            placeholders = ",".join(f"${idx}" for idx in range(1, len(batch) + 1))
            rows = await self.db_conn.fetch(
                f"SELECT grant_id FROM grant_details WHERE grant_id IN ({placeholders})",
                *batch,
            )
            existing.update(int(r["grant_id"]) for r in rows)
        return existing

    async def get_grants_by_ids(self, ids: list[str]) -> list[dict]:
        """Fetch basic grant rows from DB by ID list."""
        if not ids:
            return []
        int_ids = [DBUtility._as_int(x) for x in ids]
        all_rows = []
        for i in range(0, len(int_ids), self._IN_CLAUSE_BATCH_SIZE):
            batch = int_ids[i : i + self._IN_CLAUSE_BATCH_SIZE]
            placeholders = ",".join(f"${idx}" for idx in range(1, len(batch) + 1))
            rows = await self.db_conn.fetch(
                f"SELECT id, number, title, agency_code, agency_name, open_date, close_date, opp_status"
                f" FROM {DB_TABLE} WHERE id IN ({placeholders})",
                *batch,
            )
            all_rows.extend(rows)
        return [dict(r) for r in all_rows]

    async def insert_overview_metrics(
        self,
        overview: dict[str, int | None],
        run_summary: dict[str, Any],
    ) -> None:
        """Write a row to the summary table at the end of each run."""
        await self.db_conn.execute(
            f"""INSERT INTO {SUMMARY_TABLE} (
                    posted_count, closed_count, archived_count, forecasted_count,
                    last_7_days_count, last_4_weeks_count,
                    category_agriculture, category_education, category_st, category_health,
                    summary
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)""",
            overview.get("posted_count"),
            overview.get("closed_count"),
            overview.get("archived_count"),
            overview.get("forecasted_count"),
            overview.get("last_7_days_count"),
            overview.get("last_4_weeks_count"),
            overview.get("category_agriculture"),
            overview.get("category_education"),
            overview.get("category_st"),
            overview.get("category_health"),
            json.dumps(run_summary, default=DBUtility.custom_json_serializer),
        )

    async def close(self):
        try:
            await self.db_conn.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Vector store
# ---------------------------------------------------------------------------


class VectorUtility:
    # S3 Vectors API hard limits per request:
    #   GetVectors:    100 keys
    #   DeleteVectors: 100 keys
    #   PutVectors:    500 vectors (we use 100 to keep memory/latency low)
    BATCH_SIZE = 100

    def __init__(self, vector_bucket: str | None = None, vector_index: str | None = None):
        self.bedrock: BedrockRuntimeClient = session.client(service_name="bedrock-runtime")
        self.s3vectors: S3VectorsClient = session.client(service_name="s3vectors")
        self.vector_bucket = vector_bucket
        self.vector_index = vector_index

    @staticmethod
    def _chunks(data: list, size: int):
        for i in range(0, len(data), size):
            yield data[i : i + size]

    @staticmethod
    def _to_float32(vec: list[float]) -> list[float]:
        return list(array("f", vec))

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type(Exception),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def _get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Embed texts using Cohere v4 on Bedrock. Skips empty strings."""
        all_embeddings = []
        for chunk in VectorUtility._chunks(texts, 50):
            clean = [t for t in chunk if t and str(t).strip()]
            if not clean:
                continue
            body = json.dumps(
                {
                    "texts": clean,
                    "input_type": "search_document",
                    "embedding_types": ["float"],
                    "output_dimension": 1536,
                }
            )
            try:
                response = self.bedrock.invoke_model(
                    body=body,
                    modelId="cohere.embed-v4:0",
                    accept="application/json",
                    contentType="application/json",
                )
                embeddings = json.loads(response["body"].read()).get("embeddings", {}).get("float", [])
                all_embeddings.extend(embeddings)
            except ClientError as e:
                logger.error(f"Bedrock embedding error: {e.response['Error']['Message']}")
                raise
        return all_embeddings

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def get_vectors(self, keys: list[str]) -> list[dict]:
        """Fetch specific vectors by key from the S3 vector index."""
        results = []
        for chunk in VectorUtility._chunks(keys, VectorUtility.BATCH_SIZE):
            try:
                response = self.s3vectors.get_vectors(
                    vectorBucketName=self.vector_bucket,
                    indexName=self.vector_index,
                    keys=chunk,
                    returnData=True,
                    returnMetadata=True,
                )
                results.extend(response.get("vectors", []))
            except ClientError as e:
                logger.error(f"S3Vectors get_vectors error: {e}")
                raise
        return results

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def delete_vectors(self, keys: list[str]) -> int:
        """Delete vectors by key. Returns number of keys sent for deletion."""
        if not keys:
            return 0
        deleted = 0
        for chunk in VectorUtility._chunks(keys, VectorUtility.BATCH_SIZE):
            try:
                self.s3vectors.delete_vectors(
                    vectorBucketName=self.vector_bucket,
                    indexName=self.vector_index,
                    keys=chunk,
                )
                deleted += len(chunk)
            except ClientError as e:
                logger.error(f"S3Vectors delete_vectors error [{e.response['Error']['Code']}]: {e}")
                raise
        return deleted

    def _put_vectors(self, data: list[dict]) -> list:
        """Embed and upload a list of {key, text} dicts to the vector index."""
        responses = []
        for chunk in VectorUtility._chunks(data, VectorUtility.BATCH_SIZE):
            texts = [item["text"] for item in chunk]
            keys = [item["key"] for item in chunk]
            embeddings = self._get_embeddings(texts)
            if len(texts) != len(embeddings):
                logger.error(
                    "Embedding count mismatch — skipping batch. texts=%s embeddings=%s",
                    len(texts),
                    len(embeddings),
                )
                continue
            vectors = [
                {"key": key, "data": {"float32": VectorUtility._to_float32(emb)}} for key, emb in zip(keys, embeddings)
            ]
            try:
                response = self.s3vectors.put_vectors(
                    vectorBucketName=self.vector_bucket,
                    indexName=self.vector_index,
                    vectors=vectors,
                )
                responses.append(response)
                logger.info(f"Uploaded batch of {len(chunk)} vectors.")
            except ClientError as e:
                logger.error(f"S3Vectors put_vectors error [{e.response['Error']['Code']}]: {e}")
                raise
        return responses

    async def embed_grants(self, grants: list[dict]) -> int:
        """Embed and upload grants to the vector index. Returns count successfully uploaded.

        The outer loop (80 grants) is the error-isolation boundary: if one
        batch fails we log it and continue with the rest instead of aborting.
        _put_vectors handles the S3 API limit (BATCH_SIZE=100) internally.
        """
        total = 0
        for chunk in VectorUtility._chunks(grants, 80):
            payload = [{"key": g["id"], "text": GrantUtility.build_embedding_text(g)} for g in chunk]
            try:
                responses = self._put_vectors(payload)
                if responses:
                    total += len(chunk)
            except Exception as e:
                logger.error(f"embed_grants batch failed: {e}")
        return total


# ---------------------------------------------------------------------------
# Grants.gov API
# ---------------------------------------------------------------------------


class GrantUtility:
    RETRYABLE_STATUSES = {429, 500, 502, 503, 504}

    def __init__(self, url: str, page_size: int):
        self.url = url
        self.page_size = page_size

    @staticmethod
    def http_post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
        res = http_client.post(url, json=payload)
        if res.status_code in GrantUtility.RETRYABLE_STATUSES:
            raise RetryableHTTP(res.status_code, url)
        res.raise_for_status()
        try:
            return res.json()
        except ValueError as e:
            raise RetryableHTTP(res.status_code, url, "Bad JSON") from e

    @staticmethod
    def build_embedding_text(grant: dict[str, Any]) -> str:
        """Build a plain-text representation of a grant for semantic embedding."""
        parts = [
            f"Title: {grant.get('title') or ''}",
            f"Number: {grant.get('number') or ''}",
            f"Agency: {grant.get('agency_name') or ''}",
            f"Open Date: {grant.get('open_date') or ''}",
            f"Close Date: {grant.get('close_date') or ''}",
            f"Status: {grant.get('opp_status') or ''}",
        ]
        for label, key in [
            ("Description", "synopsis"),
            ("Eligibility", "eligibility"),
            ("Eligible Applicants", "applicant_types_label"),
            ("Funding Categories", "funding_categories_label"),
            ("Funding Instruments", "funding_instruments_label"),
        ]:
            if grant.get(key):
                parts.append(f"{label}: {grant[key]}")
        if grant.get("award_ceiling"):
            parts.append(f"Award Ceiling: {grant['award_ceiling']}")
        if grant.get("award_floor"):
            parts.append(f"Award Floor: {grant['award_floor']}")
        return "\n".join(parts).strip()

    @staticmethod
    def extract_detail_fields(opportunity_data: dict[str, Any]) -> dict[str, Any]:
        """Parse a fetchOpportunity response into flat fields for DB + embedding."""
        try:
            synopsis_obj = (opportunity_data.get("data") or {}).get("synopsis") or {}

            def descriptions(items: list[dict]) -> str | None:
                parts = [str(x.get("description") or "").strip() for x in (items or []) if x.get("description")]
                return ", ".join(parts) if parts else None

            def clean(v: str | None) -> str | None:
                s = html.unescape((v or "").strip())
                return s or None

            applicant_types = synopsis_obj.get("applicantTypes") or []
            funding_instruments = synopsis_obj.get("fundingInstruments") or []
            funding_categories = synopsis_obj.get("fundingActivityCategories") or []

            return {
                "synopsis": clean(synopsis_obj.get("synopsisDesc")),
                "eligibility": clean(synopsis_obj.get("applicantEligibilityDesc")),
                "award_floor": synopsis_obj.get("awardFloorFormatted") or None,
                "award_ceiling": synopsis_obj.get("awardCeilingFormatted") or None,
                "cost_sharing": synopsis_obj.get("costSharing"),
                "agency_contact_email": synopsis_obj.get("agencyContactEmail") or None,
                "applicant_types": (json.dumps(applicant_types) if applicant_types else None),
                "funding_instruments": (json.dumps(funding_instruments) if funding_instruments else None),
                "funding_categories": (json.dumps(funding_categories) if funding_categories else None),
                # *_label keys are human-readable strings used only for embedding text, not stored in DB
                "applicant_types_label": descriptions(applicant_types),
                "funding_instruments_label": descriptions(funding_instruments),
                "funding_categories_label": descriptions(funding_categories),
            }
        except Exception:
            return {}

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def fetch_opportunity(self, grant_id: str) -> dict[str, Any]:
        """Fetch the full detail record for a single grant from grants.gov."""
        return GrantUtility.http_post_json(FETCH_OPPORTUNITY_URL, {"opportunityId": grant_id})

    @staticmethod
    def _parse_date(s: str) -> str | None:
        s = (s or "").strip()
        if not s:
            return None
        try:
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            return datetime.fromisoformat(s).date().isoformat()
        except Exception:
            pass
        for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"):
            try:
                return datetime.strptime(s, fmt).date().isoformat()
            except ValueError:
                continue
        return None

    @staticmethod
    def normalize_grant(g: dict[str, Any]) -> dict[str, Any] | None:
        """Convert a raw API grant record to our internal format. Returns None if invalid."""
        gid = g.get("id")
        title = html.unescape((g.get("title") or "").strip())
        if not gid or not title:
            return None
        return {
            "id": str(gid),
            "number": g.get("number") or None,
            "title": title,
            "agency_code": g.get("agencyCode") or None,
            "agency_name": g.get("agency") or None,
            "open_date": GrantUtility._parse_date((g.get("openDate") or "").strip()),
            "close_date": GrantUtility._parse_date(g.get("closeDate", "")),
            "opp_status": (g.get("oppStatus") or "").strip().lower() or None,
        }

    @staticmethod
    def close_date_has_passed(g: dict) -> bool:
        """Return True if the grant's close date is in the past (or missing).

        grants.gov sometimes lists a grant as "closed" before its close date
        actually passes, so we use this guard before marking it closed in our DB.
        """
        close_date_str = GrantUtility._parse_date(g.get("closeDate", ""))
        if not close_date_str:
            return True  # no date → trust the API status
        try:
            return date.fromisoformat(close_date_str) < date.today()
        except (TypeError, ValueError):
            return True

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def fetch_grants(self, status: str | None, sort_by: str | None) -> list[dict[str, Any]]:
        """Fetch all grants for the given status, paginating until exhausted.

        Logs an error (and records it in SUMMARY) if we hit GRANTS_MAX_PAGES,
        which means some grants may have been missed. Raise GRANTS_ROWS or
        GRANTS_MAX_PAGES in config to fix this.
        """
        start_record = 0
        all_hits: list[dict[str, Any]] = []

        for _ in range(GRANTS_MAX_PAGES):
            payload: dict[str, Any] = {
                "rows": self.page_size,
                "startRecordNum": start_record,
            }
            if status:
                payload["oppStatuses"] = status
            if sort_by:
                payload["sortBy"] = sort_by

            data = GrantUtility.http_post_json(self.url, payload)
            container = (data.get("data") if isinstance(data, dict) else None) or {}
            batch = container.get("oppHits") or []
            if not isinstance(batch, list) or not batch:
                break

            all_hits.extend(batch)
            if len(batch) < self.page_size:
                break  # last page — no more results

            # Advance the cursor using the API's reported startRecord when available
            next_start = container.get("startRecord")
            if isinstance(next_start, int) and next_start + len(batch) > start_record:
                start_record = next_start + len(batch)
            else:
                start_record += len(batch)

        if len(all_hits) >= self.page_size * GRANTS_MAX_PAGES:
            msg = (
                f"Reached GRANTS_MAX_PAGES ({GRANTS_MAX_PAGES}) for status={status!r}. "
                "Some grants may be missing. Increase GRANTS_ROWS or GRANTS_MAX_PAGES."
            )
            logger.error(msg)
            SUMMARY["errors"].append(msg)

        return all_hits

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def fetch_overview_metrics(self) -> dict[str, int | None]:
        """Pull top-level counts from the API for the summary table."""
        data = GrantUtility.http_post_json(self.url, {})
        if not isinstance(data, dict):
            return {}

        d = data.get("data") or {}
        status_opts = d.get("oppStatusOptions") or []
        date_opts = d.get("dateRangeOptions") or []
        cat_opts = d.get("fundingCategories") or []

        def norm(v: Any) -> str:
            return (str(v or "")).strip().lower()

        def count_by(options: list[dict], want_value: str) -> int | None:
            w = norm(want_value)
            for o in options:
                if norm(o.get("value")) == w:
                    try:
                        return int(o["count"]) if o.get("count") is not None else None
                    except (TypeError, ValueError):
                        return None
            return None

        return {
            "posted_count": count_by(status_opts, "posted"),
            "closed_count": count_by(status_opts, "closed"),
            "archived_count": count_by(status_opts, "archived"),
            "forecasted_count": count_by(status_opts, "forecasted"),
            "last_7_days_count": count_by(date_opts, "7"),
            "last_4_weeks_count": count_by(date_opts, "28"),
            "category_agriculture": count_by(cat_opts, "AG"),
            "category_education": count_by(cat_opts, "ED"),
            "category_st": count_by(cat_opts, "ST"),
            "category_health": count_by(cat_opts, "HL"),
        }


# ---------------------------------------------------------------------------
# Job steps (each step is a self-contained function)
# ---------------------------------------------------------------------------


async def _step_mark_inactive(
    db: DBUtility,
    vector: VectorUtility,
    ids_to_close: list[str],
    ids_to_archive: list[str],
) -> None:
    """Mark closed/archived grants in the DB and remove their vectors.

    Only called for grants that were active in our DB and the API now says
    are closed/archived, so we know these IDs had vectors.
    """
    try:
        if ids_to_close:
            SUMMARY["db_closed"] = await db.update_status_for_ids(ids_to_close, Status.CLOSED)
        if ids_to_archive:
            SUMMARY["db_archived"] = await db.update_status_for_ids(ids_to_archive, Status.ARCHIVED)
        logger.info(f"Marked {len(ids_to_close)} closed, {len(ids_to_archive)} archived in DB")
    except Exception as e:
        SUMMARY["errors"].append(f"DB status updates failed: {e}")
        logger.error("DB status updates failed", exc_info=True)

    ids_to_remove = list(set(ids_to_close) | set(ids_to_archive))
    try:
        SUMMARY["vectors_removed_ids"] = ids_to_remove
        SUMMARY["vectors_removed"] = vector.delete_vectors(ids_to_remove)
        logger.info(f"Deleted {len(ids_to_remove)} vectors for inactive grants")
    except Exception as e:
        SUMMARY["errors"].append(f"Vector deletes failed: {e}")
        logger.error("Vector deletes failed", exc_info=True)


async def _step_upsert_active(
    db: DBUtility,
    all_active: list[dict],
    new_grants: list[dict],
) -> None:
    """Upsert all active grants into the DB.

    - New grants are inserted.
    - Existing grants have their fields updated (title, dates, agency can change).
    - Any grant that was closed/archived but is now active again gets re-opened.
    """
    try:
        await db.upsert_grants(all_active)
        existing_updated = len(all_active) - len(new_grants)
        SUMMARY["db_added"] = len(new_grants)
        SUMMARY["db_added_ids"] = [g["id"] for g in new_grants]
        logger.info(f"{len(new_grants)} new grants inserted, {existing_updated} existing grants refreshed")
    except Exception as e:
        SUMMARY["errors"].append(f"DB upsert failed: {e}")
        logger.error("DB upsert failed", exc_info=True)


async def _step_fetch_details_and_vectorize(
    db: DBUtility,
    vector: VectorUtility,
    grant_utility: GrantUtility,
    grants: list[dict],
    label: str = "grants",
    embed: bool = True,
) -> int:
    """For each grant: fetch full details from grants.gov, store to DB, optionally embed.

    Enriches the grant dicts in-place with detail fields so the embedding text
    includes synopsis, eligibility, award amounts, etc.

    Returns the number of grants successfully embedded (0 when embed=False).
    """
    fetched = 0
    total = len(grants)
    logger.info(f"Fetching details for {total} {label}s (1 req/sec due to rate limit, ~{total}s)")
    for i, grant in enumerate(grants, 1):
        gid = grant["id"]
        try:
            opp_data = grant_utility.fetch_opportunity(gid)
            if opp_data:
                fields = GrantUtility.extract_detail_fields(opp_data)
                await db.upsert_grant_details(gid, fields, opp_data)
                grant.update(fields)  # enrich in-place so embedding text is richer
                fetched += 1
        except Exception as e:
            logger.warning(f"Details fetch failed for {label} {gid}: {e}")
        if i % 25 == 0 or i == total:
            logger.info(f"  [{label}] {i}/{total} fetched so far ({fetched} succeeded)")
        time.sleep(1)  # grants.gov rate limit: 60 req/min

    if grants and embed:
        logger.info(f"Embedding {len(grants)} {label}s...")
        embedded = await vector.embed_grants(grants)
        logger.info(f"{fetched}/{len(grants)} {label} had details fetched, {embedded} embedded")
        return embedded
    if grants:
        logger.info(f"{fetched}/{len(grants)} {label} had details fetched (embed skipped)")
    return 0


async def _step_catchup_archived_details(
    db: DBUtility,
    grant_utility: GrantUtility,
) -> None:
    """Back-fill details for archived grants that don't have them yet.

    Archived grants are kept in the DB for reference but removed from the vector
    store, so we only store details — no embedding.
    """
    try:
        ids_without_details = await db.get_archived_ids_without_details()
        catchup_ids = list(ids_without_details)[:ARCHIVED_CATCHUP_LIMIT]
        if not catchup_ids:
            logger.info("No archived grants need detail catch-up")
            return

        catchup_grants = await db.get_grants_by_ids(catchup_ids)
        # Pass a dummy VectorUtility — embed=False so it is never called
        await _step_fetch_details_and_vectorize(
            db,
            None,
            grant_utility,
            catchup_grants,  # type: ignore[arg-type]
            label="archived grant",
            embed=False,
        )
        SUMMARY["archived_details_catchup"] = len(catchup_grants)
        logger.info(f"{len(catchup_grants)} archived grants caught up with details")
    except Exception as e:
        SUMMARY["errors"].append(f"Archived details catch-up failed: {e}")
        logger.error("Archived details catch-up failed", exc_info=True)


async def _step_ensure_vectors(
    vector: VectorUtility,
    active_ids: set[str],
    grants_by_id: dict[str, dict],
    newly_inactive_ids: set[str],
) -> None:
    """Sanity check: make sure the vector store matches active grants exactly.

    - Adds vectors for any active grant that is missing one (e.g. a previous
      run's embed step partially failed).
    - Removes vectors for grants that became inactive this run if the primary
      delete in _step_mark_inactive partially failed.

    Note: get_vectors queries by the active_ids keys, so orphan_ids will only
    catch key mismatches within the active set, not stale vectors for old
    closed grants. The newly_inactive_ids safety-net handles those.
    """
    try:
        existing_keys = {str(v["key"]) for v in vector.get_vectors(list(active_ids)) if v.get("key") is not None}
        logger.info(f"{len(existing_keys)} vectors present for active grants")

        # Add missing vectors
        missing_ids = [k for k in active_ids if k not in existing_keys]
        missing_grants = [grants_by_id[gid] for gid in missing_ids if gid in grants_by_id]
        if missing_grants:
            SUMMARY["vectors_added_cleanup"] = await vector.embed_grants(missing_grants)
            SUMMARY["vectors_added_cleanup_ids"] = missing_ids
            logger.info(f"{len(missing_grants)} missing vectors added during sanity check")

        # Remove stale vectors (orphans within the queried set + safety net for this run's inactive)
        orphan_ids = [k for k in existing_keys if k not in active_ids]
        stale_ids = list(set(orphan_ids) | newly_inactive_ids)
        if stale_ids:
            removed = vector.delete_vectors(stale_ids)
            SUMMARY["vectors_removed_cleanup"] = removed
            logger.info(
                f"{len(stale_ids)} stale vectors removed "
                f"({len(orphan_ids)} orphans + {len(newly_inactive_ids)} inactive safety-net)"
            )
    except Exception as e:
        SUMMARY["errors"].append(f"Vector sanity check failed: {e}")
        logger.error("Vector sanity check failed", exc_info=True)


async def _step_catchup_details(
    db: DBUtility,
    vector: VectorUtility,
    grant_utility: GrantUtility,
    already_fetched_ids: set[str],
    grants_by_id: dict[str, dict],
) -> None:
    """Back-fill details for active grants that don't have them yet.

    Processes up to DETAILS_CATCHUP_LIMIT grants per run so we don't exceed
    the grants.gov rate limit. Grants caught up here are re-embedded with richer
    text (synopsis, eligibility, etc.) to improve search quality over time.
    """
    try:
        ids_without_details = await db.get_active_ids_without_details()
        # Exclude grants already processed earlier in this run
        catchup_ids = list(ids_without_details - already_fetched_ids)[:DETAILS_CATCHUP_LIMIT]
        if not catchup_ids:
            logger.info("No grants need detail catch-up")
            return

        # Build enriched grant dicts for grants we know about from the API this run
        catchup_grants = [dict(grants_by_id[gid]) for gid in catchup_ids if gid in grants_by_id]
        embedded = await _step_fetch_details_and_vectorize(
            db, vector, grant_utility, catchup_grants, label="catch-up grant"
        )
        SUMMARY["details_catchup"] = len(catchup_grants)
        SUMMARY["vectors_added"] = int(SUMMARY.get("vectors_added", 0)) + embedded
        logger.info(f"{len(catchup_grants)} grants caught up with details")
    except Exception as e:
        SUMMARY["errors"].append(f"Details catch-up failed: {e}")
        logger.error("Details catch-up failed", exc_info=True)


# ---------------------------------------------------------------------------
# Main job
# ---------------------------------------------------------------------------


async def main_job() -> None:
    db = DBUtility()
    await db.connect(dsn=DB_DSN)
    logger.info("Connected to database")

    vector = VectorUtility(vector_bucket=VECTOR_BUCKET, vector_index=VECTOR_INDEX)
    grant_utility = GrantUtility(url=GRANTS_API_URL, page_size=GRANTS_ROWS)

    try:
        # ------------------------------------------------------------------
        # 1. Snapshot: what does our DB currently consider active?
        # ------------------------------------------------------------------
        active_db_ids = await db.get_active_ids()
        logger.info(f"{len(active_db_ids)} active grants in DB")

        # ------------------------------------------------------------------
        # 2. Fetch from grants.gov API
        #    - posted + forecasted  → these are the grants we want active
        #    - closed + archived    → sorted newest-first so we catch recent
        #                             changes without needing all pages
        # ------------------------------------------------------------------
        posted_grants = grant_utility.fetch_grants(Status.POSTED, "openDate|desc")
        forecasted_grants = grant_utility.fetch_grants(Status.FORECASTED, "openDate|desc")
        closed_grants = grant_utility.fetch_grants(Status.CLOSED, "closeDate|desc")
        archived_grants = grant_utility.fetch_grants(Status.ARCHIVED, "closeDate|desc")

        # Normalize and dedupe active grants (a grant can appear in both posted and forecasted)
        active_grants: list[dict] = []
        seen_ids: set[str] = set()
        for raw in posted_grants + forecasted_grants:
            g = GrantUtility.normalize_grant(raw)
            if g and g["id"] not in seen_ids:
                seen_ids.add(g["id"])
                active_grants.append(g)

        active_ids = {g["id"] for g in active_grants}
        grants_by_id = {g["id"]: g for g in active_grants}
        logger.info(f"{len(active_grants)} active grants from API")

        # Grants that are new to our DB (not currently tracked as active)
        new_grants = [g for g in active_grants if g["id"] not in active_db_ids]

        # ------------------------------------------------------------------
        # 3. Work out which DB-active grants are now closed or archived.
        #    Intersection with active_db_ids ensures we only touch grants we
        #    actually have as active — not the full history from the API.
        # ------------------------------------------------------------------
        closed_ids_from_api = {
            str(g["id"]) for g in closed_grants if g.get("id") and GrantUtility.close_date_has_passed(g)
        }
        archived_ids_from_api = {str(g["id"]) for g in archived_grants if g.get("id")}

        ids_to_close = list(active_db_ids & closed_ids_from_api)
        ids_to_archive = list(active_db_ids & archived_ids_from_api)

        # ------------------------------------------------------------------
        # 4. Mark inactive grants in DB + remove their vectors
        # ------------------------------------------------------------------
        await _step_mark_inactive(db, vector, ids_to_close, ids_to_archive)

        # ------------------------------------------------------------------
        # 5. Upsert all active grants to DB
        #    (inserts new ones, refreshes fields on existing, re-opens any
        #    that were closed but are active again)
        # ------------------------------------------------------------------
        await _step_upsert_active(db, active_grants, new_grants)

        # ------------------------------------------------------------------
        # 6. Fetch full details for new grants and embed them
        # ------------------------------------------------------------------
        embedded_new = await _step_fetch_details_and_vectorize(db, vector, grant_utility, new_grants, label="new grant")
        SUMMARY["details_fetched"] = len(new_grants)
        SUMMARY["vectors_added"] = embedded_new
        SUMMARY["vectors_added_ids"] = [g["id"] for g in new_grants]

        # ------------------------------------------------------------------
        # 7. Vector sanity check
        #    Catches gaps from partial failures in earlier steps
        # ------------------------------------------------------------------
        newly_inactive_ids = set(ids_to_close) | set(ids_to_archive)
        await _step_ensure_vectors(vector, active_ids, grants_by_id, newly_inactive_ids)

        # ------------------------------------------------------------------
        # 8. Back-fill details for active grants that don't have them yet
        # ------------------------------------------------------------------
        await _step_catchup_details(
            db,
            vector,
            grant_utility,
            already_fetched_ids={g["id"] for g in new_grants},
            grants_by_id=grants_by_id,
        )

        # ------------------------------------------------------------------
        # 9. Back-fill details for archived grants that don't have them yet
        #    (no embedding — archived grants are excluded from the vector store)
        # ------------------------------------------------------------------
        await _step_catchup_archived_details(db, grant_utility)

        # ------------------------------------------------------------------
        # 10. Write overview metrics and run summary to the summary table
        # ------------------------------------------------------------------
        try:
            overview = grant_utility.fetch_overview_metrics()
            await db.insert_overview_metrics(overview, SUMMARY)
        except Exception as e:
            SUMMARY["errors"].append(f"Summary insert failed: {e}")
            logger.error("Summary insert failed")

        if RUN_LOCAL:
            with open("summary.json", "w") as f:
                json.dump(SUMMARY, f, indent=2, default=DBUtility.custom_json_serializer)
            logger.info(f"Job complete: {json.dumps(SUMMARY, indent=2, default=DBUtility.custom_json_serializer)}")

    except Exception as e:
        logger.error(f"Unhandled exception in main_job: {e}", exc_info=True)
    finally:
        await db.close()


def main():
    asyncio.run(main_job())


if __name__ == "__main__":
    main()
