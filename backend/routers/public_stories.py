"""Public API routes for database-backed story access."""

import traceback

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from config import safe_error_detail
from db import stories_crud
from db.database import get_db
from llm.gemini_service import generate_panel_image as gen_panel_image
from llm.gemini_service import generate_story_script as gen_script
from metrics import stories_generation_in_progress, story_funnel_total
from public_api_auth import require_public_api_quota
from schemas import (
    GenerateAndSaveStoryRequest,
    GenerateAndSaveStoryResponse,
    GenerateStoryScriptRequest,
    GenerateStoryScriptResponse,
    PanelCreate,
    StoryCreate,
    StoryListItem,
    StoryResponse,
    StoryVisibilityUpdateRequest,
)

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
    result = await stories_crud.create_story(db, story, api_key_context["user_id"])
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to create story")
    return result


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


@router.post("/stories/preview", response_model=GenerateStoryScriptResponse)
async def preview_public_story(
    request: GenerateStoryScriptRequest,
    api_key_context: dict = Depends(require_public_api_quota),
):
    """Generate a story script preview (title, foreword, panel texts and image prompts) without saving."""
    story_funnel_total.labels(stage="public_preview", status="started").inc()
    stories_generation_in_progress.inc()
    try:
        result = await gen_script(profile=request.profile)
        story_funnel_total.labels(stage="public_preview", status="completed").inc()
        return result
    except Exception as e:
        story_funnel_total.labels(stage="public_preview", status="failed").inc()
        print(f"Public preview error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=safe_error_detail(e, "Story generation failed"))
    finally:
        stories_generation_in_progress.dec()


@router.post("/stories/generate", response_model=GenerateAndSaveStoryResponse)
async def generate_public_story(
    request: GenerateAndSaveStoryRequest,
    db: aiosqlite.Connection = Depends(get_db),
    api_key_context: dict = Depends(require_public_api_quota),
):
    """Generate full story (script + cover + panel images) and save it under the API key owner."""
    story_funnel_total.labels(stage="public_pipeline", status="started").inc()
    stories_generation_in_progress.inc()
    try:
        try:
            result = await gen_script(profile=request.profile)
        except Exception as e:
            story_funnel_total.labels(stage="public_pipeline_script", status="failed").inc()
            print(f"Public story script error: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=safe_error_detail(e, "Story generation failed"))

        all_panels = result["panels"]
        art_style = request.profile.art_style
        char_desc = result["characterDescription"]

        try:
            cover_image_base64 = await gen_panel_image(
                prompt=result["coverImagePrompt"],
                cast_guide=char_desc,
                style=art_style,
            )
            panel_images: dict[int, str] = {}
            for i in range(len(all_panels)):
                panel_images[i] = await gen_panel_image(
                    prompt=all_panels[i]["imagePrompt"],
                    cast_guide=char_desc,
                    style=art_style,
                )
        except Exception as e:
            story_funnel_total.labels(stage="public_pipeline_images", status="failed").inc()
            print(f"Public story image error: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=safe_error_detail(e, "Image generation failed"))

        try:
            story_data = StoryCreate(
                profile=request.profile,
                title=result["title"],
                foreword=result["foreword"],
                character_description=result["characterDescription"],
                cover_image_prompt=result["coverImagePrompt"],
                cover_image_base64=cover_image_base64,
                panels=[
                    PanelCreate(
                        panel_order=idx,
                        text=p["text"],
                        image_prompt=p["imagePrompt"],
                        image_base64=panel_images.get(idx),
                    )
                    for idx, p in enumerate(all_panels)
                ],
            )
            saved = await stories_crud.create_story(db, story_data, api_key_context["user_id"])
        except Exception as e:
            story_funnel_total.labels(stage="public_pipeline_save", status="failed").inc()
            print(f"Public story save error: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Failed to save story")

        if saved is None:
            raise HTTPException(status_code=500, detail="Failed to save story")

        story_funnel_total.labels(stage="public_pipeline", status="completed").inc()
        return GenerateAndSaveStoryResponse(story=saved)
    finally:
        stories_generation_in_progress.dec()


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
