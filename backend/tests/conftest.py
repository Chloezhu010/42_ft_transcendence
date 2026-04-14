import asyncio
import os

import aiosqlite
from fastapi import FastAPI
from fastapi.routing import APIRouter

from db.database import _create_tables, get_db

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")


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
