"""
Standalone backup worker — runs as a separate Compose service.

Calls create_backup() on startup, then sleeps BACKUP_INTERVAL_SECONDS
before repeating.  Cross-process serialization is handled inside
create_backup() via a POSIX file lock, so concurrent callers (this
worker + a manual API trigger) are safely serialized without any
extra locking here.

Schema-not-ready handling: if the backend has not yet run init_db()
(startup race), _run_once() returns False and the loop retries after
SCHEMA_RETRY_SECONDS instead of waiting a full day.  Once the first
backup succeeds the normal interval takes over.
"""

import asyncio
import logging
import time

from db.backup import BACKUP_INTERVAL, SchemaNotReadyError, create_backup

INTERVAL = BACKUP_INTERVAL
SCHEMA_RETRY = 30  # seconds between retries while schema is not yet ready

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("backup-worker")


def _run_once() -> bool:
    """Run one backup cycle.

    Returns True when the backup completed (or failed for an unrelated reason),
    so the caller uses the normal interval.  Returns False when the DB schema
    is not ready yet, so the caller should retry sooner.
    """
    try:
        asyncio.run(create_backup())
        log.info("Backup complete")
        return True
    except SchemaNotReadyError as exc:
        log.warning("DB schema not ready, will retry in %ds: %s", SCHEMA_RETRY, exc)
        return False
    except Exception:
        log.exception("Backup failed")
        return True


if __name__ == "__main__":
    log.info("Backup worker starting (interval=%ds)", INTERVAL)
    while True:
        schema_ready = _run_once()
        delay = INTERVAL if schema_ready else SCHEMA_RETRY
        log.info("Next backup in %ds", delay)
        time.sleep(delay)
