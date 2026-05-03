"""
Standalone backup worker — runs as a separate Compose service.

Calls create_backup() on startup, then sleeps BACKUP_INTERVAL_SECONDS
before repeating.  Cross-process serialization is handled inside
create_backup() via a POSIX file lock, so concurrent callers (this
worker + a manual API trigger) are safely serialized without any
extra locking here.
"""

import asyncio
import logging
import os
import time

from db.backup import SchemaNotReadyError, create_backup

INTERVAL = int(os.getenv("BACKUP_INTERVAL_SECONDS", str(24 * 60 * 60)))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("backup-worker")


def _run_once() -> None:
    """Run one backup cycle."""
    try:
        asyncio.run(create_backup())
        log.info("Backup complete")
    except SchemaNotReadyError as exc:
        log.warning("DB schema not ready, backup skipped: %s", exc)
    except Exception:
        log.exception("Backup failed")


if __name__ == "__main__":
    log.info("Backup worker starting (interval=%ds)", INTERVAL)
    while True:
        _run_once()
        log.info("Next backup in %ds", INTERVAL)
        time.sleep(INTERVAL)
