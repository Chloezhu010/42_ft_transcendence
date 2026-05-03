"""
Unit tests for backup_worker._run_once().

Cross-process serialization is now handled inside create_backup() via a
POSIX file lock, so _run_once() is intentionally thin: call create_backup(),
log, handle exceptions, and signal to the main loop whether to use the normal
interval or the short schema-retry interval.
"""

from unittest.mock import AsyncMock, patch

import backup_worker
from db.backup import SchemaNotReadyError


class TestRunOnce:
    def test_calls_create_backup(self):
        mock_create = AsyncMock()
        with patch.object(backup_worker, "create_backup", mock_create):
            backup_worker._run_once()
        mock_create.assert_called_once()

    def test_returns_true_on_success(self):
        with patch.object(backup_worker, "create_backup", AsyncMock()):
            assert backup_worker._run_once() is True

    def test_does_not_raise_when_create_backup_raises(self):
        with patch.object(backup_worker, "create_backup", AsyncMock(side_effect=RuntimeError("disk full"))):
            backup_worker._run_once()  # must not propagate

    def test_returns_true_on_generic_exception(self):
        with patch.object(backup_worker, "create_backup", AsyncMock(side_effect=RuntimeError("disk full"))):
            assert backup_worker._run_once() is True

    def test_does_not_raise_when_schema_not_ready(self):
        with patch.object(
            backup_worker, "create_backup", AsyncMock(side_effect=SchemaNotReadyError("missing tables: panels"))
        ):
            backup_worker._run_once()  # must not propagate

    def test_returns_false_when_schema_not_ready(self):
        with patch.object(
            backup_worker, "create_backup", AsyncMock(side_effect=SchemaNotReadyError("missing tables: panels"))
        ):
            assert backup_worker._run_once() is False
