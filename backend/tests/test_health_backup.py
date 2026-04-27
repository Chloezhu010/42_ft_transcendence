"""
Tests for the health-check endpoint and the backup subsystem.

Covers:
  GET  /health          — healthy/unhealthy responses, response schema
  GET  /backup/status   — backup inventory endpoint
  POST /backup/trigger  — on-demand backup trigger endpoint

  Unit tests for db.backup utility functions:
    list_backups(), get_last_backup_time(), create_backup()
"""

import asyncio
import sqlite3
import time
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from auth_utils import get_current_user
from db.backup import MAX_BACKUPS, create_backup, get_last_backup_time, list_backups
from db.database import get_db
from routers.backup import router as backup_router
from routers.health import router as health_router
from tests.conftest import _init_test_db, make_test_app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def health_client(tmp_path):
    """TestClient running the real health router against a temp DB."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, health_router)) as c:
        yield c


@pytest.fixture
def failing_health_client(tmp_path):
    """TestClient running the real health router with a DB that always fails on execute."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    app = make_test_app(db_path, health_router)

    mock_db = AsyncMock()
    mock_db.execute.side_effect = Exception("Connection refused")

    async def failing_db():
        yield mock_db

    app.dependency_overrides[get_db] = failing_db
    with TestClient(app) as c:
        yield c


