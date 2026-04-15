"""
User router (profile viewing, editing, avatar upload, public profile lookup)
"""

import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile

from auth_utils import get_current_user
from db.crud_users import get_user_by_id, update_avatar, update_user
from db.database import get_db
from models import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/api/users", tags=["users"])
_IMAGE_DIR = Path(__file__).parent.parent / "images"
_ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
_DEFAULT_AVATAR = "default-avatar.png"
MAX_SIZE = 5 * 1024 * 1024  # 5MB max file size for avatar uploads
CHUNK = 64 * 1024  # 64KB chunk size for file uploads


def _to_user_response(row) -> UserResponse:
    """Convert a DB user row to a UserResponse model."""
    return UserResponse(
        id=row["id"],
        email=row["email"],
        username=row["username"],
        avatar_url=row["avatar_path"],  # frontend resolves to full url via getImageUrl()
        is_online=bool(row["is_online"]),
        created_at=row["created_at"],
    )


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Get the authenticated user's profile."""
    row = await get_user_by_id(db, current_user["id"])
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_user_response(row)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(body: UserUpdateRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Update the authenticated user's profile (username, email)."""
    try:
        updated_row = await update_user(db, current_user["id"], body.username, body.email)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if updated_row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_user_response(updated_row)


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(file: UploadFile, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Upload a new avatar image for the authenticated user. Stored under images/avatars/."""
    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    # grab the old avatar path before overwriting
    current = await get_user_by_id(db, current_user["id"])
    if current is None:
        raise HTTPException(status_code=404, detail="User not found")
    old_path = current["avatar_path"]

    # save new file
    avatars_dir = _IMAGE_DIR / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    relative_path = f"avatars/{current_user['id']}_{uuid.uuid4().hex}{ext}"  # store in DB
    dest = _IMAGE_DIR / relative_path  # actual file path
    tmp = dest.with_suffix(".tmp")  # write to temp path first

    # stream upload into temp file, validate size before committing
    try:
        async with aiofiles.open(tmp, "wb") as out:
            size = 0
            while chunk := await file.read(CHUNK):
                size += len(chunk)
                if size > MAX_SIZE:
                    raise HTTPException(status_code=413, detail="File too large, must be under 5MB")
                await out.write(chunk)
    except Exception:
        tmp.unlink(missing_ok=True)  # covers HTTPException, OSError, etc.
        raise
    tmp.replace(dest)  # atomic rename: only happens if size check passed

    # update user's avatar_path in db — clean up dest if anything goes wrong
    try:
        updated_row = await update_avatar(db, current_user["id"], relative_path)
        if updated_row is None:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception:
        dest.unlink(missing_ok=True)
        raise

    # delete old avatar file after DB update succeeds (if not default avatar)
    if old_path and old_path != _DEFAULT_AVATAR:
        old_file = _IMAGE_DIR / old_path
        old_file.unlink(missing_ok=True)

    return _to_user_response(updated_row)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: int, db=Depends(get_db)):
    """Get a public user profile by ID. No auth required."""
    row = await get_user_by_id(db, user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_user_response(row)
