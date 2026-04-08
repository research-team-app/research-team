"""
Tests for auth.py — internal token creation/verification and access-control helpers.
No network or AWS calls are needed; all logic is pure JWT operations.
"""
import time

import jwt
import pytest

from auth import (
    INTERNAL_JWT_AUDIENCE,
    INTERNAL_JWT_ISSUER,
    create_internal_token,
    require_self,
    verify_internal_token,
)


# ── Internal token round-trip ─────────────────────────────────────────────────

def test_create_and_verify_internal_token():
    token = create_internal_token()
    payload = verify_internal_token(token)

    assert payload is not None
    assert payload["sub"] == "internal"
    assert payload["iss"] == INTERNAL_JWT_ISSUER
    assert payload["aud"] == INTERNAL_JWT_AUDIENCE


def test_verify_internal_token_bad_token():
    result = verify_internal_token("not.a.valid.token")
    assert result is None


def test_verify_internal_token_wrong_secret():
    token = jwt.encode(
        {"sub": "internal", "iss": INTERNAL_JWT_ISSUER, "aud": INTERNAL_JWT_AUDIENCE},
        "wrong-secret",
        algorithm="HS256",
    )
    assert verify_internal_token(token) is None


def test_verify_internal_token_expired():
    from auth import INTERNAL_API_KEY

    now = int(time.time())
    token = jwt.encode(
        {
            "sub": "internal",
            "iss": INTERNAL_JWT_ISSUER,
            "aud": INTERNAL_JWT_AUDIENCE,
            "iat": now - 3600,
            "exp": now - 1,  # already expired
        },
        INTERNAL_API_KEY,
        algorithm="HS256",
    )
    assert verify_internal_token(token) is None


# ── require_self ──────────────────────────────────────────────────────────────

def test_require_self_allows_matching_sub():
    payload = {"sub": "user-abc"}
    result = require_self("user-abc", payload)
    assert result == "user-abc"


def test_require_self_rejects_mismatched_sub():
    from fastapi import HTTPException

    payload = {"sub": "user-abc"}
    with pytest.raises(HTTPException) as exc_info:
        require_self("user-xyz", payload)
    assert exc_info.value.status_code == 403


def test_require_self_internal_token_bypasses_check():
    payload = {"sub": "internal"}
    result = require_self("any-user-id", payload)
    assert result == "any-user-id"


def test_require_self_strips_whitespace():
    payload = {"sub": "user-abc"}
    result = require_self("  user-abc  ", payload)
    assert result == "user-abc"
