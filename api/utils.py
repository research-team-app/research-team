"""Shared utilities used across API routers."""

from __future__ import annotations

MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024
DEFAULT_ATTACHMENT_CONTENT_TYPE = "application/octet-stream"


def is_missing_relation_error(exc: Exception, relation: str) -> bool:
    """Return True if *exc* is a 'relation does not exist' error for *relation*."""
    text = str(exc).lower()
    return relation.lower() in text and "does not exist" in text
