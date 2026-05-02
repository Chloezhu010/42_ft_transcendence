"""CRUD operations for stories."""

import aiosqlite

from db.kid_profiles_crud import create_kid_profile, get_kid_profile
from db.panels_crud import create_panels, get_panels_for_story
from schemas.stories import (
    KidProfileResponse,
    PanelResponse,
    StoryCreate,
    StoryListItem,
    StoryResponse,
    StoryUpdatePanels,
    StoryVisibility,
)
from services.image_storage import delete_local_image, save_base64_image


def _build_story_response(row, profile: KidProfileResponse, panels: list[PanelResponse]) -> StoryResponse:
    """Map a story row plus related entities into the response model."""
    return StoryResponse(
        id=row["id"],
        title=row["title"],
        foreword=row["foreword"],
        character_description=row["character_description"],
        cover_image_prompt=row["cover_image_prompt"],
        cover_image_url=row["cover_image_path"],
        visibility=row["visibility"],
        is_unlocked=bool(row["is_unlocked"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        profile=profile,
        panels=panels,
    )


async def create_story(db: aiosqlite.Connection, story: StoryCreate, user_id: int) -> StoryResponse:
    """Create a story with profile and panels."""
    profile_id = await create_kid_profile(db, story.profile, user_id)

    cover_filename = None
    if story.cover_image_base64:
        cover_filename = save_base64_image(story.cover_image_base64, "cover")

    cursor = await db.execute(
        """
        INSERT INTO stories (
            kid_profile_id, title, foreword, character_description,
            cover_image_prompt, cover_image_path, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        (
            profile_id,
            story.title,
            story.foreword,
            story.character_description,
            story.cover_image_prompt,
            cover_filename,
            user_id,
        ),
    )
    await db.commit()

    story_id = cursor.lastrowid
    await create_panels(db, story_id, story.panels)

    return await get_story_by_id(db, story_id, user_id)


async def get_story_by_id(db: aiosqlite.Connection, story_id: int, user_id: int) -> StoryResponse | None:
    """Get a complete story with profile and panels."""
    cursor = await db.execute("SELECT * FROM stories WHERE id = ? AND user_id = ?", (story_id, user_id))
    row = await cursor.fetchone()
    if not row:
        return None

    profile = await get_kid_profile(db, row["kid_profile_id"])
    panels = await get_panels_for_story(db, story_id)
    return _build_story_response(row, profile, panels)


async def list_stories(db: aiosqlite.Connection, user_id: int) -> list[StoryListItem]:
    """Get all stories with summary info."""
    cursor = await db.execute(
        """
        SELECT id, title, cover_image_path, visibility, is_unlocked, created_at, kid_profile_id
        FROM stories
        WHERE user_id = ?
        ORDER BY created_at DESC
    """,
        (user_id,),
    )
    rows = await cursor.fetchall()

    results = []
    for row in rows:
        profile = await get_kid_profile(db, row["kid_profile_id"])
        results.append(
            StoryListItem(
                id=row["id"],
                title=row["title"],
                cover_image_url=row["cover_image_path"],
                visibility=row["visibility"],
                is_unlocked=bool(row["is_unlocked"]),
                created_at=row["created_at"],
                profile=profile,
            )
        )
    return results


async def delete_story(db: aiosqlite.Connection, story_id: int, user_id: int) -> bool:
    """Delete a story and its associated images."""
    cursor = await db.execute("SELECT cover_image_path FROM stories WHERE id = ? AND user_id = ?", (story_id, user_id))
    story_row = await cursor.fetchone()
    if not story_row:
        return False

    panel_cursor = await db.execute("SELECT image_path FROM panels WHERE story_id = ?", (story_id,))
    panel_rows = await panel_cursor.fetchall()

    image_paths = []
    if story_row["cover_image_path"]:
        image_paths.append(story_row["cover_image_path"])
    for row in panel_rows:
        if row["image_path"]:
            image_paths.append(row["image_path"])

    await db.execute("DELETE FROM stories WHERE id = ? AND user_id = ?", (story_id, user_id))
    await db.commit()

    for path in image_paths:
        delete_local_image(path)

    return True


async def update_story_panels(
    db: aiosqlite.Connection, story_id: int, update: StoryUpdatePanels, user_id: int
) -> StoryResponse | None:
    """Update story and panel images."""
    cursor = await db.execute("SELECT id FROM stories WHERE id = ? AND user_id = ?", (story_id, user_id))
    row = await cursor.fetchone()
    if not row:
        return None

    await db.execute(
        """
        UPDATE stories
        SET is_unlocked = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """,
        (update.is_unlocked, story_id),
    )

    if update.cover_image_base64:
        cover_filename = save_base64_image(update.cover_image_base64, "cover")
        if cover_filename:
            await db.execute(
                """
                UPDATE stories SET cover_image_path = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """,
                (cover_filename, story_id),
            )

    for panel in update.panels:
        if panel.image_base64:
            panel_filename = save_base64_image(panel.image_base64, f"panel_{story_id}")
            await db.execute(
                """
                UPDATE panels
                SET image_path = ?
                WHERE story_id = ? AND panel_order = ?
            """,
                (panel_filename, story_id, panel.panel_order),
            )

    await db.commit()
    return await get_story_by_id(db, story_id, user_id)


async def update_panel_image(
    db: aiosqlite.Connection, story_id: int, panel_order: int, image_base64: str, user_id: int
) -> bool:
    """Update a single panel's image."""
    cursor = await db.execute(
        """
        SELECT p.id FROM panels p
        JOIN stories s ON p.story_id = s.id
        WHERE p.story_id = ? AND p.panel_order = ? AND s.user_id = ?
    """,
        (story_id, panel_order, user_id),
    )
    row = await cursor.fetchone()
    if not row:
        return False

    panel_filename = save_base64_image(image_base64, f"panel_{story_id}")
    await db.execute(
        """
        UPDATE panels
        SET image_path = ?
        WHERE story_id = ? AND panel_order = ?
    """,
        (panel_filename, story_id, panel_order),
    )

    await db.execute(
        """
        UPDATE stories
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """,
        (story_id,),
    )

    await db.commit()
    return True


async def update_story_visibility(
    db: aiosqlite.Connection, story_id: int, user_id: int, visibility: StoryVisibility
) -> StoryResponse | None:
    """Update the sharing visibility of an owned story."""
    cursor = await db.execute("SELECT id FROM stories WHERE id = ? AND user_id = ?", (story_id, user_id))
    if await cursor.fetchone() is None:
        return None

    await db.execute(
        """
        UPDATE stories
        SET visibility = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
        """,
        (visibility, story_id, user_id),
    )
    await db.commit()
    return await get_story_by_id(db, story_id, user_id)


async def list_shared_stories_for_friend(db: aiosqlite.Connection, owner_user_id: int) -> list[StoryListItem]:
    """List all friend-shared stories for a given owner."""
    cursor = await db.execute(
        """
        SELECT id, title, cover_image_path, visibility, is_unlocked, created_at, kid_profile_id
        FROM stories
        WHERE user_id = ? AND visibility = 'shared_with_friends'
        ORDER BY created_at DESC
        """,
        (owner_user_id,),
    )
    rows = await cursor.fetchall()

    results = []
    for row in rows:
        profile = await get_kid_profile(db, row["kid_profile_id"])
        results.append(
            StoryListItem(
                id=row["id"],
                title=row["title"],
                cover_image_url=row["cover_image_path"],
                visibility=row["visibility"],
                is_unlocked=bool(row["is_unlocked"]),
                created_at=row["created_at"],
                profile=profile,
            )
        )
    return results


async def get_shared_story_by_id(db: aiosqlite.Connection, story_id: int, owner_user_id: int) -> StoryResponse | None:
    """Get one story shared by a given owner."""
    cursor = await db.execute(
        """
        SELECT * FROM stories
        WHERE id = ? AND user_id = ? AND visibility = 'shared_with_friends'
        """,
        (story_id, owner_user_id),
    )
    row = await cursor.fetchone()
    if not row:
        return None

    profile = await get_kid_profile(db, row["kid_profile_id"])
    panels = await get_panels_for_story(db, story_id)
    return _build_story_response(row, profile, panels)
