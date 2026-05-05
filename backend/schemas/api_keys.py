"""API key management schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ApiKeyCreateRequest(BaseModel):
    """Request body for creating a public API key."""

    name: str = Field(min_length=1, max_length=100)


class ApiKeyResponse(BaseModel):
    """API key metadata safe to return after creation."""

    id: int
    user_id: int
    name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None = None


class ApiKeyCreateResponse(ApiKeyResponse):
    """API key creation response that includes the raw key once."""

    key: str
