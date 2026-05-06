"""CRUD operations for kid profiles."""

import aiosqlite

from schemas.stories import KidProfileCreate, KidProfileResponse


async def create_kid_profile(db: aiosqlite.Connection, profile: KidProfileCreate, user_id: int) -> int:
    """Create a kid profile and return its ID."""
    cursor = await db.execute(
        """
        INSERT INTO kid_profiles (
            name, gender, skin_tone, hair_color, eye_color,
            favorite_color, dream, archetype, art_style, language, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (
            profile.name,
            profile.gender,
            profile.skin_tone,
            profile.hair_color,
            profile.eye_color,
            profile.favorite_color,
            profile.dream,
            profile.archetype,
            profile.art_style,
            profile.language,
            user_id,
        ),
    )
    await db.commit()
    return cursor.lastrowid


async def get_kid_profile(db: aiosqlite.Connection, profile_id: int) -> KidProfileResponse | None:
    """Get a kid profile by ID."""
    cursor = await db.execute("SELECT * FROM kid_profiles WHERE id = ?", (profile_id,))
    row = await cursor.fetchone()
    if not row:
        return None

    return KidProfileResponse(
        id=row["id"],
        name=row["name"],
        gender=row["gender"],
        skin_tone=row["skin_tone"],
        hair_color=row["hair_color"],
        eye_color=row["eye_color"],
        favorite_color=row["favorite_color"],
        dream=row["dream"],
        archetype=row["archetype"],
        art_style=row["art_style"],
        language=row["language"],
        created_at=row["created_at"],
    )
