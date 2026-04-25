"""User request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    """User data in responses."""

    id: int
    email: str
    username: str
    avatar_url: str | None
    is_online: bool
    is_admin: bool
    created_at: datetime


class PublicUserResponse(BaseModel):
    """User data safe to expose from public profile endpoints."""

    id: int
    username: str
    avatar_url: str | None
    is_online: bool
    created_at: datetime


class UserUpdateRequest(BaseModel):
    """Request body for updating user profile."""

    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = None
