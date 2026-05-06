"""CRUD helpers for public API keys."""

import hashlib
import hmac
import secrets

import aiosqlite

API_KEY_PREFIX = "wc_live_"
API_KEY_PREFIX_LENGTH = len(API_KEY_PREFIX) + 12


def _hash_api_key(raw_key: str) -> str:
    """Return a stable one-way hash for API key verification."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _row_to_metadata(row: aiosqlite.Row) -> dict:
    """Map a stored API key row to safe response metadata."""
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "name": row["name"],
        "key_prefix": row["key_prefix"],
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
        "last_used_at": row["last_used_at"],
    }


def _generate_raw_key() -> str:
    """Generate a high-entropy public API key."""
    return f"{API_KEY_PREFIX}{secrets.token_urlsafe(32)}"


async def create_api_key(db: aiosqlite.Connection, user_id: int, name: str) -> dict:
    """Create an API key and return metadata plus the raw key once."""
    for _ in range(5):
        raw_key = _generate_raw_key()
        key_prefix = raw_key[:API_KEY_PREFIX_LENGTH]
        key_hash = _hash_api_key(raw_key)
        try:
            cursor = await db.execute(
                """
                INSERT INTO api_keys (user_id, name, key_prefix, key_hash)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, name, key_prefix, key_hash),
            )
            await db.commit()
        except aiosqlite.IntegrityError:
            continue

        row = await get_api_key(db, cursor.lastrowid, user_id)
        if row is None:
            raise RuntimeError("Created API key could not be loaded")
        return {**row, "key": raw_key}

    raise RuntimeError("Could not generate a unique API key")


async def list_api_keys(db: aiosqlite.Connection, user_id: int) -> list[dict]:
    """List safe API key metadata for one user."""
    cursor = await db.execute(
        """
        SELECT id, user_id, name, key_prefix, is_active, created_at, last_used_at
        FROM api_keys
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        """,
        (user_id,),
    )
    rows = await cursor.fetchall()
    return [_row_to_metadata(row) for row in rows]


async def get_api_key(db: aiosqlite.Connection, key_id: int, user_id: int) -> dict | None:
    """Load safe API key metadata by id and owner."""
    cursor = await db.execute(
        """
        SELECT id, user_id, name, key_prefix, is_active, created_at, last_used_at
        FROM api_keys
        WHERE id = ? AND user_id = ?
        """,
        (key_id, user_id),
    )
    row = await cursor.fetchone()
    if row is None:
        return None
    return _row_to_metadata(row)


async def revoke_api_key(db: aiosqlite.Connection, key_id: int, user_id: int) -> bool:
    """Mark one owned API key inactive."""
    cursor = await db.execute(
        """
        UPDATE api_keys
        SET is_active = 0
        WHERE id = ? AND user_id = ? AND is_active = 1
        """,
        (key_id, user_id),
    )
    await db.commit()
    return cursor.rowcount > 0


async def verify_api_key(db: aiosqlite.Connection, raw_key: str) -> dict | None:
    """Verify a raw API key and return key context when valid."""
    if not raw_key.startswith(API_KEY_PREFIX) or len(raw_key) <= API_KEY_PREFIX_LENGTH:
        return None

    key_prefix = raw_key[:API_KEY_PREFIX_LENGTH]
    cursor = await db.execute(
        """
        SELECT id, user_id, name, key_prefix, key_hash, is_active, created_at, last_used_at
        FROM api_keys
        WHERE key_prefix = ? AND is_active = 1
        """,
        (key_prefix,),
    )
    row = await cursor.fetchone()
    if row is None:
        return None

    if not hmac.compare_digest(row["key_hash"], _hash_api_key(raw_key)):
        return None

    await db.execute("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?", (row["id"],))
    await db.commit()
    return _row_to_metadata(row)
