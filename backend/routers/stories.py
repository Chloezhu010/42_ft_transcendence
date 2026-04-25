"""
Story CRUD API routes.
"""

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from db import stories_crud
from db.database import get_db
from metrics import story_funnel_total
from db.friendships_crud import has_accepted_friendship
from db.users_crud import get_user_by_id
from schemas import (
    StoryCreate,
    StoryListItem,
    StoryResponse,
    StoryUpdatePanels,
    StoryVisibilityUpdateRequest,
    UpdatePanelImageRequest,
)

router = APIRouter(prefix="/api", tags=["stories"])


@router.post("/stories", response_model=StoryResponse)
async def create_story(
    story: StoryCreate, db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Create a new story with profile and panels."""
    story_funnel_total.labels(stage="save", status="started").inc()
    result = await stories_crud.create_story(db, story, current_user["id"])
    if not result:
        story_funnel_total.labels(stage="save", status="failed").inc()
        raise HTTPException(status_code=500, detail="Failed to create story")
    story_funnel_total.labels(stage="save", status="completed").inc()
    return result


@router.get("/stories", response_model=list[StoryListItem])
async def list_stories(db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get all stories (summary view)."""
    return await stories_crud.list_stories(db, current_user["id"])


@router.get("/stories/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: int, db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Get a single story with all its panels."""
    story = await stories_crud.get_story_by_id(db, story_id, current_user["id"])
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.patch("/stories/{story_id}", response_model=StoryResponse)
async def update_story(
    story_id: int,
    update: StoryUpdatePanels,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update story panels."""
    result = await stories_crud.update_story_panels(db, story_id, update, current_user["id"])
    if not result:
        raise HTTPException(status_code=404, detail="Story not found")
    return result


@router.patch("/stories/{story_id}/visibility", response_model=StoryResponse)
async def update_story_visibility(
    story_id: int,
    update: StoryVisibilityUpdateRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update the sharing visibility for one owned story."""
    result = await stories_crud.update_story_visibility(db, story_id, current_user["id"], update.visibility)
    if not result:
        raise HTTPException(status_code=404, detail="Story not found")
    return result


@router.patch("/stories/{story_id}/panels/{panel_order}", status_code=204)
async def update_panel_image(
    story_id: int,
    panel_order: int,
    update: UpdatePanelImageRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a single panel's image after editing."""
    success = await stories_crud.update_panel_image(db, story_id, panel_order, update.image_base64, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Panel not found")
    return None


@router.delete("/stories/{story_id}", status_code=204)
async def delete_story(
    story_id: int, db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Delete a story and its panels."""
    deleted = await stories_crud.delete_story(db, story_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Story not found")
    return None


async def _ensure_friend_can_browse_owner_library(
    db: aiosqlite.Connection, requester_user_id: int, owner_user_id: int
) -> None:
    """Enforce friend-library access without leaking whether the owner exists."""
    if requester_user_id == owner_user_id:
        raise HTTPException(status_code=404, detail="Story not found")

    owner = await get_user_by_id(db, owner_user_id)
    is_friend = await has_accepted_friendship(db, requester_user_id, owner_user_id)
    if owner is None or not is_friend:
        raise HTTPException(status_code=404, detail="Story not found")


@router.get("/friends/{owner_user_id}/stories", response_model=list[StoryListItem])
async def list_friend_shared_stories(
    owner_user_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List stories shared by one accepted friend."""
    await _ensure_friend_can_browse_owner_library(db, current_user["id"], owner_user_id)
    return await stories_crud.list_shared_stories_for_friend(db, owner_user_id)


@router.get("/friends/{owner_user_id}/stories/{story_id}", response_model=StoryResponse)
async def get_friend_shared_story(
    owner_user_id: int,
    story_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Load one story that an accepted friend shared."""
    await _ensure_friend_can_browse_owner_library(db, current_user["id"], owner_user_id)
    story = await stories_crud.get_shared_story_by_id(db, story_id, owner_user_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story
