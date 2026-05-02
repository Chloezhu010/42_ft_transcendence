"""
AI generation API routes (story scripts, panel images).
"""

import json
import traceback
from collections.abc import AsyncIterator

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from auth_utils import get_current_user
from config import safe_error_detail
from db import stories_crud
from db.database import get_db
from llm.gemini_service import (
    edit_panel_image as edit_image,
)
from llm.gemini_service import (
    generate_panel_image as gen_panel_image,
)
from llm.gemini_service import (
    generate_story_script as gen_script,
)
from llm.gemini_service import (
    generate_story_script_stream as gen_script_stream,
)
from metrics import stories_generation_in_progress, story_funnel_total
from schemas import (
    EditPanelImageRequest,
    EditPanelImageResponse,
    GenerateAndSaveStoryRequest,
    GenerateAndSaveStoryResponse,
    GeneratePanelImageRequest,
    GeneratePanelImageResponse,
    GenerateStoryScriptRequest,
    GenerateStoryScriptResponse,
    PanelCreate,
    StoryCreate,
)
from services.rate_limit import generation_rate_limiter

# NDJSON = newline-delimited JSON. Each line is a standalone JSON object, which
# makes it straightforward for the frontend to parse events incrementally.
NDJSON_MEDIA_TYPE = "application/x-ndjson"

router = APIRouter(prefix="/api", tags=["generation"])


async def require_generation_quota(current_user: dict = Depends(get_current_user)) -> dict:
    """Apply per-user quota before starting expensive Gemini work."""
    decision = await generation_rate_limiter.check(f"user:{current_user['id']}")
    if decision.allowed:
        return current_user

    raise HTTPException(
        status_code=429,
        detail="Generation rate limit exceeded. Please try again later.",
        headers={"Retry-After": str(decision.retry_after_seconds)},
    )


@router.post("/stories/generate", response_model=GenerateAndSaveStoryResponse)
async def generate_and_save_story(
    request: GenerateAndSaveStoryRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(require_generation_quota),
):
    """Generate story script + images and save to DB."""
    story_funnel_total.labels(stage="pipeline", status="started").inc()
    stories_generation_in_progress.inc()
    try:
        # 1. Generate story script via Gemini
        try:
            result = await gen_script(profile=request.profile)
        except Exception as e:
            story_funnel_total.labels(stage="pipeline_script", status="failed").inc()
            print(f"Story script generation error: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=safe_error_detail(e, "Story generation failed"))

        # 2. Generate images (cover + all panels)
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
            story_funnel_total.labels(stage="pipeline_images", status="failed").inc()
            print(f"Image generation error: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=safe_error_detail(e, "Image generation failed"))

        # 3. Save story to DB with images
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
            saved = await stories_crud.create_story(db, story_data, current_user["id"])
        except Exception as e:
            story_funnel_total.labels(stage="pipeline_save", status="failed").inc()
            print(f"Story save error: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Failed to save story")

        story_funnel_total.labels(stage="pipeline", status="completed").inc()
        return GenerateAndSaveStoryResponse(story=saved)
    finally:
        stories_generation_in_progress.dec()


@router.post("/generate/story-script", response_model=GenerateStoryScriptResponse)
async def generate_story_script(
    request: GenerateStoryScriptRequest,
    current_user: dict = Depends(require_generation_quota),
):
    """Generate a story script using Gemini AI."""
    story_funnel_total.labels(stage="script_sync", status="started").inc()
    stories_generation_in_progress.inc()
    try:
        result = await gen_script(profile=request.profile)
        story_funnel_total.labels(stage="script_sync", status="completed").inc()
        return result
    except Exception as e:
        story_funnel_total.labels(stage="script_sync", status="failed").inc()
        print(f"Story script generation error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=safe_error_detail(e, "Story generation failed"))
    finally:
        stories_generation_in_progress.dec()


async def _stream_story_script_events(
    request: GenerateStoryScriptRequest,
) -> AsyncIterator[bytes]:
    """Yield NDJSON lines for the streaming story-script endpoint.

    Errors are surfaced as a final ``{"type": "error", ...}`` event rather
    than an HTTP failure, because headers are already on the wire by the time
    Gemini might reject a request mid-stream.
    """
    story_funnel_total.labels(stage="script_stream", status="started").inc()
    stories_generation_in_progress.inc()
    try:
        async for event in gen_script_stream(profile=request.profile):
            yield (json.dumps(event) + "\n").encode("utf-8")
        story_funnel_total.labels(stage="script_stream", status="completed").inc()
    except Exception as err:
        story_funnel_total.labels(stage="script_stream", status="failed").inc()
        print(f"Streaming story script error: {err}")
        traceback.print_exc()
        error_event = {
            "type": "error",
            "message": safe_error_detail(err, "Story generation failed"),
        }
        yield (json.dumps(error_event) + "\n").encode("utf-8")
    finally:
        stories_generation_in_progress.dec()


@router.post("/generate/story-script/stream")
async def generate_story_script_stream_endpoint(
    request: GenerateStoryScriptRequest,
    current_user: dict = Depends(require_generation_quota),
) -> StreamingResponse:
    """Stream story-script generation as NDJSON events.

    The response is a sequence of newline-delimited JSON objects. Each line
    is one of:

    * ``{"type": "intro_delta", "field": "title" | "foreword", "delta": "..."}``
    * ``{"type": "script", "script": <GenerateStoryScriptResponse>}``
    * ``{"type": "error", "message": "..."}``
    """
    return StreamingResponse(
        _stream_story_script_events(request),
        media_type=NDJSON_MEDIA_TYPE,
        headers={"X-Accel-Buffering": "no"},
    )


@router.post("/generate/panel-image", response_model=GeneratePanelImageResponse)
async def generate_panel_image_endpoint(
    request: GeneratePanelImageRequest,
    current_user: dict = Depends(require_generation_quota),
):
    """Generate a comic panel image using Gemini AI."""
    try:
        image_base64 = await gen_panel_image(
            prompt=request.prompt,
            cast_guide=request.cast_guide,
            style=request.style,
        )
        return {"image_base64": image_base64}
    except Exception as e:
        print(f"Panel image generation error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=safe_error_detail(e, "Image generation failed"))


@router.post("/generate/edit-image", response_model=EditPanelImageResponse)
async def edit_panel_image_endpoint(
    request: EditPanelImageRequest,
    current_user: dict = Depends(require_generation_quota),
):
    """Edit an existing comic panel image using Gemini AI."""
    try:
        image_base64 = await edit_image(
            image_base64=request.image_base64,
            original_prompt=request.original_prompt,
            edit_prompt=request.edit_prompt,
            cast_guide=request.cast_guide,
            style=request.style,
        )
        return {"image_base64": image_base64}
    except Exception as e:
        print(f"Edit image error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=safe_error_detail(e, "Image editing failed"))
