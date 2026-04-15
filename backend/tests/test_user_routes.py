"""
Integration tests for /api/users/* routes.

Uses the same TestClient + make_test_app pattern as test_auth_routes.py.
Each test gets a fresh file-based SQLite DB via tmp_path, with per-request
connections — matching how production get_db works.

Run:
    cd backend && uv run pytest tests/test_user_routes.py -v
"""

import asyncio
import io

import aiosqlite
import pytest
from fastapi.testclient import TestClient

import routers.user as user_module
from routers.auth import router as auth_router
from routers.user import router as user_router
from tests.conftest import _init_test_db, make_test_app

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_SIGNUP_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}
_SIGNUP_BOB = {"username": "bob", "email": "bob@example.com", "password": "Password456!"}


@pytest.fixture
def client(tmp_path):
    """Fresh DB + TestClient per test. Includes both auth and user routers."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, user_router)) as c:
        yield c


@pytest.fixture
def alice(client):
    """Sign up alice and return her auth headers."""
    resp = client.post("/api/auth/signup", json=_SIGNUP_ALICE)
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def bob(client):
    """Sign up bob (used in conflict tests)."""
    resp = client.post("/api/auth/signup", json=_SIGNUP_BOB)
    assert resp.status_code == 200


@pytest.fixture
def image_dir(tmp_path, monkeypatch):
    """Redirect _IMAGE_DIR to a temp dir so avatar tests don't write real files."""
    monkeypatch.setattr(user_module, "_IMAGE_DIR", tmp_path)
    return tmp_path


# ---------------------------------------------------------------------------
# GET /api/users/me
# ---------------------------------------------------------------------------


def test_get_me_returns_profile(client, alice):
    r = client.get("/api/users/me", headers=alice)
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "alice"
    assert data["email"] == "alice@example.com"
    assert data["is_online"] is False  # signup does not set is_online; only login does


def test_get_me_no_token_returns_401(client):
    r = client.get("/api/users/me")
    assert r.status_code == 401


def test_get_me_invalid_token_returns_401(client):
    r = client.get("/api/users/me", headers={"Authorization": "Bearer notavalidtoken"})
    assert r.status_code == 401


def test_get_me_token_for_deleted_user_returns_401(client):
    """Token is valid JWT but references a user that doesn't exist in DB."""
    from auth_utils import create_access_token

    token = create_access_token(9999)
    r = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/users/me
# ---------------------------------------------------------------------------


def test_update_username(client, alice):
    r = client.patch("/api/users/me", json={"username": "alice2", "email": None}, headers=alice)
    assert r.status_code == 200
    assert r.json()["username"] == "alice2"


def test_update_email(client, alice):
    r = client.patch("/api/users/me", json={"username": None, "email": "new@example.com"}, headers=alice)
    assert r.status_code == 200
    assert r.json()["email"] == "new@example.com"


def test_update_both_fields(client, alice):
    r = client.patch("/api/users/me", json={"username": "updated", "email": "updated@example.com"}, headers=alice)
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "updated"
    assert data["email"] == "updated@example.com"


def test_update_no_fields_returns_current_profile(client, alice):
    """Sending null for both fields is a no-op — returns the unchanged profile."""
    r = client.patch("/api/users/me", json={"username": None, "email": None}, headers=alice)
    assert r.status_code == 200
    assert r.json()["username"] == "alice"


def test_update_duplicate_username_returns_409(client, alice, bob):
    r = client.patch("/api/users/me", json={"username": "bob", "email": None}, headers=alice)
    assert r.status_code == 409
    assert "username" in r.json()["detail"].lower()


def test_update_duplicate_email_returns_409(client, alice, bob):
    r = client.patch("/api/users/me", json={"username": None, "email": "bob@example.com"}, headers=alice)
    assert r.status_code == 409
    assert "email" in r.json()["detail"].lower()


def test_update_requires_auth(client):
    r = client.patch("/api/users/me", json={"username": "hacker", "email": None})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/users/me/avatar
# ---------------------------------------------------------------------------

_JPEG = b"\xff\xd8\xff" + b"\x00" * 64
_PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
_WEBP = b"RIFF\x00\x00\x00\x00WEBP" + b"\x00" * 64


