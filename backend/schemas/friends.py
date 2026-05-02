"""Friendship response schemas."""

from pydantic import BaseModel


class FriendResponse(BaseModel):
    """Friendship data in responses."""

    id: int
    username: str
    avatar_url: str | None
    is_online: bool
    friendship_status: str
    is_requester: bool
