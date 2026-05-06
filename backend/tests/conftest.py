import asyncio
import os

os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session-secret-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/google/callback")
os.environ.setdefault("BCRYPT_ROUNDS", "4")

import aiosqlite
import pytest
from fastapi import FastAPI
from fastapi.routing import APIRouter

from db.database import _create_tables, get_db
from services.rate_limit import api_key_management_rate_limiter


@pytest.fixture(autouse=True)
def reset_api_key_management_rate_limiter():
    asyncio.run(api_key_management_rate_limiter.configure(max_requests=10, window_seconds=60))
    yield
    asyncio.run(api_key_management_rate_limiter.configure(max_requests=10, window_seconds=60))


async def _init_test_db(db_path: str) -> None:
    """Create schema in a temp db (mirrors init_db in production)."""
    async with aiosqlite.connect(db_path) as db:
        await _create_tables(db)


def make_test_app(db_path: str, *routers: APIRouter) -> FastAPI:
    """Build a minimal FastAPI app with the given routers and a fresh DB override."""
    app = FastAPI()

    async def override_get_db():
        db = await aiosqlite.connect(db_path)
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        try:
            yield db
        finally:
            await db.close()

    app.dependency_overrides[get_db] = override_get_db
    for router in routers:
        app.include_router(router)
    return app
