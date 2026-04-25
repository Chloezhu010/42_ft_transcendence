"""CRUD operations for story panels."""

import aiosqlite

from schemas.stories import PanelCreate, PanelResponse
from services.image_storage import save_base64_image


async def create_panels(db: aiosqlite.Connection, story_id: int, panels: list[PanelCreate]) -> None:
    """Create panels for a story."""
    for panel in panels:
        panel_filename = None
        if panel.image_base64:
            panel_filename = save_base64_image(panel.image_base64, f"panel_{story_id}")

        await db.execute(
            """
            INSERT INTO panels (story_id, panel_order, text, image_prompt, image_path)
            VALUES (?, ?, ?, ?, ?)
        """,
            (story_id, panel.panel_order, panel.text, panel.image_prompt, panel_filename),
        )
    await db.commit()


async def get_panels_for_story(db: aiosqlite.Connection, story_id: int) -> list[PanelResponse]:
    """Get all panels for a story."""
    cursor = await db.execute(
        """
        SELECT * FROM panels WHERE story_id = ? ORDER BY panel_order
    """,
        (story_id,),
    )
    rows = await cursor.fetchall()

    return [
        PanelResponse(
            id=row["id"],
            panel_order=row["panel_order"],
            text=row["text"],
            image_prompt=row["image_prompt"],
            image_url=row["image_path"],
        )
        for row in rows
    ]
