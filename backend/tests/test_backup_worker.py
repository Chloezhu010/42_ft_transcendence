"""
Unit tests for backup_worker._run_once().

Cross-process serialization is now handled inside create_backup() via a
POSIX file lock, so _run_once() is intentionally thin: call create_backup(),
log, handle exceptions.  Tests here verify that contract.
"""

from unittest.mock import AsyncMock, patch

import backup_worker


class TestRunOnce:
    def test_calls_create_backup(self):
        mock_create = AsyncMock()
        with patch.object(backup_worker, "create_backup", mock_create):
            backup_worker._run_once()
        mock_create.assert_called_once()

    def test_does_not_raise_when_create_backup_raises(self):
        with patch.object(backup_worker, "create_backup", AsyncMock(side_effect=RuntimeError("disk full"))):
            backup_worker._run_once()  # must not propagate
