import aiosqlite
from aiosqlite import Row


async def create_oauth_account(
    db: aiosqlite.Connection,
    user_id: int,
    provider: str,
    provider_user_id: str,
    provider_email: str | None,
) -> int:
    """Create a new OAuth account linked to a user."""
    cursor = await db.execute(
        """
        INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, provider, provider_user_id, provider_email),
    )
    await db.commit()
    return cursor.lastrowid


async def get_oauth_account(
    db: aiosqlite.Connection,
    provider: str,
    provider_user_id: str,
) -> Row | None:
    """Fetch an OAuth account by provider and provider user ID."""
    async with db.execute(
        """
        SELECT *
        FROM oauth_accounts
        WHERE provider = ? AND provider_user_id = ?
        """,
        (provider, provider_user_id),
    ) as cursor:
        return await cursor.fetchone()


async def get_user_by_oauth_account(
    db: aiosqlite.Connection,
    provider: str,
    provider_user_id: str,
) -> Row | None:
    """Fetch a user linked to a specific OAuth account."""
    async with db.execute(
        """
        SELECT u.*
        FROM oauth_accounts oa
        JOIN users u ON u.id = oa.user_id
        WHERE oa.provider = ? AND oa.provider_user_id = ?
        """,
        (provider, provider_user_id),
    ) as cursor:
        return await cursor.fetchone()


async def create_oauth_result(
    db: aiosqlite.Connection,
    code: str,
    user_id: int,
    expires_at: str,
) -> None:
    """Create a new OAuth result with the given code, user ID, and expiration time."""
    await db.execute(
        """
        INSERT INTO oauth_results (code, user_id, expires_at)
        VALUES (?, ?, ?)
        """,
        (code, user_id, expires_at),
    )
    await db.commit()


async def get_oauth_result(
    db: aiosqlite.Connection,
    code: str,
) -> Row | None:
    """Fetch an OAuth result by its code."""
    async with db.execute(
        """
        SELECT *
        FROM oauth_results
        WHERE code = ? AND expires_at > CURRENT_TIMESTAMP
        """,
        (code,),
    ) as cursor:
        return await cursor.fetchone()


async def delete_oauth_result(
    db: aiosqlite.Connection,
    code: str,
) -> bool:
    """Delete a one-time OAuth result after successful exchange."""
    cursor = await db.execute(
        """
        DELETE FROM oauth_results
        WHERE code = ?
        """,
        (code,),
    )
    await db.commit()
    return cursor.rowcount > 0
