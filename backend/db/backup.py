"""
SQLite online-backup utilities — includes generated images.

Each backup is a zip archive containing:
  - wondercomic.db   — a consistent SQLite snapshot via Connection.backup()
  - images/          — all files under the backend/images directory (recursive)

Using zip means the DB and its referenced image files travel together, so
restoring a backup restores user content end-to-end.

create_backup() acquires an exclusive POSIX file lock (LOCK_FILE) before
writing, so concurrent callers from different processes (backup-worker +
manual API trigger) are serialized and never race on filename generation,
zip writes, or rotation.
"""

import asyncio
import fcntl
import os
import sqlite3
import tempfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from db.backup_lock import LOCK_FILE
from db.database import DB_PATH, REQUIRED_TABLES
from services.image_storage import IMAGES_DIR

BACKUP_DIR = Path("backups")
MAX_BACKUPS = 7  # keep at most 7 daily snapshots
BACKUP_INTERVAL = int(os.getenv("BACKUP_INTERVAL_SECONDS", str(24 * 60 * 60)))
# A backup is considered stale when it is older than 1.5× the scheduled interval.
# This gives the worker one extra half-cycle of grace (restarts, schema retries, …).
STALE_THRESHOLD = BACKUP_INTERVAL * 1.5


class SchemaNotReadyError(RuntimeError):
    """Raised when the database is missing required application tables.

    This happens if the backup worker races with the backend on startup
    before init_db() has run.  Callers should skip the backup and retry
    on the next scheduled interval rather than treating this as a hard
    failure.
    """


def _check_schema(db_path: str) -> None:
    """Raise SchemaNotReadyError if any required table is absent."""
    with sqlite3.connect(db_path) as conn:
        placeholders = ",".join("?" * len(REQUIRED_TABLES))
        rows = conn.execute(
            f"SELECT name FROM sqlite_master WHERE type='table' AND name IN ({placeholders})",
            tuple(REQUIRED_TABLES),
        ).fetchall()
        found = {row[0] for row in rows}
        missing = REQUIRED_TABLES - found
        if missing:
            raise SchemaNotReadyError(f"missing tables: {', '.join(sorted(missing))}")


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


def _locked_backup(db_path: str) -> str:
    """Acquire the cross-process file lock, then run backup + rotation.

    Blocks until any concurrent backup (worker or API) finishes.
    Returns the filename of the newly created archive.
    """
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOCK_FILE, "w") as fh:
        fcntl.flock(fh, fcntl.LOCK_EX)
        try:
            _check_schema(db_path)
            # Microsecond precision avoids filename collisions on back-to-back calls.
            timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S_%f")
            filename = f"wondercomic_{timestamp}.zip"
            _sync_backup(db_path, str(BACKUP_DIR / filename))
            existing = sorted(BACKUP_DIR.glob("wondercomic_*.zip"))
            for old in existing[:-MAX_BACKUPS]:
                old.unlink(missing_ok=True)
            return filename
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)


async def create_backup() -> str:
    """Create a timestamped backup archive of the database and images.

    Returns:
        The filename (not full path) of the new backup.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _locked_backup, DB_PATH)


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
