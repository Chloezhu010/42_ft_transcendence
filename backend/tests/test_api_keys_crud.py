"""Database-layer tests for public API key storage and verification."""

import asyncio

import aiosqlite
import pytest

from db import api_keys_crud
from tests.conftest import _init_test_db


@pytest.fixture
def db_path(tmp_path):
    path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(path))
    return path


async def _create_user(db: aiosqlite.Connection, username: str = "alice") -> int:
    cursor = await db.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        (username, f"{username}@example.com", "hash"),
    )
    await db.commit()
    return cursor.lastrowid


def test_create_key_returns_raw_once_and_stores_hash(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            user_id = await _create_user(db)

            created = await api_keys_crud.create_api_key(db, user_id, "Demo key")

            assert created["key"].startswith("wc_live_")
            assert created["name"] == "Demo key"
            assert created["key_prefix"] == created["key"][: len(created["key_prefix"])]

            cursor = await db.execute("SELECT key_hash FROM api_keys WHERE id = ?", (created["id"],))
            row = await cursor.fetchone()
            assert row is not None
            assert row["key_hash"] != created["key"]
            assert created["key"] not in row["key_hash"]

    asyncio.run(run())


def test_create_key_generates_unique_prefix(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            user_id = await _create_user(db)

            first = await api_keys_crud.create_api_key(db, user_id, "first")
            second = await api_keys_crud.create_api_key(db, user_id, "second")

            assert first["key_prefix"] != second["key_prefix"]

    asyncio.run(run())


def test_list_keys_omits_hash(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            user_id = await _create_user(db)
            await api_keys_crud.create_api_key(db, user_id, "Demo key")

            keys = await api_keys_crud.list_api_keys(db, user_id)

            assert len(keys) == 1
            assert keys[0]["name"] == "Demo key"
            assert "key_hash" not in keys[0]
            assert "key" not in keys[0]

    asyncio.run(run())


def test_revoke_key_sets_inactive(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            user_id = await _create_user(db)
            created = await api_keys_crud.create_api_key(db, user_id, "Demo key")

            revoked = await api_keys_crud.revoke_api_key(db, created["id"], user_id)

            assert revoked is True
            cursor = await db.execute("SELECT is_active FROM api_keys WHERE id = ?", (created["id"],))
            row = await cursor.fetchone()
            assert row["is_active"] == 0

    asyncio.run(run())


def test_verify_active_key_updates_last_used(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            user_id = await _create_user(db)
            created = await api_keys_crud.create_api_key(db, user_id, "Demo key")

            verified = await api_keys_crud.verify_api_key(db, created["key"])

            assert verified is not None
            assert verified["id"] == created["id"]
            assert verified["user_id"] == user_id
            cursor = await db.execute("SELECT last_used_at FROM api_keys WHERE id = ?", (created["id"],))
            row = await cursor.fetchone()
            assert row["last_used_at"] is not None

    asyncio.run(run())


def test_verify_inactive_key_returns_none(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            user_id = await _create_user(db)
            created = await api_keys_crud.create_api_key(db, user_id, "Demo key")
            await api_keys_crud.revoke_api_key(db, created["id"], user_id)

            verified = await api_keys_crud.verify_api_key(db, created["key"])

            assert verified is None

    asyncio.run(run())


def test_verify_unknown_prefix_returns_none(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            user_id = await _create_user(db)
            await api_keys_crud.create_api_key(db, user_id, "Demo key")

            verified = await api_keys_crud.verify_api_key(db, "wc_live_unknown")

            assert verified is None

    asyncio.run(run())


def test_cascade_delete_user_removes_keys(db_path):
    async def run():
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            await db.execute("PRAGMA foreign_keys = ON")
            user_id = await _create_user(db)
            await api_keys_crud.create_api_key(db, user_id, "Demo key")

            await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
            await db.commit()

            cursor = await db.execute("SELECT COUNT(*) AS count FROM api_keys WHERE user_id = ?", (user_id,))
            row = await cursor.fetchone()
            assert row["count"] == 0

    asyncio.run(run())
