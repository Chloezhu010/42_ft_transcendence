"""
Gemini API service for story and image generation.
"""

import asyncio
import base64
import os
import random
import time
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

from llm.streaming import StoryIntroStreamer
from metrics import gemini_failures_total, gemini_request_duration_seconds
from schemas import GenerateStoryScriptResponse, KidProfileCreate

STORY_SCRIPT_MODEL = "gemini-3-flash-preview"
INTRO_FIELDS: tuple[str, ...] = ("title", "foreword")

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

# Client is initialized lazily on first use so importing this module
# in test environments (where GEMINI_API_KEY is unset) doesn't crash.
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


ART_STYLES = {
    "Watercolor": "Soft dreamy watercolor with gentle washes, visible paper texture, no heavy outlines.",
    "Pencil Sketch": "Hand-drawn colored pencil sketch with visible strokes and soft pastel colors.",
    "Digital Pop": "Vibrant modern digital vector art with clean lines, flat bold colors, high contrast.",
}
DEFAULT_STYLE = (
    "Bold black ink outlines, vibrant flat colors, clean cel-shading. No 3D, no gradients, no text in images."
)

LANGUAGE_LABELS = {
    "en": "English",
    "fr": "French",
    "es": "Spanish",
    "zh": "Chinese",
    "ja": "Japanese",
    "ar": "Arabic",
}


def get_style_prompt(style: str | None) -> str:
    return ART_STYLES.get(style, DEFAULT_STYLE)


def extract_image_from_response(response) -> str:
    """Extract base64 image from Gemini response.

    Args:
        response: The Gemini API response object

    Returns:
        Base64 encoded image string

    Raises:
        ValueError: If no image is found in the response
    """
    if not response.candidates:
        raise ValueError("No candidates in response - prompt may have been blocked")

    for part in response.candidates[0].content.parts:
        if part.inline_data:
            return base64.b64encode(part.inline_data.data).decode("utf-8")

    # Log the text response if no image was generated
    text_parts = [p.text for p in response.candidates[0].content.parts if hasattr(p, "text") and p.text]
    if text_parts:
        print(f"Gemini returned text instead of image: {text_parts}")
        raise ValueError(f"No image generated. Model response: {text_parts[0][:200]}")

    raise ValueError("Failed to generate image - no image data in response")


async def with_retry(fn, max_retries: int = 3, base_delay: float = 2.0):
    """Retry utility with exponential backoff for rate limit and server errors."""
    last_error = None
    for i in range(max_retries):
        try:
            return await fn()
        except Exception as err:
            last_error = err
            error_msg = str(err)
            is_rate_limit = "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg
            is_server_error = "503" in error_msg or "UNAVAILABLE" in error_msg or "overloaded" in error_msg.lower()
            if (is_rate_limit or is_server_error) and i < max_retries - 1:
                delay = base_delay * (2**i) + random.random()
                error_type = "Rate limit" if is_rate_limit else "Server overloaded"
                print(f"{error_type}. Retrying in {delay:.1f}s... (Attempt {i + 1}/{max_retries})")
                await asyncio.sleep(delay)
                continue
            raise err
    raise last_error


def _build_story_script_prompt(profile: KidProfileCreate) -> str:
    """Build the Gemini prompt used for both batch and streaming generation."""
    if profile.photo_base64:
        hero_desc = f"The child in the attached photo ({profile.gender})"
    else:
        hero_desc = (
            f"A {profile.gender} child with {profile.skin_tone} skin, "
            f"{profile.hair_color} hair, {profile.eye_color} eyes"
        )
    theme = f"{profile.archetype or 'adventure'} adventure about {profile.dream or 'discovering something amazing'}"

    language_code = (profile.language or "").strip().lower()
    language_name = LANGUAGE_LABELS.get(language_code, "")
    language_instruction = ""
    if language_name and language_code != "en":
        language_instruction = (
            f"LANGUAGE REQUIREMENT: Write ALL story text (title, foreword, panel text) in {language_name} only. "
            "Do not use English in story text. "
            "Keep characterDescription, coverImagePrompt, and imagePrompt in English.\n"
        )

    return f"""{language_instruction}Create a 10-panel children's comic story. Simple vocabulary, 6-10 words per panel.

HERO: {hero_desc}, depicted as a 5-6 year old. Do NOT age up.
THEME: {theme}. Favorite color: {profile.favorite_color}. Art style: {profile.art_style or "classic comic"}.
STRUCTURE: Panels 1-3 setup, 4-7 conflict, 8-10 resolution.

In characterDescription, describe the hero + a companion with physical traits and outfits for visual consistency.
In coverImagePrompt, use a dynamic cinematic composition (no side-by-side posing).
In each panel imagePrompt, use cinematic angles and show characters interacting — NEVER facing the camera.
Foreword: max 30 words. Use hero's name "{profile.name}" only in story text, not image prompts."""