def test_upload_avatar_jpeg(client, alice, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("photo.jpg", io.BytesIO(_JPEG), "image/jpeg")},
        headers=alice,
    )
    assert r.status_code == 200
    avatar_url = r.json()["avatar_url"]
    assert avatar_url is not None
    assert avatar_url.startswith("avatars/")
    assert (image_dir / avatar_url).exists()


def test_upload_avatar_png(client, alice, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("photo.png", io.BytesIO(_PNG), "image/png")},
        headers=alice,
    )
    assert r.status_code == 200


def test_upload_avatar_webp(client, alice, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("photo.webp", io.BytesIO(_WEBP), "image/webp")},
        headers=alice,
    )
    assert r.status_code == 200


def test_upload_avatar_wrong_type_returns_415(client, alice, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("resume.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")},
        headers=alice,
    )
    assert r.status_code == 415


def test_upload_avatar_too_large_returns_413(client, alice, image_dir):
    big = io.BytesIO(_JPEG + b"\x00" * (6 * 1024 * 1024))  # ~6 MB
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("big.jpg", big, "image/jpeg")},
        headers=alice,
    )
    assert r.status_code == 413


def test_upload_avatar_too_large_cleans_up_partial_file(client, alice, image_dir):
    """Partial file written during chunked read must be removed on 413."""
    big = io.BytesIO(_JPEG + b"\x00" * (6 * 1024 * 1024))
    client.post(
        "/api/users/me/avatar",
        files={"file": ("big.jpg", big, "image/jpeg")},
        headers=alice,
    )
    leftover = list((image_dir / "avatars").glob("*.jpg")) if (image_dir / "avatars").exists() else []
    assert leftover == [], "Partial file should be cleaned up after 413"


def test_upload_avatar_deletes_old_file(client, tmp_path, alice, image_dir):
    """Uploading a new avatar removes the previous file from disk."""
    # Plant the old file and record it in the DB directly (no endpoint for this)
    old_dir = image_dir / "avatars"
    old_dir.mkdir(parents=True, exist_ok=True)
    old_file = old_dir / "old_avatar.jpg"
    old_file.write_bytes(b"old image data")

    db_path = str(tmp_path / "test.db")

    async def _seed_old_avatar():
        async with aiosqlite.connect(db_path) as db:
            await db.execute(
                "UPDATE users SET avatar_path = ? WHERE username = 'alice'",
                ("avatars/old_avatar.jpg",),
            )
            await db.commit()

    asyncio.run(_seed_old_avatar())

    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("new.jpg", io.BytesIO(_JPEG), "image/jpeg")},
        headers=alice,
    )
    assert r.status_code == 200
    assert not old_file.exists(), "Old avatar file should have been deleted after upload"


def test_upload_avatar_preserves_default_avatar(client, alice, image_dir):
    """The default-avatar.png must never be deleted, even after a custom upload."""
    default_file = image_dir / "default-avatar.png"
    default_file.write_bytes(b"default image data")

    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("custom.jpg", io.BytesIO(_JPEG), "image/jpeg")},
        headers=alice,
    )
    assert r.status_code == 200
    assert default_file.exists(), "Default avatar must not be deleted"


def test_upload_avatar_requires_auth(client, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("photo.jpg", io.BytesIO(_JPEG), "image/jpeg")},
    )
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/users/{user_id}
# ---------------------------------------------------------------------------


def test_get_public_profile_found(client, alice):
    # get alice's id from /me first
    user_id = client.get("/api/users/me", headers=alice).json()["id"]
    r = client.get(f"/api/users/{user_id}")
    assert r.status_code == 200
    assert r.json()["username"] == "alice"


def test_get_public_profile_requires_no_auth(client, alice):
    """Public profile endpoint must be accessible without any token."""
    user_id = client.get("/api/users/me", headers=alice).json()["id"]
    r = client.get(f"/api/users/{user_id}")  # intentionally no headers
    assert r.status_code == 200


def test_get_public_profile_not_found(client):
    r = client.get("/api/users/9999")
    assert r.status_code == 404
