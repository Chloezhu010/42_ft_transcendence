import secrets
from datetime import UTC, datetime, timedelta

import aiosqlite
from fastapi import HTTPException

from db.crud_oauth import create_oauth_result, delete_oauth_result, get_oauth_result

_CODE_TTL_MINUTES = 10


async def issue_oauth_result_code(db: aiosqlite.Connection, user_id: int) -> str:
    """Generate a secure one-time code, store it, and return it."""
    code = secrets.token_urlsafe(32)
    expires_at = (datetime.now(UTC) + timedelta(minutes=_CODE_TTL_MINUTES)).strftime("%Y-%m-%d %H:%M:%S")
    await create_oauth_result(db, code, user_id, expires_at)
    return code


async def consume_oauth_result_code(db: aiosqlite.Connection, code: str) -> int:
    """Validate and delete a one-time code. Returns user_id on success."""
    result = await get_oauth_result(db, code)
    if result is None:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth code")
    await delete_oauth_result(db, code)
    return result["user_id"]
