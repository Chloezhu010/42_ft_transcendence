"""CRUD operations for users."""

import aiosqlite
from aiosqlite import Row

from auth_utils import hash_password


async def create_user(db: aiosqlite.Connection, username: str, email: str, password: str) -> int:
    """Create a new user and return their ID."""
    hashed_pwd = hash_password(password)
    cursor = await db.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", (username, email, hashed_pwd)
    )
    await db.commit()
    return cursor.lastrowid


async def get_user_by_email(db: aiosqlite.Connection, email: str) -> Row | None:
    """Fetch a user by their email address."""
    async with db.execute("SELECT * FROM users WHERE email = ?", (email,)) as cursor:
        return await cursor.fetchone()


async def get_user_by_username(db: aiosqlite.Connection, username: str) -> Row | None:
    """Fetch a user by their username."""
    async with db.execute("SELECT * FROM users WHERE username = ?", (username,)) as cursor:
        return await cursor.fetchone()


async def get_user_by_id(db: aiosqlite.Connection, user_id: int) -> Row | None:
    """Fetch a user by their ID."""
    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
        return await cursor.fetchone()


async def search_users_by_username(
    db: aiosqlite.Connection, query: str, current_user_id: int, limit: int = 10
) -> list[Row]:
    """Search users by username fragment, excluding the current user."""
    normalized_query = query.strip()
    if not normalized_query:
        return []

    safe_limit = max(1, min(limit, 20))
    escaped_query = normalized_query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    like_pattern = f"%{escaped_query}%"
    async with db.execute(
        """
        SELECT * FROM users
        WHERE id != ? AND username LIKE ? ESCAPE '\\' COLLATE NOCASE
        ORDER BY username COLLATE NOCASE ASC, id ASC
        LIMIT ?
        """,
        (current_user_id, like_pattern, safe_limit),
    ) as cursor:
        return await cursor.fetchall()


async def update_user(
    db: aiosqlite.Connection, user_id: int, username: str | None = None, email: str | None = None
) -> Row | None:
    """Update a user's profile info and return the updated row."""
    current_user = await get_user_by_id(db, user_id)
    if not current_user:
        return None

    updates: list[str] = []
    values: list[str | int] = []
    if username is not None:
        updates.append("username = ?")
        values.append(username)
    if email is not None:
        updates.append("email = ?")
        values.append(email)
    if not updates:
        return current_user

    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.append(user_id)
    try:
        await db.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        await db.commit()
    except aiosqlite.IntegrityError as exc:
        if "users.username" in str(exc):
            raise ValueError("Username already in use") from exc
        if "users.email" in str(exc):
            raise ValueError("Email already in use") from exc
        raise

    return await get_user_by_id(db, user_id)


async def update_avatar(db: aiosqlite.Connection, user_id: int, avatar_path: str) -> Row | None:
    """Update a user's avatar path."""
    current_user = await get_user_by_id(db, user_id)
    if current_user is None:
        return None

    await db.execute(
        "UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (avatar_path, user_id)
    )
    await db.commit()
    return await get_user_by_id(db, user_id)


async def set_online_status(db: aiosqlite.Connection, user_id: int, is_online: bool) -> Row | None:
    """Set a user's online status."""
    current_user = await get_user_by_id(db, user_id)
    if current_user is None:
        return None

    await db.execute(
        "UPDATE users SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (is_online, user_id)
    )
    await db.commit()
    return await get_user_by_id(db, user_id)
