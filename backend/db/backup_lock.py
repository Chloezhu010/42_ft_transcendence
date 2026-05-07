"""Cross-process lock file shared by backup creation and image deletion.

Backup holds LOCK_EX for the entire duration (DB snapshot + image packaging).
Image deletions hold LOCK_SH, which blocks while any LOCK_EX is active.
This prevents a file from being deleted between the two backup phases.
"""

import fcntl
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

LOCK_FILE = Path("backups") / ".backup.lock"


@contextmanager
def image_delete_lock() -> Generator[None]:
    """Block until no backup is in progress, then hold a shared lock.

    Multiple concurrent deletions may hold LOCK_SH simultaneously.
    A backup holding LOCK_EX will block all new LOCK_SH acquisitions.
    """
    LOCK_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOCK_FILE, "a") as fh:
        fcntl.flock(fh, fcntl.LOCK_SH)
        try:
            yield
        finally:
            fcntl.flock(fh, fcntl.LOCK_UN)
