"""
Story CRUD API routes.
"""

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from db import crud
from db.database import get_db
from models import (
    StoryCreate,
    StoryListItem,
    StoryResponse,
    StoryUpdatePanels,
    UpdatePanelImageRequest,
)

router = APIRouter(prefix="/api", tags=["stories"])


@router.post("/stories", response_model=StoryResponse)
async def create_story(
    story: StoryCreate, db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Create a new story with profile and panels."""
    result = await crud.create_story(db, story, current_user["id"])
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create story")
    return result


@router.get("/stories", response_model=list[StoryListItem])
async def list_stories(db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Get all stories (summary view)."""
    return await crud.list_stories(db, current_user["id"])


@router.get("/stories/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: int, db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Get a single story with all its panels."""
    story = await crud.get_story_by_id(db, story_id, current_user["id"])
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
    result = await crud.update_story_panels(db, story_id, update, current_user["id"])
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
    success = await crud.update_panel_image(db, story_id, panel_order, update.image_base64, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Panel not found")
    return None


@router.delete("/stories/{story_id}", status_code=204)
async def delete_story(
    story_id: int, db: aiosqlite.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    """Delete a story and its panels."""
    deleted = await crud.delete_story(db, story_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Story not found")
    return None
