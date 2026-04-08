from __future__ import annotations

import asyncio
import html
import json
import logging
import os
import sys
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


# reading data from glue parameter or env files
def _get_param(key: str, default: str | None = None) -> str | None:
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


# Core config
GRANTS_API_URL = _get_param("GRANTS_API_URL", "https://api.grants.gov/v1/api/search2")
DB_DSN = _get_param("DB_DSN")
DB_TABLE = _get_param("DB_TABLE")
AWS_REGION = "us-east-1"
SUMMARY_TABLE = _get_param("SUMMARY_TABLE")
GRANTS_ROWS = int(_get_param("GRANTS_ROWS") or "100")
GRANTS_MAX_PAGES = int(os.getenv("GRANTS_MAX_PAGES", "30"))
INSERT_BATCH_SIZE = 100
EMBED_MODEL = _get_param("EMBED_MODEL")
VECTOR_BUCKET = _get_param("VECTOR_BUCKET")
VECTOR_INDEX = _get_param("VECTOR_INDEX")
MAX_RETRIES = 3

# AWS boto3 client
session = boto3.Session(profile_name="research-team") if RUN_LOCAL else boto3.Session()

# set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(
    logging.Formatter("%(name)s - %(asctime)s - %(levelname)s - %(message)s")
)
logger.addHandler(handler)


# testing the config
logger.info(f"{RUN_LOCAL=}")
logger.info(f"{GRANTS_API_URL=}")
logger.info(f"{DB_DSN=}")
logger.info(f"{DB_TABLE=}")
logger.info(f"{GRANTS_ROWS=}")
logger.info(f"{GRANTS_MAX_PAGES=}")
logger.info(f"{INSERT_BATCH_SIZE=}")
logger.info(f"{EMBED_MODEL=}")
logger.info(f"{VECTOR_BUCKET=} | {VECTOR_INDEX=}")
logger.info(f"{MAX_RETRIES=} | {AWS_REGION=}")


if (
    not VECTOR_BUCKET
    or not VECTOR_INDEX
    or not DB_TABLE
    or not SUMMARY_TABLE
    or not DB_DSN
):
    logger.error(
        "VECTOR_BUCKET, or VECTOR_INDEX or DB_TABLE or SUMMARY_TABLE or DB_DSN is missing."
    )
    sys.exit()

