"""
AI generation API routes (story scripts, panel images).
"""
import traceback

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

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

router = APIRouter(prefix="/api", tags=["generation"])


@router.post("/stories/generate", response_model=GenerateAndSaveStoryResponse)
async def generate_and_save_story(
    request: GenerateAndSaveStoryRequest,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Generate story script + images and save to DB."""
    # 1. Generate story script via Gemini
    try:
        result = await gen_script(
            name=request.profile.name,
            gender=request.profile.gender,
            skin_tone=request.profile.skin_tone,
            hair_color=request.profile.hair_color,
            eye_color=request.profile.eye_color,
            favorite_color=request.profile.favorite_color,
            dream=request.profile.dream,
            archetype=request.profile.archetype,
            art_style=request.profile.art_style,
            photo_base64=request.profile.photo_base64,
        )
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
        saved = await crud.create_story(db, story_data)
    except Exception as e:
        print(f"Story save error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to save story")

    return GenerateAndSaveStoryResponse(story=saved)


@router.post("/generate/story-script", response_model=GenerateStoryScriptResponse)
async def generate_story_script(
    request: GenerateStoryScriptRequest,
):
    """Generate a story script using Gemini AI."""
    try:
        result = await gen_script(
            name=request.profile.name,
            gender=request.profile.gender,
            skin_tone=request.profile.skin_tone,
            hair_color=request.profile.hair_color,
            eye_color=request.profile.eye_color,
            favorite_color=request.profile.favorite_color,
            dream=request.profile.dream,
            archetype=request.profile.archetype,
            art_style=request.profile.art_style,
            photo_base64=request.profile.photo_base64,
        )
        return result
    except Exception as e:
        print(f"Story script generation error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=safe_error_detail(e, "Story generation failed"))


@router.post("/generate/panel-image", response_model=GeneratePanelImageResponse)
async def generate_panel_image_endpoint(
    request: GeneratePanelImageRequest,
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
