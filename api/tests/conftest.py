"""
Test configuration and shared fixtures.

All AWS SDK calls are mocked so tests run without AWS credentials.
The database pool is replaced with an AsyncMock for route tests.
"""

import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# ── 1. Env vars must be set before any app module is imported ─────────────────
os.environ["DATABASE_URL"] = "test-host.example.com"
os.environ["INTERNAL_API_KEY"] = "test-secret-key-for-tests"
os.environ["COGNITO_USER_POOL_ID"] = ""  # disables Cognito auth
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"

# ── 2. Mock boto3 at the sys.modules level before app imports touch it ────────
_mock_session = MagicMock()
_mock_boto3 = MagicMock()
_mock_boto3.Session.return_value = _mock_session
_mock_boto3.client.return_value = MagicMock()

sys.modules.setdefault("boto3", _mock_boto3)
sys.modules.setdefault("botocore", MagicMock())
sys.modules.setdefault("botocore.exceptions", MagicMock())

# Add api/ to path so tests can import app modules directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def mock_pool():
    """Async-capable mock of the asyncpg pool used by route handlers."""
    pool = MagicMock()
    pool.fetch = AsyncMock(return_value=[])
    pool.fetchrow = AsyncMock(return_value=None)
    pool.fetchval = AsyncMock(return_value=0)
    pool.execute = AsyncMock(return_value="UPDATE 0")
    pool.close = AsyncMock()
    return pool


@pytest_asyncio.fixture
async def client(mock_pool):
    """
    Full FastAPI app with:
    - lifespan started explicitly so db.pool is initialized with mock_pool
    - no real AWS or database connections

    Yields (AsyncClient, mock_pool) so tests can both make HTTP calls
    and inspect/configure DB return values.
    """
    with patch("db.create_db_pool_with_retry", AsyncMock(return_value=mock_pool)):
        from main import app

        async with app.router.lifespan_context(app):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as ac:
                yield ac, mock_pool
