"""Public API routes for database-backed story access."""

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from db import stories_crud
from db.database import get_db
from public_api_auth import require_public_api_quota
from schemas import StoryCreate, StoryListItem, StoryResponse, StoryVisibilityUpdateRequest

router = APIRouter(prefix="/api/public", tags=["public-api"])


@router.get("/stories", response_model=list[StoryListItem])
async def list_public_stories(
    db: aiosqlite.Connection = Depends(get_db),
    api_key_context: dict = Depends(require_public_api_quota),
):
    """List stories owned by the API key owner."""
    return await stories_crud.list_stories(db, api_key_context["user_id"])


@router.get("/stories/{story_id}", response_model=StoryResponse)
async def get_public_story(
    story_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    api_key_context: dict = Depends(require_public_api_quota),
):
    """Get one story owned by the API key owner."""
    story = await stories_crud.get_story_by_id(db, story_id, api_key_context["user_id"])
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.post("/stories", response_model=StoryResponse)
async def create_public_story(
    story: StoryCreate,
    db: aiosqlite.Connection = Depends(get_db),
    api_key_context: dict = Depends(require_public_api_quota),
):
    """Create a story owned by the API key owner."""
    return await stories_crud.create_story(db, story, api_key_context["user_id"])


@router.put("/stories/{story_id}/visibility", response_model=StoryResponse)
async def update_public_story_visibility(
    story_id: int,
    update: StoryVisibilityUpdateRequest,
    db: aiosqlite.Connection = Depends(get_db),
    api_key_context: dict = Depends(require_public_api_quota),
):
    """Update visibility for one story owned by the API key owner."""
    result = await stories_crud.update_story_visibility(
        db,
        story_id,
        api_key_context["user_id"],
        update.visibility,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return result


@router.delete("/stories/{story_id}", status_code=204)
async def delete_public_story(
    story_id: int,
    db: aiosqlite.Connection = Depends(get_db),
    api_key_context: dict = Depends(require_public_api_quota),
):
    """Delete one story owned by the API key owner."""
    deleted = await stories_crud.delete_story(db, story_id, api_key_context["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Story not found")
    return None
