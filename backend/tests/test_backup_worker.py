"""
Unit tests for backup_worker._run_once().

Covers:
  - Happy path: create_backup is called when the lock is free.
  - Lock contention: create_backup is skipped when flock raises BlockingIOError.
  - Error resilience: exceptions from create_backup are caught, not propagated.
"""

import fcntl
from unittest.mock import AsyncMock, patch

import pytest

import backup_worker


@pytest.fixture(autouse=True)
def isolate_backup_dir(tmp_path, monkeypatch):
    """Redirect BACKUP_DIR and LOCK_FILE to a temp directory for every test."""
    monkeypatch.setattr(backup_worker, "BACKUP_DIR", tmp_path)
    monkeypatch.setattr(backup_worker, "LOCK_FILE", tmp_path / ".worker.lock")


class TestRunOnce:
    def test_calls_create_backup_when_lock_is_free(self, tmp_path):
        mock_create = AsyncMock()
        with patch.object(backup_worker, "create_backup", mock_create):
            backup_worker._run_once()
        mock_create.assert_called_once()

    def test_skips_create_backup_when_flock_raises_blocking_error(self, tmp_path):
        mock_create = AsyncMock()
        with (
            patch.object(backup_worker, "create_backup", mock_create),
            patch("backup_worker.fcntl.flock", side_effect=BlockingIOError),
        ):
            backup_worker._run_once()
        mock_create.assert_not_called()

    def test_does_not_raise_when_create_backup_raises(self, tmp_path):
        failing_create = AsyncMock(side_effect=RuntimeError("disk full"))
        with patch.object(backup_worker, "create_backup", failing_create):
            backup_worker._run_once()  # must not propagate

    def test_lock_file_is_released_after_successful_backup(self, tmp_path):
        lock_file = tmp_path / ".worker.lock"
        with patch.object(backup_worker, "create_backup", AsyncMock()):
            backup_worker._run_once()

        # After _run_once() returns, we must be able to acquire the lock ourselves.
        with open(lock_file) as fh:
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(fh, fcntl.LOCK_UN)

    def test_lock_file_is_released_after_failed_backup(self, tmp_path):
        lock_file = tmp_path / ".worker.lock"
        with patch.object(backup_worker, "create_backup", AsyncMock(side_effect=OSError)):
            backup_worker._run_once()

        with open(lock_file) as fh:
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(fh, fcntl.LOCK_UN)
