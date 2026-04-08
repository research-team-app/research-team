import asyncio
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import asyncpg
import boto3
import dotenv
from fastapi import FastAPI

# loading all the info fro dotenv
dotenv.load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "postgres")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
USE_LOCAL_DATABASE = os.getenv("USE_LOCAL_DATABASE", "false").lower() == "true"

pool: asyncpg.Pool | None = None

# Only initialise the DSQL client when connecting to AWS (not needed for local dev).
_dsql_client = (
    None if USE_LOCAL_DATABASE else boto3.client("dsql", region_name=AWS_REGION)
)


def get_dsql_password():
    print("Generating new AWS DSQL Auth Token...")
    return _dsql_client.generate_db_connect_admin_auth_token(DATABASE_URL, AWS_REGION)


class DSQLConnection(asyncpg.Connection):
    """
    Forcefully disable the connection reset.
    Asyncpg tries to run 'pg_advisory_unlock_all' when returning a connection
    to the pool. AWS DSQL crashes on this.
    We override reset() to simply do nothing.
    """

    async def reset(self, *, timeout=None):
        # Do absolutely nothing.
        # This prevents asyncpg from sending ANY cleanup commands to DSQL.
        pass


async def _init_connection_disable_jit(connection: asyncpg.Connection) -> None:
    """
    Tell asyncpg the server does not support the 'jit' config parameter.
    Avoids FeatureNotSupportedError when using DSQL or other backends that
    do not allow SET jit (asyncpg runs set_config('jit', 'off') during
    type introspection for Postgres 11+).
    """
    try:
        connection._server_caps = connection._server_caps._replace(jit=False)
    except Exception:
        pass


async def create_db_pool_with_retry(
    dsn: str, retries: int = 2, delay: int = 3
) -> asyncpg.Pool:
    for attempt in range(1, retries + 1):
        try:
            print(f"Initializing DB Pool (attempt {attempt}/{retries})...")

            if not USE_LOCAL_DATABASE:
                return await asyncpg.create_pool(
                    host=dsn,
                    user="admin",
                    database="postgres",
                    password=get_dsql_password,
                    port=5432,
                    ssl="require",
                    min_size=0,
                    max_size=1,
                    connection_class=DSQLConnection,
                    init=_init_connection_disable_jit,
                )
            else:
                return await asyncpg.create_pool(
                    host=dsn,
                    user="postgres",
                    password=DATABASE_PASSWORD,
                    database="postgres",
                    port=5432,
                    min_size=0,
                    max_size=1,
                    statement_cache_size=0,
                )
        except Exception as e:
            print(f"DB not ready yet: {e}")
            await asyncio.sleep(delay)
    raise RuntimeError(f"Could not connect to the database after {retries} attempts")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global pool
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    pool = await create_db_pool_with_retry(DATABASE_URL)

    yield
    if pool:
        print("Closing Database pool...")
        await pool.close()