def _build_story_script_contents(prompt: str, photo_base64: str | None) -> list | str:
    """Wrap the text prompt with an optional reference photo part."""
    if not photo_base64:
        return prompt
    image_data = types.Part.from_bytes(
        data=base64.b64decode(photo_base64),
        mime_type="image/png",
    )
    return [image_data, prompt]


_STORY_SCRIPT_CONFIG: dict[str, Any] = {
    "response_mime_type": "application/json",
    "response_schema": GenerateStoryScriptResponse,
}


async def generate_story_script(
    profile: KidProfileCreate,
) -> dict:
    """Generate a 10-panel story script."""

    prompt = _build_story_script_prompt(profile)
    contents = _build_story_script_contents(prompt, profile.photo_base64)

    async def _generate() -> dict:
        response = await _get_client().aio.models.generate_content(
            model=STORY_SCRIPT_MODEL,
            contents=contents,
            config=_STORY_SCRIPT_CONFIG,
        )
        result = GenerateStoryScriptResponse.model_validate_json(response.text)
        return result.model_dump()

    start = time.perf_counter()
    try:
        result = await with_retry(_generate)
        gemini_request_duration_seconds.labels(operation="script").observe(time.perf_counter() - start)
        return result
    except Exception:
        gemini_failures_total.labels(operation="script").inc()
        raise


async def generate_story_script_stream(
    profile: KidProfileCreate,
) -> AsyncIterator[dict]:
    """Stream a 10-panel story script.

    Yields a sequence of event dicts as Gemini emits JSON text:

    * ``{"type": "intro_delta", "field": "title" | "foreword", "delta": "..."}``
      for each chunk of the story title or foreword.
    * ``{"type": "script", "script": <full script dict>}`` once the complete
      structured response has been validated.

    Gemini streaming cannot be transparently retried after the first chunk has
    been yielded, so this generator intentionally does not wrap itself in
    :func:`with_retry`. Callers should fall back to
    :func:`generate_story_script` if they need retry semantics.
    """
    prompt = _build_story_script_prompt(profile)
    contents = _build_story_script_contents(prompt, profile.photo_base64)

    start = time.perf_counter()
    try:
        response_stream = await _get_client().aio.models.generate_content_stream(
            model=STORY_SCRIPT_MODEL,
            contents=contents,
            config=_STORY_SCRIPT_CONFIG,
        )

        streamer = StoryIntroStreamer(INTRO_FIELDS)
        raw_json = ""

        async for chunk in response_stream:
            text = chunk.text
            if not text:
                continue
            raw_json += text
            for event in streamer.feed(text):
                yield {
                    "type": "intro_delta",
                    "field": event.field,
                    "delta": event.delta,
                }

        result = GenerateStoryScriptResponse.model_validate_json(raw_json)
        yield {"type": "script", "script": result.model_dump()}
        gemini_request_duration_seconds.labels(operation="script_stream").observe(time.perf_counter() - start)
    except Exception:
        gemini_failures_total.labels(operation="script_stream").inc()
        raise


async def generate_panel_image(prompt: str, cast_guide: str, style: str | None = None) -> str:
    """Generate a comic panel image, returns base64 encoded image."""

    async def _generate():
        full_prompt = f"""Children's comic panel. {get_style_prompt(style)}
Characters: {cast_guide}. Hero is a 5-6 year old child — do NOT age up.
Scene: {prompt}.
Cinematic angles, characters interact with each other/world — NEVER face the camera. Full-bleed, borderless."""

        response = await _get_client().aio.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["image", "text"],
            ),
        )

        return extract_image_from_response(response)

    start = time.perf_counter()
    try:
        result = await with_retry(_generate)
        gemini_request_duration_seconds.labels(operation="panel_image").observe(time.perf_counter() - start)
        return result
    except Exception:
        gemini_failures_total.labels(operation="panel_image").inc()
        raise


async def edit_panel_image(
    image_base64: str,
    original_prompt: str,
    edit_prompt: str,
    cast_guide: str,
    style: str | None = None,
) -> str:
    """Edit an existing comic panel image, returns base64 encoded image."""

    async def _generate():
        cast_note = f" Maintain character consistency: {cast_guide}." if cast_guide and cast_guide.strip() else ""
        full_prompt = f"""Edit this comic panel. Original scene: {original_prompt}
Requested edit: {edit_prompt}
{get_style_prompt(style)}{cast_note}
Preserve composition and style. Characters must NOT face the camera."""

        # Prepare image data
        image_data = types.Part.from_bytes(
            data=base64.b64decode(image_base64),
            mime_type="image/png",
        )

        response = await _get_client().aio.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=[image_data, full_prompt],
            config=types.GenerateContentConfig(
                response_modalities=["image", "text"],
            ),
        )

        return extract_image_from_response(response)

    start = time.perf_counter()
    try:
        result = await with_retry(_generate)
        gemini_request_duration_seconds.labels(operation="edit").observe(time.perf_counter() - start)
        return result
    except Exception:
        gemini_failures_total.labels(operation="edit").inc()
        raise
