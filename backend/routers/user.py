"""User router (profile viewing, editing, avatar upload, public profile lookup)."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile

from auth_utils import get_current_user
from db.crud_users import get_user_by_id, search_users_by_username, update_user
from db.database import get_db
from models import PublicUserResponse, UserResponse, UserUpdateRequest
from services.avatar_upload import AvatarUploadError, replace_user_avatar

router = APIRouter(prefix="/api/users", tags=["users"])
_IMAGE_DIR = Path(__file__).parent.parent / "images"


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


def _to_public_user_response(row) -> PublicUserResponse:
    """Convert a DB user row to a public-safe profile model."""
    return PublicUserResponse(
        id=row["id"],
        username=row["username"],
        avatar_url=row["avatar_path"],
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
    try:
        updated_row = await replace_user_avatar(db, current_user["id"], file, image_dir=_IMAGE_DIR)
    except AvatarUploadError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_user_response(updated_row)


@router.get("/search", response_model=list[PublicUserResponse])
async def search_users(
    q: str = Query(..., min_length=1, max_length=50, description="Username fragment to search for"),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Search users by username for friend discovery. Excludes the caller. Auth required."""
    rows = await search_users_by_username(db, q, current_user["id"])
    return [_to_public_user_response(row) for row in rows]


@router.get("/{user_id}", response_model=PublicUserResponse)
async def get_user_profile(user_id: int, db=Depends(get_db)):
    """Get a public user profile by ID. No auth required."""
    row = await get_user_by_id(db, user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_public_user_response(row)
