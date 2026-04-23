"""
Tests for grants routes — pagination, filtering, and id-based fetch.
Vector/AI search endpoints are covered by mocking the VectorUtility.
"""

from unittest.mock import AsyncMock, patch

import pytest

# Route: GET /grants


@pytest.mark.asyncio
async def test_get_grants_empty(client):
    ac, pool = client
    pool.fetchval = AsyncMock(return_value=0)
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.get("/grants")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_get_grants_pagination_params(client):
    ac, pool = client
    pool.fetchval = AsyncMock(return_value=0)
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.get("/grants?page=2&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["page"] == 2
    assert data["page_size"] == 5


@pytest.mark.asyncio
async def test_get_grants_with_search(client):
    ac, pool = client
    pool.fetchval = AsyncMock(return_value=0)
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.get("/grants?search=climate")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_grants_with_status_filter(client):
    ac, pool = client
    pool.fetchval = AsyncMock(return_value=0)
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.get("/grants?status=posted")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_grants_with_date_filters(client):
    ac, pool = client
    pool.fetchval = AsyncMock(return_value=0)
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.get(
        "/grants?open_date_from=2024-01-01&close_date_to=2024-12-31"
    )
    assert response.status_code == 200


# ── Route: POST /grants (fetch by ids) ───────────────────────────────────────


@pytest.mark.asyncio
async def test_grant_by_ids_empty_list(client):
    ac, pool = client
    pool.fetch = AsyncMock(return_value=[])

    response = await ac.post("/grants", json={"ids": []})
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_grant_by_ids_returns_results(client):
    ac, pool = client

    fake_row = {"id": 123, "title": "Test Grant", "opp_status": "posted"}

    class FakeRow(dict):
        pass

    pool.fetch = AsyncMock(return_value=[FakeRow(fake_row)])

    response = await ac.post("/grants", json={"ids": [123]})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Grant"


# ── Route: GET /grants/options/filters ───────────────────────────────────────


@pytest.mark.asyncio
async def test_grants_filter_options(client):
    ac, pool = client

    class AgencyRow(dict):
        pass

    class StatusRow(dict):
        pass

    pool.fetch = AsyncMock(
        side_effect=[
            [AgencyRow({"agency_name": "NIH"}), AgencyRow({"agency_name": "NSF"})],
            [StatusRow({"opp_status": "posted"}), StatusRow({"opp_status": "closed"})],
        ]
    )

    response = await ac.get("/grants/options/filters")
    assert response.status_code == 200
    data = response.json()
    assert "agencies" in data
    assert "statuses" in data
    assert "NIH" in data["agencies"]
    assert "posted" in data["statuses"]


# ── Route: POST /grants/ai-search ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_grants_ai_search(client):
    ac, _ = client

    mock_vectors = [{"key": "grant-1"}, {"key": "grant-2"}]
    with patch(
        "routers.grants.vector_utility.query_vectors", return_value=mock_vectors
    ):
        response = await ac.post(
            "/grants/ai-search",
            json={"keyword": "climate change research", "top_k": 5},
        )

    assert response.status_code == 200
    data = response.json()
    assert "ids" in data
    assert data["ids"] == ["grant-1", "grant-2"]


@pytest.mark.asyncio
async def test_grants_ai_search_empty_keyword(client):
    ac, _ = client

    with patch("routers.grants.vector_utility.query_vectors", return_value=[]):
        response = await ac.post(
            "/grants/ai-search",
            json={"keyword": "", "top_k": 10},
        )

    assert response.status_code == 200
    assert response.json()["ids"] == []
