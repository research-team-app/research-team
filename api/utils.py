"""Shared utilities used across API routers."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from urllib.parse import quote

from fastapi import HTTPException, Request, status

MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
DEFAULT_ATTACHMENT_CONTENT_TYPE = "application/octet-stream"


_rate_limit_store: dict[str, dict[str, deque[float]]] = defaultdict(
    lambda: defaultdict(deque)
)


def enforce_rate_limit(
    request: Request,
    *,
    bucket: str,
    max_requests: int,
    window_seconds: int,
) -> None:
    """Sliding-window in-memory rate limit keyed by bucket + best-effort client IP.

    The limit is per-Lambda-instance (state is in-process) which is fine for
    abuse mitigation: bursts from a single attacker are still throttled, and a
    Lambda instance handles a small share of total traffic so legitimate users
    are not impacted. For stronger guarantees use API Gateway throttling /
    AWS WAF on top.
    """
    forwarded = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    client_id = forwarded or (
        request.client.host if request.client else "unknown"
    )
    now = time.time()
    cutoff = now - window_seconds
    attempts = _rate_limit_store[bucket][client_id]
    while attempts and attempts[0] < cutoff:
        attempts.popleft()
    if len(attempts) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )
    attempts.append(now)


def is_missing_relation_error(exc: Exception, relation: str) -> bool:
    """Return True if *exc* is a 'relation does not exist' error for *relation*."""
    text = str(exc).lower()
    return relation.lower() in text and "does not exist" in text


def safe_attachment_disposition(file_name: str | None) -> str:
    """Build a Content-Disposition header value safe against header injection.

    Strips quotes, CR and LF (which would otherwise terminate the header or
    corrupt the filename), falls back to "download" when the result is empty,
    and percent-encodes the filename for the RFC 5987 ``filename*`` form.
    """
    raw = (file_name or "").strip()
    cleaned = "".join(ch for ch in raw if ch not in ('"', "\r", "\n", "\\"))
    cleaned = cleaned[:255].strip() or "download"
    encoded = quote(cleaned)
    return f"attachment; filename=\"{cleaned}\"; filename*=UTF-8''{encoded}"
