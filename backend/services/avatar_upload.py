"""Avatar upload workflow helpers."""

import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import aiofiles
from fastapi import UploadFile

from db.users_crud import get_user_by_id, update_avatar

DEFAULT_IMAGE_DIR = Path(__file__).resolve().parent.parent / "images"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
DEFAULT_AVATAR_PATH = "default-avatar.png"
MAX_AVATAR_SIZE = 5 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 64 * 1024
IMAGE_SIGNATURE_BYTES = 12
CONTENT_TYPE_ALIASES = {"image/jpg": "image/jpeg"}


@dataclass(frozen=True)
class AvatarUploadError(Exception):
    status_code: int
    detail: str


@dataclass(frozen=True)
class StoredAvatar:
    absolute_path: Path
    relative_path: str


def _detect_image_type(header: bytes) -> tuple[str, str] | None:
    """Infer image MIME type and safe file extension from uploaded bytes."""
    if header.startswith(b"\xff\xd8\xff"):
        return ("image/jpeg", ".jpg")
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ("image/png", ".png")
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return ("image/webp", ".webp")
    return None


async def _write_validated_avatar_upload(file: UploadFile, user_id: int, image_dir: Path) -> StoredAvatar:
    """Stream the upload to disk and return the stored avatar paths."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise AvatarUploadError(status_code=415, detail="Unsupported file type")

    avatars_dir = image_dir / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)

    file_stem = f"{user_id}_{uuid.uuid4().hex}"
    temp_path = avatars_dir / f"{file_stem}.tmp"

    try:
        async with aiofiles.open(temp_path, "wb") as output_file:
            size = 0
            header = bytearray()

            while chunk := await file.read(UPLOAD_CHUNK_BYTES):
                if len(header) < IMAGE_SIGNATURE_BYTES:
                    header.extend(chunk[: IMAGE_SIGNATURE_BYTES - len(header)])

                size += len(chunk)
                if size > MAX_AVATAR_SIZE:
                    raise AvatarUploadError(
                        status_code=413,
                        detail="File too large, must be under 5MB",
                    )

                await output_file.write(chunk)

        detected_image = _detect_image_type(bytes(header))
        if detected_image is None:
            raise AvatarUploadError(status_code=415, detail="Unsupported file type")

        detected_content_type, extension = detected_image
        declared_content_type = CONTENT_TYPE_ALIASES.get(file.content_type, file.content_type)
        if declared_content_type != detected_content_type:
            raise AvatarUploadError(
                status_code=415,
                detail="Uploaded content does not match file type",
            )
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise

    relative_path = f"avatars/{file_stem}{extension}"
    stored_path = image_dir / relative_path
    temp_path.replace(stored_path)

    return StoredAvatar(absolute_path=stored_path, relative_path=relative_path)


def _delete_previous_avatar(image_dir: Path, avatar_path: str | None) -> None:
    """Delete a superseded avatar file, but never the shared default avatar."""
    if not avatar_path or avatar_path == DEFAULT_AVATAR_PATH:
        return

    (image_dir / avatar_path).unlink(missing_ok=True)


async def replace_user_avatar(
    db: Any,
    user_id: int,
    file: UploadFile,
    image_dir: Path = DEFAULT_IMAGE_DIR,
) -> Any:
    """Replace a user's avatar and return the updated DB row."""
    current_user = await get_user_by_id(db, user_id)
    if current_user is None:
        raise AvatarUploadError(status_code=404, detail="User not found")

    stored_avatar = await _write_validated_avatar_upload(file, user_id, image_dir)

    try:
        updated_row = await update_avatar(db, user_id, stored_avatar.relative_path)
        if updated_row is None:
            raise AvatarUploadError(status_code=404, detail="User not found")
    except Exception:
        stored_avatar.absolute_path.unlink(missing_ok=True)
        raise

    _delete_previous_avatar(image_dir, current_user["avatar_path"])
    return updated_row
