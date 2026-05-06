"""Filesystem image storage helpers."""

import base64
import binascii
import os
import tempfile
import uuid
from pathlib import Path

from db.backup_lock import image_delete_lock

IMAGES_DIR = Path(__file__).resolve().parent.parent / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def save_base64_image(base64_data: str, prefix: str = "img") -> str | None:
    """Save a base64 image into backend/images and return the stored filename."""
    if not base64_data:
        return None

    encoded_data = base64_data.split(",", 1)[1] if "," in base64_data else base64_data

    try:
        image_bytes = base64.b64decode(encoded_data, validate=True)
    except (binascii.Error, ValueError):
        return None

    filename = f"{prefix}_{uuid.uuid4().hex[:8]}.png"
    dest = IMAGES_DIR / filename
    # Write to a temp file in the same directory so the final rename() is
    # atomic on POSIX.  A backup running concurrently sees either the complete
    # file (post-rename) or nothing — never a partial write.
    fd, tmp_str = tempfile.mkstemp(dir=IMAGES_DIR, suffix=".tmp")
    tmp_path = Path(tmp_str)
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(image_bytes)
        tmp_path.rename(dest)
    except:
        tmp_path.unlink(missing_ok=True)
        raise
    return filename


def delete_local_image(filename: str | None) -> None:
    """Delete a stored image file by filename."""
    if not filename:
        return

    safe_name = Path(filename).name
    with image_delete_lock():
        try:
            (IMAGES_DIR / safe_name).unlink()
        except FileNotFoundError:
            pass
