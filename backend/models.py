"""
Pydantic models for request/response validation.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# --- Auth Models ---
class SignupRequest(BaseModel):
    """Request body for user signup."""

    email: EmailStr
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    """Request body for user login."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class TokenResponse(BaseModel):
    """Response containing the authentication token."""

    access_token: str
    token_type: str = "bearer"


# --- User Models ---
class UserResponse(BaseModel):
    """User data in responses."""

    id: int
    email: str
    username: str
    avatar_url: str | None
    is_online: bool
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


# --- Friendship Models ---
class FriendResponse(BaseModel):
    """Friendship data in responses."""

    id: int
    username: str
    avatar_url: str | None
    is_online: bool
    friendship_status: str  # 'pending', 'accepted'
    is_requester: bool  # True if current user is the requester of the friendship


# --- Kid Profile Models ---
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
    photo_base64: str | None = None  # For multimodal character analysis
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


# --- Panel Models ---
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


# --- Story Models ---
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
    # Nested profile info
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
    # Nested objects
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


# --- Generation Request/Response Models ---
class GenerateStoryScriptRequest(BaseModel):
    """Request to generate a story script."""

    profile: KidProfileCreate


class GeneratedPanel(BaseModel):
    """A generated panel from the story script (also used as Gemini structured output schema)."""

    id: str = Field(description="Panel identifier, e.g. '1', '2', '3'")
    text: str = Field(description="The narrative text for this panel, 8-12 words")
    imagePrompt: str = Field(description="Detailed image prompt for this panel with cinematic direction")


class GenerateStoryScriptResponse(BaseModel):
    """Response containing the generated story script (also used as Gemini structured output schema)."""

    title: str = Field(description="The title of the comic book story")
    foreword: str = Field(description="A short foreword, max 30 words")
    characterDescription: str = Field(
        description=("Detailed description of all characters including their appearance and outfits")
    )
    coverImagePrompt: str = Field(description="Image prompt for the cover showing the hero and companion")
    panels: list[GeneratedPanel] = Field(description="List of story panels")


class GenerateAndSaveStoryRequest(BaseModel):
    """Generate script, images, and save story."""

    profile: KidProfileCreate


class GenerateAndSaveStoryResponse(BaseModel):
    """Complete story with images."""

    story: StoryResponse


class GeneratePanelImageRequest(BaseModel):
    """Request to generate a panel image."""

    prompt: str
    cast_guide: str
    style: str | None = None


class GeneratePanelImageResponse(BaseModel):
    """Response containing the generated image."""

    image_base64: str


class EditPanelImageRequest(BaseModel):
    """Request to edit a panel image."""

    image_base64: str
    original_prompt: str
    edit_prompt: str
    cast_guide: str
    style: str | None = None


class EditPanelImageResponse(BaseModel):
    """Response containing the edited image."""

    image_base64: str