# global summary of glue job
SUMMARY: dict[str, Any] = {
    "started_at": datetime.now(timezone.utc).isoformat(),
    "db_closed": 0,
    "db_archived": 0,
    "db_status_synced": 0,
    "db_added": 0,
    "db_added_ids": [],
    "vectors_removed": 0,
    "vectors_removed_ids": [],
    "vectors_added": 0,
    "vectors_added_ids": [],
    "vectors_added_cleanup": 0,
    "vectors_removed_cleanup": 0,
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
    """Custom Exception for Retryable HTTP"""

    def __init__(self, code: int, url: str, msg: str = ""):
        super().__init__(
            f"Retryable http_client status {code} for {url}. {msg}".strip()
        )
        self.code = code
        self.url = url


class DBUtility:
    def __init__(self):
        self.db_pool = None

    @staticmethod
    def custom_json_serializer(obj):
        if isinstance(obj, set):
            return list(obj)
        raise TypeError

    async def connect_to_dsql(self, dsn):
        """make sucessful connection to dsql"""
        dsql = session.client("dsql", region_name=AWS_REGION)
        token = dsql.generate_db_connect_admin_auth_token(dsn, AWS_REGION)
        logger.info("DSQL token obtained")
        self.db_pool = await asyncpg.connect(
            user="admin",
            password=token,
            host=dsn,
            port=5432,
            database="postgres",
            ssl=True,
        )
        return self.db_pool

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
        """Get all active grants ids from database"""
        rows = await self.db_pool.fetch(
            f"SELECT id FROM {DB_TABLE} WHERE opp_status IN ($1,$2)",
            Status.FORECASTED,
            Status.POSTED,
        )
        return {str(r["id"]) for r in rows}

    async def update_status_for_ids(self, ids: Sequence[str], status: str) -> int:
        """Update status for grants in db in bulk"""
        if not ids:
            return 0
        id_list = [DBUtility._as_int(x) for x in ids]
        placeholders = ",".join(f"${i}" for i in range(2, len(id_list) + 2))
        sql = f"UPDATE {DB_TABLE} SET opp_status=$1 WHERE id IN ({placeholders})"
        tag = await self.db_pool.execute(sql, status, *id_list)
        try:
            return int(tag.split()[-1])
        except Exception:
            return 0

    async def get_status_by_ids(self, ids: Sequence[str]) -> dict[str, str]:
        """Get current opp_status from db for a given set of ids."""
        if not ids:
            return {}
        id_list = [DBUtility._as_int(x) for x in ids]
        placeholders = ",".join(f"${i}" for i in range(1, len(id_list) + 1))
        sql = f"SELECT id, opp_status FROM {DB_TABLE} WHERE id IN ({placeholders})"
        rows = await self.db_pool.fetch(sql, *id_list)
        return {
            str(r["id"]): str(r.get("opp_status") or "").strip().lower() for r in rows
        }

    async def insert_grants_batch(
        self, rows: list[dict[str, Any]], on_conflict_update: bool = False
    ) -> int:
        """Insert grants. If on_conflict_update=True, re-open existing closed/archived rows."""
        if not rows:
            return 0
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
        per = len(cols)
        placeholders, params = [], []
        for i, r in enumerate(rows):
            base = i * per
            placeholders.append(
                "(" + ",".join(f"${base + j + 1}" for j in range(per)) + ")"
            )
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
        update_cols = [c for c in cols if c != "id"]
        conflict_clause = (
            f"ON CONFLICT (id) DO UPDATE SET {', '.join(c + ' = EXCLUDED.' + c for c in update_cols)}"
            if on_conflict_update
            else "ON CONFLICT (id) DO NOTHING"
        )
        sql = f"""INSERT INTO {DB_TABLE} ({", ".join(cols)})
                VALUES {", ".join(placeholders)} {conflict_clause}"""
        tag = await self.db_pool.execute(sql, *params)
        try:
            return int(tag.split()[-1])
        except Exception:
            return 0

    async def insert_overview_metrics(
        self,
        overview: dict[str, int | None],
        run_summary: dict[str, Any],
    ) -> None:
        """Insert over overview of cron job to summary table"""
        sql = f"""
            INSERT INTO {SUMMARY_TABLE} (
                posted_count, closed_count, archived_count, forecasted_count,
                last_7_days_count, last_4_weeks_count,
                category_agriculture, category_education, category_st, category_health,
                summary
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        """
        await self.db_pool.execute(
            sql,
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

    async def close_db_connection(self):
        try:
            await self.db_pool.close()
        except Exception:
            pass


class VectorUtility:
    """
    utility class to get embeddings, get vectors, put vectors and delete vectors
    """

    BATCH_SIZE = 100

    def __init__(
        self, vector_bucket: str | None = None, vector_index: str | None = None
    ):
        self.bedrock_runtime: BedrockRuntimeClient = session.client(
            service_name="bedrock-runtime"
        )
        self.s3vectors: S3VectorsClient = session.client(service_name="s3vectors")
        self.vector_bucket = vector_bucket
        self.vector_index = vector_index

    @staticmethod
    def chunk_list(data: list, batchsize: int):
        """Yield successive n-sized from data list"""
        for i in range(0, len(data), batchsize):
            yield data[i : i + batchsize]

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
    def get_embeddings(self, texts: list[str], is_query=False):
        """Bulk Embedding for Cohere v4 on Bedrock"""
        all_vectors = []
        model_id = "cohere.embed-v4:0"

        for chunk in VectorUtility.chunk_list(texts, batchsize=50):
            # Sanitize: Remove empty strings which cause API errors
            sanitized_chunk = [t for t in chunk if t and str(t).strip()]
            if not sanitized_chunk:
                continue

            body = json.dumps(
                {
                    "texts": sanitized_chunk,
                    "input_type": "search_query" if is_query else "search_document",
                    "embedding_types": ["float"],
                    "output_dimension": 1536,
                }
            )

            try:
                response = self.bedrock_runtime.invoke_model(
                    body=body,
                    modelId=model_id,
                    accept="application/json",
                    contentType="application/json",
                )

                response_body = json.loads(response.get("body").read())

                # Extract safely
                embeddings = response_body.get("embeddings", {}).get("float", [])
                all_vectors.extend(embeddings)

            except ClientError as e:
                logger.error(f"AWS Error: {e.response['Error']['Message']}")
                raise

        return all_vectors

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def get_vectors(
        self,
        keys: list[str],
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        """Retrieves specific vectors."""
        all = []
        for chunk in VectorUtility.chunk_list(keys, VectorUtility.BATCH_SIZE):
            try:
                response = self.s3vectors.get_vectors(
                    vectorBucketName=(
                        vector_bucket if vector_bucket else self.vector_bucket
                    ),
                    indexName=vector_index if vector_index else self.vector_index,
                    keys=chunk,
                    returnData=True,
                    returnMetadata=True,
                )
                all.extend(response.get("vectors", []))
            except ClientError as e:
                logger.error(f"AWS Error in get_vectors: {e}")
                raise
            except Exception as e:
                logger.error(f"General error in get_vectors: {e}")
                raise
        return all

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def delete_vectors(
        self,
        keys: list[str],
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        """Delete vectors by keys"""
        if not keys:
            return 0

        deleted_count = 0
        for chunk in VectorUtility.chunk_list(keys, VectorUtility.BATCH_SIZE):
            try:
                self.s3vectors.delete_vectors(
                    vectorBucketName=(
                        vector_bucket if vector_bucket else self.vector_bucket
                    ),
                    indexName=vector_index if vector_index else self.vector_index,
                    keys=chunk,
                )
                deleted_count += len(chunk)
            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                logger.error(f"AWS Error in delete_vectors [{error_code}]: {e}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in delete_vectors: {e}")
                raise
        return deleted_count

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def put_vectors(
        self,
        data: list[dict],
        vector_bucket: str | None = None,
        vector_index: str | None = None,
    ):
        responses = []
        for chunk in VectorUtility.chunk_list(data, VectorUtility.BATCH_SIZE):
            try:
                texts = [item["text"] for item in chunk]
                keys = [item["key"] for item in chunk]

                embeddings = self.get_embeddings(texts)

                if len(texts) != len(embeddings):
                    logger.error(
                        "text length is not equal to embedding length; "
                        "skipping this batch and continuing. "
                        "texts=%s embeddings=%s",
                        len(texts),
                        len(embeddings),
                    )
                    continue

                formatted_vectors = [
                    {
                        "key": key,
                        "data": {"float32": VectorUtility._to_float32(embedding)},
                    }
                    for key, embedding in zip(keys, embeddings)
                ]

                response = self.s3vectors.put_vectors(
                    vectorBucketName=(
                        vector_bucket if vector_bucket else self.vector_bucket
                    ),
                    indexName=vector_index if vector_index else self.vector_index,
                    vectors=formatted_vectors,
                )
                responses.append(response)
                logger.info(f"Successfully uploaded batch of {len(chunk)} vectors.")

            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                logger.error(f"AWS Error in put_vectors [{error_code}]: {e}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in put_vectors: {e}")
                raise
        return responses

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    async def add_grants_to_vector_db(self, grants_to_process: list) -> int:
        """Process grant in Batch"""
        total_processed = 0
        for chunk in VectorUtility.chunk_list(grants_to_process, batchsize=80):
            grants_text_to_embded = [
                {
                    "key": grant.get("id"),
                    "text": GrantUtility.extract_text_from_grant(grant),
                }
                for grant in chunk
            ]
            try:
                responses = self.put_vectors(grants_text_to_embded)
                if responses:
                    total_processed += len(chunk)
            except Exception as e:
                logger.error(f"Batch failed: {e}")
        return total_processed


class GrantUtility:
    RETRYABLE_STATUSES = {429, 500, 502, 503, 504}

    def __init__(self, url, num_grant_to_check):
        self.url = url
        self.num_grant_to_check = num_grant_to_check

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
    def extract_text_from_grant(row: dict[str, Any]) -> str:
        return "\n".join(
            [
                f"Title: {row.get('title') or ''}",
                f"Number: {row.get('number') or ''}",
                f"Agency: {row.get('agency_name') or ''}",
                f"Open Date: {row.get('open_date') or ''}",
                f"Close Date: {row.get('close_date') or ''}",
                f"Status: {row.get('opp_status') or ''}",
            ]
        ).strip()

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
        """sanitize grant data before saving to database or create embeddings"""
        gid = g.get("id")
        title = html.unescape((g.get("title") or "").strip())
        open_date = GrantUtility._parse_date((g.get("openDate") or "").strip())
        if not gid or not title:
            return None
        return {
            "id": str(gid),
            "number": g.get("number") or None,
            "title": title,
            "agency_code": g.get("agencyCode") or None,
            "agency_name": g.get("agency") or None,
            "open_date": open_date,
            "close_date": GrantUtility._parse_date(g.get("closeDate", "")),
            "opp_status": (g.get("oppStatus") or "").strip().lower() or None,
        }

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def fetch_grants(
        self, status: str | None, sort_by: str | None
    ) -> list[dict[str, Any]]:
        """Fetch grants from grants.gov with pagination support."""
        page_size = max(1, int(self.num_grant_to_check))
        start_record = 0
        all_hits: list[dict[str, Any]] = []

        for _ in range(GRANTS_MAX_PAGES):
            payload: dict[str, Any] = {
                "rows": page_size,
                "startRecordNum": start_record,
            }
            if status:
                payload["oppStatuses"] = status
            if sort_by:
                payload["sortBy"] = sort_by

            data = GrantUtility.http_post_json(self.url, payload)
            container = data.get("data") if isinstance(data, dict) else None
            hits = (container or {}).get("oppHits")
            batch = hits if isinstance(hits, list) else []
            if not batch:
                break

            all_hits.extend(batch)
            if len(batch) < page_size:
                break

            next_start = (container or {}).get("startRecord")
            if isinstance(next_start, int):
                candidate = next_start + len(batch)
                start_record = (
                    candidate if candidate > start_record else start_record + len(batch)
                )
            else:
                start_record += len(batch)

        if len(all_hits) >= page_size * GRANTS_MAX_PAGES:
            logger.warning(
                "Reached GRANTS_MAX_PAGES while fetching grants. "
                "Consider increasing GRANTS_MAX_PAGES or GRANTS_ROWS."
            )

        return all_hits

    @retry(
        reraise=True,
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=0.5, min=0.5),
        retry=retry_if_exception_type((httpx.RequestError, RetryableHTTP)),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
    def fetch_overview_metrics(self) -> dict[str, int | None]:
        """Pulls top-level counts to store in grants_summary_cron."""
        payload: dict[str, Any] = {}
        data = GrantUtility.http_post_json(self.url, payload)
        if not isinstance(data, dict):
            return {}

        d = data.get("data") or {}
        status_opts = d.get("oppStatusOptions") or []
        date_opts = d.get("dateRangeOptions") or []
        cat_opts = d.get("fundingCategories") or []

        def norm(v: Any) -> str:
            return (str(v or "")).strip().lower()

        def count_by(options: list[dict[str, Any]], want_value: str) -> int | None:
            w = norm(want_value)
            for o in options or []:
                if norm(o.get("value")) == w:
                    try:
                        return (
                            int(o.get("count")) if o.get("count") is not None else None
                        )
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


async def main_job() -> dict[str, Any]:
    # setting up utility
    db_utility = DBUtility()
    await db_utility.connect_to_dsql(dsn=DB_DSN)
    logger.info("Connected to database successfully")

    vector_utility = VectorUtility(
        vector_bucket=VECTOR_BUCKET, vector_index=VECTOR_INDEX
    )
    grant_utility = GrantUtility(url=GRANTS_API_URL, num_grant_to_check=GRANTS_ROWS)
    try:
        # 1. Current active in DB
        active_db_ids = await db_utility.get_active_ids()
        logger.info(f"{len(active_db_ids)} active grants found in database")

        # 2) get grant info
        closed_grants = grant_utility.fetch_grants(Status.CLOSED, "closeDate|desc")
        archived_grants = grant_utility.fetch_grants(Status.ARCHIVED, "closeDate|desc")
        posted_grants = grant_utility.fetch_grants(Status.POSTED, "openDate|desc")
        forecasted_grants = grant_utility.fetch_grants(
            Status.FORECASTED, "openDate|desc"
        )

        # Active grants (dedupe by id in case a grant appears in both posted and forecasted)
        active_api_grants = posted_grants + forecasted_grants
        logger.info(f"{len(active_api_grants)} active grants obtained from api")
        active_grant_ids = {str(g.get("id")) for g in active_api_grants if g.get("id")}
        seen_active_ids: set[str] = set()
        normalized_active_grants = []
        for g in active_api_grants:
            x = GrantUtility.normalize_grant(g)
            if x and x["id"] not in seen_active_ids:
                seen_active_ids.add(x["id"])
                normalized_active_grants.append(x)

        # Keep active statuses aligned with API (e.g., forecasted -> posted once open date passes)
        active_status_by_id = {
            g["id"]: (g.get("opp_status") or "").strip().lower()
            for g in normalized_active_grants
        }
        db_status_by_id = await db_utility.get_status_by_ids(
            list(active_status_by_id.keys())
        )
        transitioned_ids = [
            gid
            for gid, api_status in active_status_by_id.items()
            if gid in db_status_by_id
            and api_status in (Status.FORECASTED, Status.POSTED)
            and db_status_by_id.get(gid) != api_status
        ]

        if transitioned_ids:
            transitioned_by_status = {Status.FORECASTED: [], Status.POSTED: []}
            for gid in transitioned_ids:
                transitioned_by_status[active_status_by_id[gid]].append(gid)

            synced_count = 0
            for target_status, ids in transitioned_by_status.items():
                if ids:
                    synced_count += await db_utility.update_status_for_ids(
                        ids, target_status
                    )
            SUMMARY["db_status_synced"] = synced_count
            logger.info(
                f"{synced_count} active grants had status synchronized (forecasted/posted)"
            )

        # 3) Update DB statuses for those that became inactive
        # closed ones: only mark closed when close_date has passed (grants.gov can list "closed" with future close_date)
        today = date.today()

        def closed_has_passed(g: dict) -> bool:
            close_date_str = GrantUtility._parse_date(g.get("closeDate", ""))
            if not close_date_str:
                return True  # no close date: trust API
            try:
                return date.fromisoformat(close_date_str) < today
            except (TypeError, ValueError):
                return True

        inactive_closed_ids = {
            str(g["id"]) for g in closed_grants if g.get("id") and closed_has_passed(g)
        }
        grant_ids_to_close_db = list(active_db_ids & inactive_closed_ids)

        # archived one
        inactive_archived_ids = {
            str(g.get("id")) for g in archived_grants if g.get("id")
        }
        grant_ids_to_archive_db = list(active_db_ids & inactive_archived_ids)
        inactive_grant_ids = inactive_closed_ids | inactive_archived_ids
        logger.info(
            f"{len(inactive_grant_ids)} grants archived or closed from grant.gov"
        )

        try:
            if grant_ids_to_close_db:
                SUMMARY["db_closed"] = await db_utility.update_status_for_ids(
                    grant_ids_to_close_db, Status.CLOSED
                )
            if grant_ids_to_archive_db:
                SUMMARY["db_archived"] = await db_utility.update_status_for_ids(
                    grant_ids_to_archive_db, Status.ARCHIVED
                )
        except Exception as e:
            SUMMARY["errors"].append(f"DB status updates failed: {e}")
            logger.error("DB status updates failed")

        # 4) Remove vectors for newly inactive
        try:
            ids_to_remove_vectors = list(
                set(grant_ids_to_close_db) | set(grant_ids_to_archive_db)
            )
            SUMMARY["vectors_removed_ids"] = ids_to_remove_vectors
            SUMMARY["vectors_removed"] = (
                vector_utility.delete_vectors(ids_to_remove_vectors)
                if ids_to_remove_vectors
                else 0
            )
            logger.info(
                f"deleted {len(ids_to_remove_vectors)} vectors for archived or closed grants"
            )
        except Exception as e:
            SUMMARY["errors"].append(f"Vector deletes failed: {e}")
            logger.exception("Vector deletes failed")

        # 5) Insert new active grants and re-open any that are closed/archived but active in API
        new_active_grants = [
            r for r in normalized_active_grants if r["id"] not in active_db_ids
        ]

        try:
            inserted_rows_count = await db_utility.insert_grants_batch(
                new_active_grants, on_conflict_update=True
            )
            SUMMARY["db_added"] = inserted_rows_count
            SUMMARY["db_added_ids"] = [grant.get("id") for grant in new_active_grants]
            logger.info(f"{len(new_active_grants)} new grants added to our database")

        except Exception as e:
            SUMMARY["errors"].append(f"DB insert failed: {e}")
            logger.exception("DB insert failed")

        # 6) Add vectors for newly inserted
        if new_active_grants:
            SUMMARY["vectors_added"] = await vector_utility.add_grants_to_vector_db(
                new_active_grants
            )
            SUMMARY["vectors_added_ids"] = [
                grant.get("id") for grant in new_active_grants
            ]
            logger.info(
                f"{len(new_active_grants)} new grants added to our vector store"
            )

        # 6b) Refresh vectors when active status transitions (forecasted <-> posted)
        if transitioned_ids:
            by_id = {r["id"]: r for r in normalized_active_grants}
            transitioned_grants = [
                by_id[gid] for gid in transitioned_ids if gid in by_id
            ]
            if transitioned_grants:
                refreshed = await vector_utility.add_grants_to_vector_db(
                    transitioned_grants
                )
                SUMMARY["vectors_added"] = (
                    int(SUMMARY.get("vectors_added", 0)) + refreshed
                )
                merged_added_ids = [
                    *SUMMARY.get("vectors_added_ids", []),
                    *[grant.get("id") for grant in transitioned_grants],
                ]
                SUMMARY["vectors_added_ids"] = list(dict.fromkeys(merged_added_ids))
                logger.info(
                    f"{len(transitioned_grants)} transitioned active grants refreshed in vector store"
                )

        # 7) Sanity check: Ensure all active grants have vectors and remove unwanted embeddings
        if active_grant_ids:
            try:
                existing_vector_keys = {
                    str(vector.get("key"))
                    for vector in vector_utility.get_vectors(list(active_grant_ids))
                    if vector.get("key") is not None
                }
                logger.info(
                    f"{len(existing_vector_keys)} active  vectors present in database"
                )
                missing_vectors_ids = [
                    k for k in active_grant_ids if k not in existing_vector_keys
                ]

                # Resolve IDs back to full grant objects
                by_id = {r["id"]: r for r in normalized_active_grants}
                missing_grants = [
                    by_id[gid] for gid in missing_vectors_ids if gid in by_id
                ]

                if missing_grants:
                    SUMMARY["vectors_added_cleanup"] = (
                        await vector_utility.add_grants_to_vector_db(missing_grants)
                    )
                    SUMMARY["vectors_added_cleanup_ids"] = missing_vectors_ids
                    logger.info(f"{len(missing_grants)} vectors added during cleanup")

                # also if existing vectors have inactive id remove from s3 vectors
                if inactive_grant_ids:
                    removed_count = vector_utility.delete_vectors(
                        [str(gid) for gid in inactive_grant_ids]
                    )
                    SUMMARY["vectors_removed_cleanup"] = removed_count
                    logger.info(
                        f"{len(inactive_grant_ids)} vectors deleted during cleanup"
                    )

            except Exception as e:
                SUMMARY["errors"].append(f"Vector ensure failed: {e}")
                logger.exception("Vector ensure failed")

        # 8) Insert overview metrics row into grants_summary_cron
        try:
            overview = grant_utility.fetch_overview_metrics()
            await db_utility.insert_overview_metrics(overview, SUMMARY)
        except Exception as e:
            SUMMARY["errors"].append(f"Summary insert failed: {e}")
            logger.error("Summary insert failed")

        # Local summary file
        if RUN_LOCAL:
            with open("summary.json", "w") as f:
                json.dump(
                    SUMMARY, f, indent=2, default=DBUtility.custom_json_serializer
                )
            logger.info(
                f"Job complete: {json.dumps(SUMMARY, indent=2, default=DBUtility.custom_json_serializer)}"
            )

    except Exception as e:
        logger.error(f"Exception occured: {e}")
    finally:
        await db_utility.close_db_connection()


def main():
    asyncio.run(main_job())


if __name__ == "__main__":
    main()
