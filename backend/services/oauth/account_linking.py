import aiosqlite
from aiosqlite import Row
from fastapi import HTTPException

from db.crud_oauth import create_oauth_account, get_user_by_oauth_account
from db.crud_users import create_oauth_user, get_user_by_email, get_user_by_id
from services.oauth.profile_mapping import normalize_google_profile


async def _create_unique_username(db: aiosqlite.Connection, base: str) -> str:
    """Return base if unclaimed, otherwise base2, base3, ..."""
    candidate = base
    n = 2
    while True:
        async with db.execute("SELECT id FROM users WHERE username = ?", (candidate,)) as cursor:
            if await cursor.fetchone() is None:
                return candidate
        candidate = f"{base}{n}"
        n += 1


async def resolve_google_login(db: aiosqlite.Connection, userinfo: dict) -> Row:
    """
    Find or create a local user for a Google OAuth login.

    Raises HTTPException on unverified email, missing email, or same-email
    local account that has no OAuth link (link_conflict).
    """
    profile = normalize_google_profile(userinfo)

    # 1. Reject missing email before any DB work
    if not profile.email:
        raise HTTPException(status_code=400, detail="Google account provided no email")

    # 2. Reject unverified email — checked before conflict detection (avoids email enumeration)
    if not profile.email_verified:
        raise HTTPException(status_code=400, detail="Google account email is not verified")

    # 3. Return immediately if this Google identity is already linked
    user = await get_user_by_oauth_account(db, "google", profile.provider_user_id)
    if user is not None:
        return user

    # 4. Reject if the email belongs to an existing local (password) account
    existing = await get_user_by_email(db, profile.email)
    if existing is not None:
        raise HTTPException(status_code=409, detail="link_conflict: email already used by a local account")

    # 5. Create new OAuth-only user with a unique username
    username = await _create_unique_username(db, profile.display_name)
    user_id = await create_oauth_user(db, username, profile.email)
    await create_oauth_account(db, user_id, "google", profile.provider_user_id, profile.email)

    return await get_user_by_id(db, user_id)
