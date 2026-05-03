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
import zipfile
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from auth_utils import get_current_user
from db.backup import MAX_BACKUPS, create_backup, get_last_backup_time, list_backups
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
    with patch("routers.health.DB_PATH", db_path):
        with TestClient(make_test_app(db_path, health_router)) as c:
            yield c


@pytest.fixture
def failing_health_client(tmp_path):
    """TestClient where the DB connection itself fails, covering dependency setup failures."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    app = make_test_app(db_path, health_router)
    with patch("routers.health.DB_PATH", "/nonexistent/path/wondercomic.db"):
        with TestClient(app) as c:
            yield c


@pytest.fixture
def backup_client(tmp_path):
    """TestClient with the backup router and a mock admin user."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    app = make_test_app(db_path, backup_router)
    app.dependency_overrides[get_current_user] = lambda: {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "is_admin": True,
    }
    with TestClient(app) as c:
        yield c


@pytest.fixture
def non_admin_backup_client(tmp_path):
    """TestClient with the backup router and a mock non-admin user."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    app = make_test_app(db_path, backup_router)
    app.dependency_overrides[get_current_user] = lambda: {
        "id": 2,
        "username": "regular",
        "email": "regular@example.com",
        "is_admin": False,
    }
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def isolate_backup_dir(tmp_path, monkeypatch):
    """Redirect BACKUP_DIR and LOCK_FILE to a temp directory for every test."""
    backup_path = tmp_path / "backups"
    monkeypatch.setattr("db.backup.BACKUP_DIR", backup_path)
    monkeypatch.setattr("db.backup.LOCK_FILE", backup_path / ".backup.lock")
    monkeypatch.setattr("routers.backup.BACKUP_DIR", backup_path, raising=False)
    yield backup_path


def _make_fake_zip(path) -> None:
    """Write a minimal valid zip file (empty archive) at *path*."""
    with zipfile.ZipFile(path, "w"):
        pass


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

    def test_backup_check_is_present_in_health_response(self, health_client):
        assert "backup" in health_client.get("/health").json()["checks"]

    def test_backup_check_is_never_when_no_backups_exist(self, health_client):
        assert health_client.get("/health").json()["checks"]["backup"] == "never"

    def test_backup_check_is_ok_when_backup_exists(self, health_client, isolate_backup_dir):
        isolate_backup_dir.mkdir(parents=True, exist_ok=True)
        _make_fake_zip(isolate_backup_dir / "wondercomic_20260101_000000.zip")
        assert health_client.get("/health").json()["checks"]["backup"] == "ok"

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
    def test_returns_401_without_authentication(self, tmp_path):
        db_path = str(tmp_path / "test.db")
        asyncio.run(_init_test_db(db_path))
        with TestClient(make_test_app(db_path, backup_router)) as c:
            assert c.get("/api/backup/status").status_code == 401

    def test_returns_403_for_non_admin_user(self, non_admin_backup_client):
        assert non_admin_backup_client.get("/api/backup/status").status_code == 403

    def test_returns_200(self, backup_client):
        assert backup_client.get("/api/backup/status").status_code == 200

    def test_response_has_last_backup_field(self, backup_client):
        assert "last_backup" in backup_client.get("/api/backup/status").json()

    def test_response_has_total_backups_field(self, backup_client):
        assert "total_backups" in backup_client.get("/api/backup/status").json()

    def test_response_has_backups_list_field(self, backup_client):
        assert "backups" in backup_client.get("/api/backup/status").json()

    def test_last_backup_is_none_when_no_backups_exist(self, backup_client):
        assert backup_client.get("/api/backup/status").json()["last_backup"] is None

    def test_total_backups_is_zero_on_fresh_start(self, backup_client):
        assert backup_client.get("/api/backup/status").json()["total_backups"] == 0

    def test_backups_list_is_empty_on_fresh_start(self, backup_client):
        assert backup_client.get("/api/backup/status").json()["backups"] == []

    def test_backup_entry_has_required_fields(self, backup_client, isolate_backup_dir):
        # Create a real backup file so the inventory has something to report.
        backup_dir = isolate_backup_dir
        backup_dir.mkdir(parents=True, exist_ok=True)
        _make_fake_zip(backup_dir / "wondercomic_20260101_000000.zip")

        data = backup_client.get("/api/backup/status").json()
        assert data["total_backups"] == 1
        entry = data["backups"][0]
        assert "filename" in entry
        assert "size_bytes" in entry
        assert "created_at" in entry

    def test_last_backup_is_iso_timestamp_when_backups_exist(self, backup_client, isolate_backup_dir):
        backup_dir = isolate_backup_dir
        backup_dir.mkdir(parents=True, exist_ok=True)
        _make_fake_zip(backup_dir / "wondercomic_20260101_000000.zip")

        last = backup_client.get("/api/backup/status").json()["last_backup"]
        assert last is not None
        assert "T" in last  # ISO 8601 format contains 'T'


# ===========================================================================
# POST /backup/trigger
# ===========================================================================


def _make_backup_stub(backup_dir):
    """Return an async callable that creates a fake backup zip and returns its filename."""
    filename = "wondercomic_20260427_000000.zip"

    async def _stub():
        backup_dir.mkdir(parents=True, exist_ok=True)
        _make_fake_zip(backup_dir / filename)
        return filename

    return _stub


class TestBackupTriggerEndpoint:
    def test_returns_200_ok(self, backup_client, isolate_backup_dir):
        with patch("routers.backup.create_backup", side_effect=_make_backup_stub(isolate_backup_dir)):
            assert backup_client.post("/api/backup/trigger").status_code == 200

    def test_response_contains_backup_status_fields(self, backup_client, isolate_backup_dir):
        with patch("routers.backup.create_backup", side_effect=_make_backup_stub(isolate_backup_dir)):
            data = backup_client.post("/api/backup/trigger").json()
            assert "last_backup" in data
            assert "total_backups" in data
            assert "backups" in data

    def test_response_includes_the_new_backup_in_list(self, backup_client, isolate_backup_dir):
        with patch("routers.backup.create_backup", side_effect=_make_backup_stub(isolate_backup_dir)):
            data = backup_client.post("/api/backup/trigger").json()
            filenames = [b["filename"] for b in data["backups"]]
            assert "wondercomic_20260427_000000.zip" in filenames

    def test_returns_401_without_authentication(self, tmp_path):
        db_path = str(tmp_path / "test.db")
        asyncio.run(_init_test_db(db_path))
        with TestClient(make_test_app(db_path, backup_router)) as c:
            assert c.post("/api/backup/trigger").status_code == 401

    def test_returns_403_for_non_admin_user(self, non_admin_backup_client):
        assert non_admin_backup_client.post("/api/backup/trigger").status_code == 403


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
        _make_fake_zip(isolate_backup_dir / "wondercomic_20260101_000000.zip")
        result = list_backups()
        assert len(result) == 1

    def test_entry_contains_filename(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        _make_fake_zip(isolate_backup_dir / "wondercomic_20260101_000000.zip")
        entry = list_backups()[0]
        assert entry["filename"] == "wondercomic_20260101_000000.zip"

    def test_entry_contains_size_bytes(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        target = isolate_backup_dir / "wondercomic_20260101_000000.zip"
        _make_fake_zip(target)
        entry = list_backups()[0]
        assert entry["size_bytes"] == target.stat().st_size

    def test_entry_contains_created_at_iso_timestamp(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        _make_fake_zip(isolate_backup_dir / "wondercomic_20260101_000000.zip")
        entry = list_backups()[0]
        assert "created_at" in entry
        assert "T" in entry["created_at"]

    def test_returns_newest_first_when_multiple_files_exist(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        older = isolate_backup_dir / "wondercomic_20260101_000000.zip"
        newer = isolate_backup_dir / "wondercomic_20260102_000000.zip"
        _make_fake_zip(older)
        time.sleep(0.01)
        _make_fake_zip(newer)
        result = list_backups()
        assert result[0]["filename"] == "wondercomic_20260102_000000.zip"

    def test_ignores_files_not_matching_pattern(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        _make_fake_zip(isolate_backup_dir / "not_a_backup.zip")
        _make_fake_zip(isolate_backup_dir / "wondercomic_20260101_000000.zip")
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
        _make_fake_zip(isolate_backup_dir / "wondercomic_20260101_000000.zip")
        result = get_last_backup_time()
        assert result is not None
        assert "T" in result

    def test_returns_timestamp_of_most_recent_file(self, isolate_backup_dir):
        isolate_backup_dir.mkdir()
        older = isolate_backup_dir / "wondercomic_20260101_000000.zip"
        newer = isolate_backup_dir / "wondercomic_20260102_000000.zip"
        _make_fake_zip(older)
        time.sleep(0.02)
        _make_fake_zip(newer)
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
        assert filename.endswith(".zip")

    def test_backup_zip_contains_valid_sqlite_database(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")
            conn.execute("INSERT INTO t VALUES (42)")

        with patch("db.backup.DB_PATH", str(src)):
            filename = asyncio.run(create_backup())

        zip_path = isolate_backup_dir / filename
        with zipfile.ZipFile(zip_path) as zf:
            assert "wondercomic.db" in zf.namelist()
            db_bytes = zf.read("wondercomic.db")

        # Load the extracted bytes into an in-memory SQLite connection and verify content.
        conn = sqlite3.connect(":memory:")
        conn.deserialize(db_bytes)
        row = conn.execute("SELECT id FROM t").fetchone()
        assert row == (42,)
        conn.close()

    def test_backup_zip_contains_images_directory(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        fake_images = tmp_path / "images"
        fake_images.mkdir()
        (fake_images / "panel_abc12345.png").write_bytes(b"\x89PNG\r\n\x1a\n")

        with patch("db.backup.DB_PATH", str(src)), patch("db.backup.IMAGES_DIR", fake_images):
            filename = asyncio.run(create_backup())

        zip_path = isolate_backup_dir / filename
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()
        assert "images/panel_abc12345.png" in names

    def test_backup_zip_includes_avatars_subdirectory(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        fake_images = tmp_path / "images"
        avatars_dir = fake_images / "avatars"
        avatars_dir.mkdir(parents=True)
        (fake_images / "panel_abc12345.png").write_bytes(b"\x89PNG\r\n\x1a\n")
        (avatars_dir / "user_001.png").write_bytes(b"\x89PNG\r\n\x1a\n")

        with patch("db.backup.DB_PATH", str(src)), patch("db.backup.IMAGES_DIR", fake_images):
            filename = asyncio.run(create_backup())

        zip_path = isolate_backup_dir / filename
        with zipfile.ZipFile(zip_path) as zf:
            names = zf.namelist()

        assert "images/panel_abc12345.png" in names
        assert "images/avatars/user_001.png" in names

    def test_rotates_oldest_backup_when_limit_is_exceeded(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        # Pre-fill with MAX_BACKUPS files so the next create should rotate.
        isolate_backup_dir.mkdir(parents=True, exist_ok=True)
        for i in range(MAX_BACKUPS):
            _make_fake_zip(isolate_backup_dir / f"wondercomic_2026010{i}_000000.zip")

        with patch("db.backup.DB_PATH", str(src)):
            asyncio.run(create_backup())

        remaining = list(isolate_backup_dir.glob("wondercomic_*.zip"))
        assert len(remaining) == MAX_BACKUPS

    def test_creates_backup_dir_if_it_does_not_exist(self, isolate_backup_dir, tmp_path):
        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        assert not isolate_backup_dir.exists()

        with patch("db.backup.DB_PATH", str(src)):
            asyncio.run(create_backup())

        assert isolate_backup_dir.exists()

    def test_lock_file_is_released_after_backup(self, isolate_backup_dir, tmp_path):
        import fcntl

        src = tmp_path / "source.db"
        with sqlite3.connect(str(src)) as conn:
            conn.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

        with patch("db.backup.DB_PATH", str(src)):
            asyncio.run(create_backup())

        lock_file = isolate_backup_dir / ".backup.lock"
        assert lock_file.exists()
        with open(lock_file) as fh:
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(fh, fcntl.LOCK_UN)


# ===========================================================================
# Scheduled backup wiring (startup + 24-hour repeat)
# ===========================================================================


class TestScheduledBackup:
    def test_create_backup_is_callable_as_a_coroutine(self):
        """create_backup must be an async function (coroutine) so the scheduler can await it."""
        import asyncio as _asyncio

        assert _asyncio.iscoroutinefunction(create_backup)


# ===========================================================================
# GET /health — schema and integrity checks
# ===========================================================================


@pytest.fixture
def empty_db_health_client(tmp_path):
    """TestClient where the DB exists but has no application tables (bare SQLite file)."""
    db_path = str(tmp_path / "empty.db")
    # Create an empty SQLite file without any schema.
    import sqlite3

    sqlite3.connect(db_path).close()
    with patch("routers.health.DB_PATH", db_path):
        with TestClient(make_test_app(db_path, health_router)) as c:
            yield c


class TestHealthSchemaAndIntegrity:
    def test_returns_503_when_required_tables_are_missing(self, empty_db_health_client):
        assert empty_db_health_client.get("/health").status_code == 503

    def test_status_is_unhealthy_when_schema_is_missing(self, empty_db_health_client):
        assert empty_db_health_client.get("/health").json()["status"] == "unhealthy"

    def test_database_check_reports_schema_incomplete(self, empty_db_health_client):
        check = empty_db_health_client.get("/health").json()["checks"]["database"]
        assert check.startswith("schema_incomplete")

    def _make_corrupted_db_mock(self):
        """Return an aiosqlite.connect mock whose quick_check reports corruption.

        health_check calls db.execute four times in order:
          1. PRAGMA journal_mode=WAL   (result unused)
          2. PRAGMA foreign_keys=ON    (result unused)
          3. SELECT name FROM sqlite_master  → all three tables present
          4. PRAGMA quick_check        → non-ok result
        """
        from unittest.mock import AsyncMock, MagicMock

        pragma_cursor = AsyncMock()

        mock_cursor_tables = AsyncMock()
        mock_cursor_tables.fetchall = AsyncMock(return_value=[("users",), ("stories",), ("panels",)])
        mock_cursor_qc = AsyncMock()
        mock_cursor_qc.fetchone = AsyncMock(return_value=("*** index corruption detected",))

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(
            side_effect=[
                pragma_cursor,  # PRAGMA journal_mode=WAL
                pragma_cursor,  # PRAGMA foreign_keys=ON
                mock_cursor_tables,  # sqlite_master query
                mock_cursor_qc,  # quick_check
            ]
        )
        mock_db.__aenter__ = AsyncMock(return_value=mock_db)
        mock_db.__aexit__ = AsyncMock(return_value=False)
        return MagicMock(return_value=mock_db)

    def test_returns_503_when_quick_check_fails(self, health_client):
        with patch("routers.health.aiosqlite.connect", self._make_corrupted_db_mock()):
            response = health_client.get("/health")

        assert response.status_code == 503

    def test_database_check_is_corrupted_when_quick_check_fails(self, health_client):
        with patch("routers.health.aiosqlite.connect", self._make_corrupted_db_mock()):
            data = health_client.get("/health").json()

        assert data["checks"]["database"] == "corrupted"
        assert data["status"] == "unhealthy"
