"""
Standalone backup worker — runs as a separate Compose service.

Calls create_backup() on startup, then sleeps BACKUP_INTERVAL_SECONDS
before repeating.  Cross-process serialization is handled inside
create_backup() via a POSIX file lock, so concurrent callers (this
worker + a manual API trigger) are safely serialized without any
extra locking here.

Retry behaviour:
  - Success              → sleep INTERVAL (normal cadence)
  - SchemaNotReadyError  → sleep SCHEMA_RETRY (30 s); backend hasn't run init_db() yet
  - Any other exception  → sleep FAILURE_RETRY (5 min); transient disk/permission issue
"""

import asyncio
import logging
import time

from db.backup import BACKUP_INTERVAL, SchemaNotReadyError, create_backup

INTERVAL = BACKUP_INTERVAL
SCHEMA_RETRY = 30  # seconds — schema race on startup
FAILURE_RETRY = 300  # seconds — transient disk / permission / write error

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("backup-worker")


def _run_once() -> int:
    """Run one backup cycle and return the number of seconds to sleep next.

    Returns INTERVAL on success, SCHEMA_RETRY when the DB schema is not yet
    initialized, and FAILURE_RETRY for any other exception so that transient
    failures (disk full, permission error, corrupt write) are retried within
    minutes rather than after a full day.
    """
    try:
        asyncio.run(create_backup())
        log.info("Backup complete")
        return INTERVAL
    except SchemaNotReadyError as exc:
        log.warning("DB schema not ready, will retry in %ds: %s", SCHEMA_RETRY, exc)
        return SCHEMA_RETRY
    except Exception:
        log.exception("Backup failed, will retry in %ds", FAILURE_RETRY)
        return FAILURE_RETRY


if __name__ == "__main__":
    log.info("Backup worker starting (interval=%ds)", INTERVAL)
    while True:
        delay = _run_once()
        log.info("Next backup in %ds", delay)
        time.sleep(delay)
