"""
SQLite online-backup utilities.

Uses sqlite3's built-in Connection.backup() API, which is safe under
concurrent writes (WAL mode is in effect at runtime). Backups are
stored in a rotating set; once MAX_BACKUPS is reached the oldest file
is removed automatically.

create_backup() is serialized by _backup_lock so that concurrent callers
(scheduled task + manual trigger) never race on filename generation or
the rotation glob/unlink.
"""

import asyncio
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from db.database import DB_PATH

BACKUP_DIR = Path("backups")
MAX_BACKUPS = 7  # keep at most 7 daily snapshots

# Serializes concurrent create_backup() calls within the process.
_backup_lock = asyncio.Lock()


def _sync_backup(db_path: str, dest_path: str) -> None:
    """Perform a synchronous SQLite online backup via the C-level API."""
    with sqlite3.connect(db_path) as src, sqlite3.connect(dest_path) as dst:
        src.backup(dst)


async def create_backup() -> str:
    """Create a timestamped backup of the database.

    Returns:
        The filename (not full path) of the new backup.
    """
    async with _backup_lock:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        # Microsecond precision avoids filename collisions on rapid or
        # concurrent calls that land in the same wall-clock second.
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S_%f")
        filename = f"wondercomic_{timestamp}.db"
        dest = BACKUP_DIR / filename

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_backup, DB_PATH, str(dest))

        # Rotate: drop oldest when over the limit
        existing = sorted(BACKUP_DIR.glob("wondercomic_*.db"))
        for old in existing[:-MAX_BACKUPS]:
            old.unlink(missing_ok=True)

        return filename


def list_backups() -> list[dict]:
    """Return metadata for all available backups, newest first."""
    if not BACKUP_DIR.exists():
        return []
    files = sorted(BACKUP_DIR.glob("wondercomic_*.db"), reverse=True)
    return [
        {
            "filename": f.name,
            "size_bytes": f.stat().st_size,
            "created_at": datetime.fromtimestamp(
                f.stat().st_mtime, tz=UTC
            ).isoformat(),
        }
        for f in files
    ]


def get_last_backup_time() -> str | None:
    """Return ISO 8601 timestamp of the most recent backup, or None."""
    if not BACKUP_DIR.exists():
        return None
    files = sorted(BACKUP_DIR.glob("wondercomic_*.db"))
    if not files:
        return None
    return datetime.fromtimestamp(
        files[-1].stat().st_mtime, tz=UTC
    ).isoformat()
