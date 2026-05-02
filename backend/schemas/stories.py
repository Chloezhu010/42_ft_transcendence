"""Story and comic panel schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class KidProfileCreate(BaseModel):
    """Input for creating a kid profile."""

    name: str
    gender: Literal["boy", "girl", "neutral"]
    skin_tone: str
    hair_color: str
    eye_color: str
    favorite_color: str
    dream: str | None = None
    archetype: str | None = None
    art_style: str | None = None
    photo_base64: str | None = None
    language: str | None = None


class KidProfileResponse(BaseModel):
    """Kid profile in responses."""

    id: int
    name: str
    gender: str
    skin_tone: str
    hair_color: str
    eye_color: str
    favorite_color: str
    dream: str | None = None
    archetype: str | None = None
    art_style: str | None = None
    language: str | None = None
    created_at: datetime


class PanelCreate(BaseModel):
    """Panel data for saving."""

    panel_order: int
    text: str
    image_prompt: str | None = None
    image_base64: str | None = None


class PanelResponse(BaseModel):
    """Panel data in response."""

    id: int
    panel_order: int
    text: str
    image_prompt: str | None = None
    image_url: str | None = None


class StoryCreate(BaseModel):
    """Complete story data for saving."""

    profile: KidProfileCreate
    title: str | None = None
    foreword: str | None = None
    character_description: str | None = None
    cover_image_prompt: str | None = None
    cover_image_base64: str | None = None
    panels: list[PanelCreate] = []


StoryVisibility = Literal["private", "shared_with_friends"]


class StoryListItem(BaseModel):
    """Story summary for list view."""

    id: int
    title: str | None = None
    cover_image_url: str | None = None
    visibility: StoryVisibility = "private"
    is_unlocked: bool = True
    created_at: datetime
    profile: KidProfileResponse


class StoryResponse(BaseModel):
    """Full story details."""

    id: int
    title: str | None = None
    foreword: str | None = None
    character_description: str | None = None
    cover_image_prompt: str | None = None
    cover_image_url: str | None = None
    visibility: StoryVisibility = "private"
    is_unlocked: bool = True
    created_at: datetime
    updated_at: datetime
    profile: KidProfileResponse
    panels: list[PanelResponse] = []


class StoryUpdatePanels(BaseModel):
    """Request to update story panels."""

    is_unlocked: bool = True
    panels: list[PanelCreate] = []
    cover_image_base64: str | None = None


class UpdatePanelImageRequest(BaseModel):
    """Request to update a single panel's image."""

    image_base64: str


class StoryVisibilityUpdateRequest(BaseModel):
    """Request to update story sharing visibility."""

    visibility: StoryVisibility
