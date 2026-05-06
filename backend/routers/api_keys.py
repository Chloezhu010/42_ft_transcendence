"""JWT-protected API key management routes."""

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from db import api_keys_crud
from db.database import get_db
from schemas import ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyResponse
from services.rate_limit import api_key_management_rate_limiter

router = APIRouter(prefix="/api/api-keys", tags=["api-keys"])


async def require_api_key_management_quota(current_user: dict = Depends(get_current_user)) -> dict:
    """Apply per-user quota before mutating API key records."""
    decision = await api_key_management_rate_limiter.check(f"user:{current_user['id']}")
    if decision.allowed:
        return current_user

    raise HTTPException(
        status_code=429,
        detail="API key management rate limit exceeded. Please try again later.",
        headers={"Retry-After": str(decision.retry_after_seconds)},
    )


@router.post("", response_model=ApiKeyCreateResponse)
async def create_api_key(
    request: ApiKeyCreateRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(require_api_key_management_quota),
):
    """Create an API key for the current user and return the raw key once."""
    return await api_keys_crud.create_api_key(db, current_user["id"], request.name)


@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List safe API key metadata for the current user."""
    return await api_keys_crud.list_api_keys(db, current_user["id"])


@router.get("/{key_id}", response_model=ApiKeyResponse)
async def get_api_key(
    key_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get one current-user API key by id."""
    api_key = await api_keys_crud.get_api_key(db, key_id, current_user["id"])
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    return api_key


@router.delete("/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Revoke one current-user API key."""
    revoked = await api_keys_crud.revoke_api_key(db, key_id, current_user["id"])
    if not revoked:
        raise HTTPException(status_code=404, detail="API key not found")
    return None
