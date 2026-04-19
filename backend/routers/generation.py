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
from db import crud
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
from models import (
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

# NDJSON = newline-delimited JSON. Each line is a standalone JSON object, which
# makes it straightforward for the frontend to parse events incrementally.
NDJSON_MEDIA_TYPE = "application/x-ndjson"

router = APIRouter(prefix="/api", tags=["generation"])


@router.post("/stories/generate", response_model=GenerateAndSaveStoryResponse)
async def generate_and_save_story(
    request: GenerateAndSaveStoryRequest,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate story script + images and save to DB."""
    # 1. Generate story script via Gemini
    try:
        result = await gen_script(profile=request.profile)
    except Exception as e:
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
        saved = await crud.create_story(db, story_data, current_user["id"])
    except Exception as e:
        print(f"Story save error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to save story")

    return GenerateAndSaveStoryResponse(story=saved)


@router.post("/generate/story-script", response_model=GenerateStoryScriptResponse)
async def generate_story_script(
    request: GenerateStoryScriptRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate a story script using Gemini AI."""
    try:
        result = await gen_script(profile=request.profile)
        return result
    except Exception as e:
        print(f"Story script generation error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=safe_error_detail(e, "Story generation failed"))


async def _stream_story_script_events(
    request: GenerateStoryScriptRequest,
) -> AsyncIterator[bytes]:
    """Yield NDJSON lines for the streaming story-script endpoint.

    Errors are surfaced as a final ``{"type": "error", ...}`` event rather
    than an HTTP failure, because headers are already on the wire by the time
    Gemini might reject a request mid-stream.
    """
    try:
        async for event in gen_script_stream(profile=request.profile):
            yield (json.dumps(event) + "\n").encode("utf-8")
    except Exception as err:
        print(f"Streaming story script error: {err}")
        traceback.print_exc()
        error_event = {
            "type": "error",
            "message": safe_error_detail(err, "Story generation failed"),
        }
        yield (json.dumps(error_event) + "\n").encode("utf-8")


@router.post("/generate/story-script/stream")
async def generate_story_script_stream_endpoint(
    request: GenerateStoryScriptRequest,
    current_user: dict = Depends(get_current_user),
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
    current_user: dict = Depends(get_current_user),
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
    current_user: dict = Depends(get_current_user),
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