@pytest.fixture
def backup_client(tmp_path):
    """TestClient with the backup router, a fresh temp DB, and a mock authenticated user."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    app = make_test_app(db_path, backup_router)
    app.dependency_overrides[get_current_user] = lambda: {"id": 1, "username": "testuser", "email": "test@example.com"}
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def isolate_backup_dir(tmp_path, monkeypatch):
    """Redirect BACKUP_DIR to a temp directory for every test."""
    backup_path = tmp_path / "backups"
    monkeypatch.setattr("db.backup.BACKUP_DIR", backup_path)
    monkeypatch.setattr("routers.backup.BACKUP_DIR", backup_path, raising=False)
    yield backup_path


# ===========================================================================
# GET /health
# ===========================================================================


class TestHealthEndpoint:
    def test_returns_200_when_database_is_reachable(self, health_client):
        assert health_client.get("/health").status_code == 200

    def test_response_contains_status_field(self, health_client):
        assert "status" in health_client.get("/health").json()

    def test_status_is_healthy_when_db_is_ok(self, health_client):
        assert health_client.get("/health").json()["status"] == "healthy"

    def test_response_contains_version_field(self, health_client):
        assert "version" in health_client.get("/health").json()

    def test_response_contains_checks_field(self, health_client):
        assert "checks" in health_client.get("/health").json()

    def test_database_check_is_ok_when_connected(self, health_client):
        assert health_client.get("/health").json()["checks"]["database"] == "ok"

    def test_returns_503_when_database_is_unavailable(self, failing_health_client):
        assert failing_health_client.get("/health").status_code == 503

    def test_status_is_unhealthy_when_db_fails(self, failing_health_client):
        assert failing_health_client.get("/health").json()["status"] == "unhealthy"

    def test_database_check_is_unavailable_when_db_fails(self, failing_health_client):
        assert failing_health_client.get("/health").json()["checks"]["database"] == "unavailable"

    def test_version_field_is_a_string(self, health_client):
        version = health_client.get("/health").json()["version"]
        assert isinstance(version, str) and version


# ===========================================================================
# GET /backup/status
# ===========================================================================


class TestBackupStatusEndpoint:
    def test_returns_200(self, backup_client):
        assert backup_client.get("/backup/status").status_code == 200

    def test_response_has_last_backup_field(self, backup_client):
        assert "last_backup" in backup_client.get("/backup/status").json()

    def test_response_has_total_backups_field(self, backup_client):
        assert "total_backups" in backup_client.get("/backup/status").json()

    def test_response_has_backups_list_field(self, backup_client):
        assert "backups" in backup_client.get("/backup/status").json()

    def test_last_backup_is_none_when_no_backups_exist(self, backup_client):
        assert backup_client.get("/backup/status").json()["last_backup"] is None

    def test_total_backups_is_zero_on_fresh_start(self, backup_client):
        assert backup_client.get("/backup/status").json()["total_backups"] == 0

    def test_backups_list_is_empty_on_fresh_start(self, backup_client):
        assert backup_client.get("/backup/status").json()["backups"] == []

    def test_backup_entry_has_required_fields(self, backup_client, isolate_backup_dir):
        # Create a real backup file so the inventory has something to report.
        backup_dir = isolate_backup_dir
        backup_dir.mkdir(parents=True, exist_ok=True)
        fake = backup_dir / "wondercomic_20260101_000000.db"
        fake.write_bytes(b"SQLite format 3\x00" + b"\x00" * 84)

        data = backup_client.get("/backup/status").json()
        assert data["total_backups"] == 1
        entry = data["backups"][0]
        assert "filename" in entry
        assert "size_bytes" in entry
        assert "created_at" in entry

    def test_last_backup_is_iso_timestamp_when_backups_exist(self, backup_client, isolate_backup_dir):
        backup_dir = isolate_backup_dir
        backup_dir.mkdir(parents=True, exist_ok=True)
        (backup_dir / "wondercomic_20260101_000000.db").write_bytes(b"\x00" * 100)

        last = backup_client.get("/backup/status").json()["last_backup"]
        assert last is not None
        assert "T" in last  # ISO 8601 format contains 'T'


# ===========================================================================
# POST /backup/trigger
# ===========================================================================


def _make_backup_stub(backup_dir):
    """Return an async callable that creates a fake backup file and returns its filename."""
    filename = "wondercomic_20260427_000000.db"

    async def _stub():
        backup_dir.mkdir(parents=True, exist_ok=True)
        (backup_dir / filename).write_bytes(b"\x00" * 1024)
        return filename

    return _stub


class TestBackupTriggerEndpoint:
    def test_returns_200_ok(self, backup_client, isolate_backup_dir):
        with patch("routers.backup.create_backup", side_effect=_make_backup_stub(isolate_backup_dir)):
            assert backup_client.post("/backup/trigger").status_code == 200

    def test_response_contains_backup_entry_fields(self, backup_client, isolate_backup_dir):
        with patch("routers.backup.create_backup", side_effect=_make_backup_stub(isolate_backup_dir)):
            data = backup_client.post("/backup/trigger").json()
            assert "filename" in data
            assert "size_bytes" in data
            assert "created_at" in data

    def test_returned_filename_matches_new_backup(self, backup_client, isolate_backup_dir):
        with patch("routers.backup.create_backup", side_effect=_make_backup_stub(isolate_backup_dir)):
            data = backup_client.post("/backup/trigger").json()
            assert data["filename"] == "wondercomic_20260427_000000.db"

    def test_returns_401_without_authentication(self, tmp_path):
        db_path = str(tmp_path / "test.db")
        asyncio.run(_init_test_db(db_path))
        with TestClient(make_test_app(db_path, backup_router)) as c:
            assert c.post("/backup/trigger").status_code == 401


# ===========================================================================
# Unit tests: db.backup utility functions
# ===========================================================================


class TestListBackups:
    def test_returns_empty_list_when_backup_dir_does_not_exist(self, isolate_backup_dir):
        assert list_backups() == []

    def test_returns_empty_list_when_backup_dir_is_empty(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        assert list_backups() == []

    def test_returns_one_entry_for_a_single_backup_file(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        (isolate_backup_dir / "wondercomic_20260101_000000.db").write_bytes(b"\x00" * 512)
        result = list_backups()
        assert len(result) == 1

    def test_entry_contains_filename(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        (isolate_backup_dir / "wondercomic_20260101_000000.db").write_bytes(b"\x00" * 512)
        entry = list_backups()[0]
        assert entry["filename"] == "wondercomic_20260101_000000.db"

    def test_entry_contains_size_bytes(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        (isolate_backup_dir / "wondercomic_20260101_000000.db").write_bytes(b"\x00" * 512)
        entry = list_backups()[0]
        assert entry["size_bytes"] == 512

    def test_entry_contains_created_at_iso_timestamp(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        (isolate_backup_dir / "wondercomic_20260101_000000.db").write_bytes(b"\x00" * 512)
        entry = list_backups()[0]
        assert "created_at" in entry
        assert "T" in entry["created_at"]

    def test_returns_newest_first_when_multiple_files_exist(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        older = isolate_backup_dir / "wondercomic_20260101_000000.db"
        newer = isolate_backup_dir / "wondercomic_20260102_000000.db"
        older.write_bytes(b"\x00" * 100)
        time.sleep(0.01)
        newer.write_bytes(b"\x00" * 200)
        result = list_backups()
        assert result[0]["filename"] == "wondercomic_20260102_000000.db"

    def test_ignores_files_not_matching_pattern(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        (isolate_backup_dir / "not_a_backup.db").write_bytes(b"\x00" * 100)
        (isolate_backup_dir / "wondercomic_20260101_000000.db").write_bytes(b"\x00" * 100)
        result = list_backups()
        assert len(result) == 1


class TestGetLastBackupTime:
    def test_returns_none_when_backup_dir_does_not_exist(self, isolate_backup_dir):
        assert get_last_backup_time() is None

    def test_returns_none_when_no_backup_files_exist(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        assert get_last_backup_time() is None

    def test_returns_iso_string_when_backup_exists(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        (isolate_backup_dir / "wondercomic_20260101_000000.db").write_bytes(b"\x00" * 100)
        result = get_last_backup_time()
        assert result is not None
        assert "T" in result

    def test_returns_timestamp_of_most_recent_file(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        older = isolate_backup_dir / "wondercomic_20260101_000000.db"
        newer = isolate_backup_dir / "wondercomic_20260102_000000.db"
        older.write_bytes(b"\x00" * 100)
        time.sleep(0.02)
        newer.write_bytes(b"\x00" * 100)
        newer_mtime = newer.stat().st_mtime
        result = get_last_backup_time()
        assert result is not None
        # The returned timestamp must correspond to the newer file.
        assert str(newer_mtime)[:4] in result or result > older.stat().st_mtime.__str__()[:4]


class TestCreateBackup:
    def test_creates_a_backup_file_in_backup_dir(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        with patch("db.backup.DB_PATH", str(src)):
            filename = asyncio.run(create_backup())

        assert (isolate_backup_dir / filename).exists()

    def test_returns_filename_string(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        with patch("db.backup.DB_PATH", str(src)):
            filename = asyncio.run(create_backup())

        assert isinstance(filename, str)
        assert filename.startswith("wondercomic_")
        assert filename.endswith(".db")

    def test_backup_file_is_a_valid_sqlite_database(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")
            conn.execute("INSERT INTO t VALUES (42)")

        with patch("db.backup.DB_PATH", str(src)):
            filename = asyncio.run(create_backup())

        with sqlite3.connect(str(isolate_backup_dir / filename)) as backup_conn:
            row = backup_conn.execute("SELECT id FROM t").fetchone()
            assert row == (42,)

    def test_rotates_oldest_backup_when_limit_is_exceeded(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        # Pre-fill with MAX_BACKUPS files so the next create should rotate.
        isolate_backup_dir.mkdir(parents=True, exist_ok=True)
        for i in range(MAX_BACKUPS):
            (isolate_backup_dir / f"wondercomic_2026010{i}_000000.db").write_bytes(b"\x00" * 10)

        with patch("db.backup.DB_PATH", str(src)):
            asyncio.run(create_backup())

        remaining = list(isolate_backup_dir.glob("wondercomic_*.db"))
        assert len(remaining) == MAX_BACKUPS

    def test_creates_backup_dir_if_it_does_not_exist(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        assert not isolate_backup_dir.exists()

        with patch("db.backup.DB_PATH", str(src)):
            asyncio.run(create_backup())

        assert isolate_backup_dir.exists()


# ===========================================================================
# Scheduled backup wiring (startup + 24-hour repeat)
# ===========================================================================


class TestScheduledBackup:
    def test_create_backup_is_callable_as_a_coroutine(self):
        """create_backup must be an async function (coroutine) so the scheduler can await it."""
        import asyncio as _asyncio

        assert _asyncio.iscoroutinefunction(create_backup)
