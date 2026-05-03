"""
SQLite online-backup utilities — includes generated images.

Each backup is a zip archive containing:
  - wondercomic.db   — a consistent SQLite snapshot via Connection.backup()
  - images/          — all files from the backend/images directory

Using zip means the DB and its referenced image files travel together, so
restoring a backup restores user content end-to-end.

create_backup() is serialized by _backup_lock so that concurrent callers
(scheduled task + manual trigger) never race on filename generation or
the rotation glob/unlink.
"""

import asyncio
import sqlite3
import tempfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from db.database import DB_PATH
from services.image_storage import IMAGES_DIR

BACKUP_DIR = Path("backups")
MAX_BACKUPS = 7  # keep at most 7 daily snapshots

# Serializes concurrent create_backup() calls within the process.
_backup_lock = asyncio.Lock()


def _sync_backup(db_path: str, dest_zip: str) -> None:
    """Write a zip archive with the SQLite backup and all images."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_db = Path(tmp_dir) / "wondercomic.db"
        with sqlite3.connect(db_path) as src, sqlite3.connect(str(tmp_db)) as dst:
            src.backup(dst)

        with zipfile.ZipFile(dest_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.write(tmp_db, "wondercomic.db")
            images_dir = Path(IMAGES_DIR)
            if images_dir.exists():
                for img_file in images_dir.rglob("*"):
                    if img_file.is_file():
                        zf.write(img_file, f"images/{img_file.relative_to(images_dir)}")


async def create_backup() -> str:
    """Create a timestamped backup archive of the database and images.

    Returns:
        The filename (not full path) of the new backup.
    """
    async with _backup_lock:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        # Microsecond precision avoids filename collisions on rapid or
        # concurrent calls that land in the same wall-clock second.
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S_%f")
        filename = f"wondercomic_{timestamp}.zip"
        dest = BACKUP_DIR / filename

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_backup, DB_PATH, str(dest))

        # Rotate: drop oldest when over the limit
        existing = sorted(BACKUP_DIR.glob("wondercomic_*.zip"))
        for old in existing[:-MAX_BACKUPS]:
            old.unlink(missing_ok=True)

        return filename


def list_backups() -> list[dict]:
    """Return metadata for all available backups, newest first."""
    if not BACKUP_DIR.exists():
        return []
    files = sorted(BACKUP_DIR.glob("wondercomic_*.zip"), reverse=True)
    return [
        {
            "filename": f.name,
            "size_bytes": f.stat().st_size,
            "created_at": datetime.fromtimestamp(f.stat().st_mtime, tz=UTC).isoformat(),
        }
        for f in files
    ]


def get_last_backup_time() -> str | None:
    """Return ISO 8601 timestamp of the most recent backup, or None."""
    if not BACKUP_DIR.exists():
        return None
    files = sorted(BACKUP_DIR.glob("wondercomic_*.zip"))
    if not files:
        return None
    return datetime.fromtimestamp(files[-1].stat().st_mtime, tz=UTC).isoformat()
