"""Authentication and quota dependencies for the public API."""

import aiosqlite
from fastapi import Depends, Header, HTTPException

from db import api_keys_crud
from db.database import get_db
from services.rate_limit import public_api_rate_limiter


async def get_public_api_key_context(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """Authenticate a public API request with the X-API-Key header."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    api_key = await api_keys_crud.verify_api_key(db, x_api_key)
    if api_key is None:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return {
        "api_key_id": api_key["id"],
        "user_id": api_key["user_id"],
        "key_prefix": api_key["key_prefix"],
    }


async def require_public_api_quota(
    api_key_context: dict = Depends(get_public_api_key_context),
) -> dict:
    """Apply per-key rate limiting to public API requests."""
    decision = await public_api_rate_limiter.check(f"api_key:{api_key_context['api_key_id']}")
    if decision.allowed:
        return api_key_context

    raise HTTPException(
        status_code=429,
        detail="Public API rate limit exceeded. Please try again later.",
        headers={"Retry-After": str(decision.retry_after_seconds)},
    )
