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


def test_update_invalid_email_returns_422(client, alice):
    r = client.patch("/api/users/me", json={"username": None, "email": "not-an-email"}, headers=alice)
    assert r.status_code == 422


def test_update_empty_username_returns_422(client, alice):
    r = client.patch("/api/users/me", json={"username": "", "email": None}, headers=alice)
    assert r.status_code == 422


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


def test_upload_avatar_ignores_client_filename_extension(client, alice, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("avatar.html", io.BytesIO(_PNG), "image/png")},
        headers=alice,
    )
    assert r.status_code == 200
    avatar_url = r.json()["avatar_url"]
    assert avatar_url is not None
    assert avatar_url.endswith(".png")
    assert not avatar_url.endswith(".html")
    assert (image_dir / avatar_url).exists()


def test_upload_avatar_webp(client, alice, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("photo.webp", io.BytesIO(_WEBP), "image/webp")},
        headers=alice,
    )
    assert r.status_code == 200


def test_upload_avatar_rejects_non_image_content_with_image_content_type(client, alice, image_dir):
    r = client.post(
        "/api/users/me/avatar",
        files={"file": ("avatar.html", io.BytesIO(b"<html>not an image</html>"), "image/png")},
        headers=alice,
    )
    assert r.status_code == 415


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
    assert "email" not in r.json()


def test_get_public_profile_requires_no_auth(client, alice):
    """Public profile endpoint must be accessible without any token."""
    user_id = client.get("/api/users/me", headers=alice).json()["id"]
    r = client.get(f"/api/users/{user_id}")  # intentionally no headers
    assert r.status_code == 200


def test_get_public_profile_not_found(client):
    r = client.get("/api/users/9999")
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/users/search
# ---------------------------------------------------------------------------


def _signup(client, username: str, email: str | None = None, password: str = "Password123!") -> None:
    """Helper: sign up an extra user. Used to seed search results."""
    email = email or f"{username}@example.com"
    r = client.post("/api/auth/signup", json={"username": username, "email": email, "password": password})
    assert r.status_code == 200, r.text


def test_search_requires_auth(client):
    r = client.get("/api/users/search", params={"q": "ali"})
    assert r.status_code == 401


def test_search_rejects_empty_q(client, alice):
    """min_length=1 on the Query validator → FastAPI returns 422 before the handler runs."""
    r = client.get("/api/users/search", params={"q": ""}, headers=alice)
    assert r.status_code == 422


def test_search_rejects_missing_q(client, alice):
    """q is required (Query(...))."""
    r = client.get("/api/users/search", headers=alice)
    assert r.status_code == 422


def test_search_rejects_too_long_q(client, alice):
    """max_length=50 → 51-char query is rejected."""
    r = client.get("/api/users/search", params={"q": "a" * 51}, headers=alice)
    assert r.status_code == 422


def test_search_accepts_boundary_lengths(client, alice):
    """Length 1 and length 50 are both inside the allowed range."""
    r1 = client.get("/api/users/search", params={"q": "a"}, headers=alice)
    assert r1.status_code == 200
    r50 = client.get("/api/users/search", params={"q": "a" * 50}, headers=alice)
    assert r50.status_code == 200


def test_search_finds_substring_match(client, alice, bob):
    r = client.get("/api/users/search", params={"q": "bo"}, headers=alice)
    assert r.status_code == 200
    usernames = [u["username"] for u in r.json()]
    assert "bob" in usernames


def test_search_is_case_insensitive(client, alice, bob):
    """SQL uses COLLATE NOCASE → uppercase query still matches lowercase username."""
    r = client.get("/api/users/search", params={"q": "BOB"}, headers=alice)
    assert r.status_code == 200
    assert any(u["username"] == "bob" for u in r.json())


def test_search_excludes_caller(client, alice):
    """Searching for the caller's own username must not return the caller."""
    r = client.get("/api/users/search", params={"q": "ali"}, headers=alice)
    assert r.status_code == 200
    assert all(u["username"] != "alice" for u in r.json())


def test_search_no_match_returns_empty_list(client, alice):
    """No results is a 200 with [] — not a 404."""
    r = client.get("/api/users/search", params={"q": "zzzzznomatch"}, headers=alice)
    assert r.status_code == 200
    assert r.json() == []


def test_search_response_is_public_shape(client, alice, bob):
    """Response must match PublicUserResponse — no email leakage."""
    r = client.get("/api/users/search", params={"q": "bob"}, headers=alice)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    entry = body[0]
    assert set(entry.keys()) == {"id", "username", "avatar_url", "is_online", "created_at"}
    assert "email" not in entry
    assert "password_hash" not in entry


def test_search_results_are_alpha_sorted(client, alice):
    """ORDER BY username COLLATE NOCASE ASC — mixed-case usernames sort case-insensitively."""
    _signup(client, "Charlie_test")
    _signup(client, "bravo_test")
    _signup(client, "alpha_test")
    r = client.get("/api/users/search", params={"q": "_test"}, headers=alice)
    assert r.status_code == 200
    usernames = [u["username"] for u in r.json()]
    assert usernames == sorted(usernames, key=str.lower)


def test_search_limit_caps_at_ten(client, alice):
    """Default limit in crud is 10 — seeding 12 matches must return at most 10."""
    for i in range(12):
        _signup(client, f"matcher{i:02d}", email=f"matcher{i:02d}@example.com")
    r = client.get("/api/users/search", params={"q": "matcher"}, headers=alice)
    assert r.status_code == 200
    assert len(r.json()) == 10


def test_search_escapes_like_wildcards(client, alice, bob):
    """'%' and '_' in the query must be treated as literal characters, not SQL wildcards.

    Without escaping, q='%' would match every username. The CRUD escapes %, _, and \\
    and uses ESCAPE '\\' in the LIKE clause.
    """
    r = client.get("/api/users/search", params={"q": "%"}, headers=alice)
    assert r.status_code == 200
    # bob has no '%' in his username → should NOT appear
    assert all(u["username"] != "bob" for u in r.json())


def test_search_strips_whitespace(client, alice, bob):
    """The CRUD strips whitespace from q before running the LIKE query."""
    r = client.get("/api/users/search", params={"q": "   bob   "}, headers=alice)
    assert r.status_code == 200
    assert any(u["username"] == "bob" for u in r.json())
