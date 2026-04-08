"""
Tests for users — pure helper functions and key HTTP routes.
"""
import json
from unittest.mock import AsyncMock, MagicMock

import pytest

from routers.users import extract_user_text_for_embedding, row_to_dict, serialize_json_value


# ── serialize_json_value ──────────────────────────────────────────────────────

def test_serialize_json_value_none():
    assert serialize_json_value(None) is None


def test_serialize_json_value_dict():
    result = serialize_json_value({"key": "val"})
    assert json.loads(result) == {"key": "val"}


def test_serialize_json_value_list():
    result = serialize_json_value([1, 2, 3])
    assert json.loads(result) == [1, 2, 3]


def test_serialize_json_value_valid_json_string_passthrough():
    already_json = '{"a": 1}'
    assert serialize_json_value(already_json) == already_json


def test_serialize_json_value_plain_string_wrapped():
    result = serialize_json_value("hello")
    assert json.loads(result) == "hello"


def test_serialize_json_value_bool():
    assert serialize_json_value(True) == "true"


# ── row_to_dict ───────────────────────────────────────────────────────────────

def test_row_to_dict_deserializes_json_text_fields():
    interests = ["machine learning", "NLP"]
    row = MagicMock()
    row.__iter__ = MagicMock(
        return_value=iter(
            [
                ("id", "user-1"),
                ("first_name", "Ada"),
                ("research_interests", json.dumps(interests)),
                ("education", None),
            ]
        )
    )
    row.keys = MagicMock(return_value=["id", "first_name", "research_interests", "education"])
    # dict(row) should work — use a plain dict instead for simplicity
    plain = {
        "id": "user-1",
        "first_name": "Ada",
        "research_interests": json.dumps(interests),
        "education": None,
    }

    class FakeRow:
        def __iter__(self):
            return iter(plain.items())

    result = row_to_dict(FakeRow())
    assert result["research_interests"] == interests
    assert result["education"] is None
    assert result["first_name"] == "Ada"


def test_row_to_dict_leaves_invalid_json_as_string():
    plain = {"research_interests": "not-valid-json{{"}

    class FakeRow:
        def __iter__(self):
            return iter(plain.items())

    result = row_to_dict(FakeRow())
    assert result["research_interests"] == "not-valid-json{{"


# ── extract_user_text_for_embedding ──────────────────────────────────────────

def test_extract_user_text_basic():
    data = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "title": "Professor",
        "institution": "University of Illinois",
    }
    text = extract_user_text_for_embedding(data)
    assert "Ada Lovelace" in text
    assert "Professor" in text
    assert "University of Illinois" in text


def test_extract_user_text_includes_bio():
    data = {"first_name": "Test", "last_name": "User", "bio": "Researches quantum computing"}
    text = extract_user_text_for_embedding(data)
    assert "quantum computing" in text


def test_extract_user_text_includes_research_interests():
    data = {
        "first_name": "Test",
        "last_name": "User",
        "research_interests": ["AI", "robotics"],
    }
    text = extract_user_text_for_embedding(data)
    assert "AI" in text
    assert "robotics" in text


def test_extract_user_text_includes_education():
    data = {
        "first_name": "Test",
        "last_name": "User",
        "education": [{"degree": "PhD", "institution": "MIT"}],
    }
    text = extract_user_text_for_embedding(data)
    assert "PhD" in text
    assert "MIT" in text


def test_extract_user_text_empty_data():
    text = extract_user_text_for_embedding({})
    assert isinstance(text, str)


# ── Route: GET /health ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint(client):
    ac, _ = client
    response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json()["message"] == "Research Team API is Online"


# ── Route: POST /auth/token ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_auth_token_valid_key(client):
    ac, _ = client
    response = await ac.post("/auth/token", json={"api_key": "test-secret-key-for-tests"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_auth_token_wrong_key(client):
    ac, _ = client
    response = await ac.post("/auth/token", json={"api_key": "wrong-key"})
    assert response.status_code == 401


# ── Route: GET /users ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_empty(client):
    ac, pool = client
    pool.fetchval = AsyncMock(return_value=0)
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.get("/users")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_users_by_ids_empty_result(client):
    ac, pool = client
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.get("/users?ids=nonexistent-id")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []


# ── Route: GET /users/{id} ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_user_not_found(client):
    ac, pool = client
    pool.fetchrow = AsyncMock(return_value=None)

    response = await ac.get("/users/does-not-exist")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_user_found(client):
    ac, pool = client

    class FakeRow:
        def __iter__(self):
            return iter(
                {"id": "user-1", "first_name": "Ada", "last_name": "Lovelace"}.items()
            )

    pool.fetchrow = AsyncMock(return_value=FakeRow())

    response = await ac.get("/users/user-1")
    assert response.status_code == 200
    assert response.json()["id"] == "user-1"
