"""
Standalone backup worker — runs as a separate Compose service.

Calls create_backup() on startup, then sleeps BACKUP_INTERVAL_SECONDS
before repeating.  A POSIX advisory lock on LOCK_FILE prevents concurrent
runs when more than one worker instance shares the backups volume (e.g.
during a rolling restart or accidental double-start).
"""

import asyncio
import fcntl
import logging
import os
import time

from db.backup import BACKUP_DIR, create_backup

LOCK_FILE = BACKUP_DIR / ".worker.lock"
INTERVAL = int(os.getenv("BACKUP_INTERVAL_SECONDS", str(24 * 60 * 60)))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("backup-worker")


def _run_once() -> None:
    """Run one backup cycle, skipping if another worker holds the lock."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    with open(LOCK_FILE, "w") as fh:
        try:
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log.warning("Lock held by another worker — skipping this run")
            return
        try:
            asyncio.run(create_backup())
            log.info("Backup complete")
        except Exception:
            log.exception("Backup failed")
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)


if __name__ == "__main__":
    log.info("Backup worker starting (interval=%ds)", INTERVAL)
    while True:
        _run_once()
        log.info("Next backup in %ds", INTERVAL)
        time.sleep(INTERVAL)
