"""
Cross-router integration tests.

Each test exercises a realistic multi-step user flow that spans two or more
routers. This catches bugs that per-router unit tests miss — e.g. a JWT minted
by auth.py that user.py or friend.py silently rejects.

Generation routes (Gemini) are excluded from flow tests because they make real
API calls. Auth-gating tests for generation routes are included — they return
401 before any LLM call is made.

Run:
    cd backend && uv run pytest tests/test_integration.py -v
"""

import asyncio

import pytest
from fastapi.testclient import TestClient

from routers.auth import router as auth_router
from routers.friend import router as friend_router
from routers.generation import router as generation_router
from routers.stories import router as stories_router
from routers.user import router as user_router
from tests.conftest import _init_test_db, make_test_app

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}
_BOB = {"username": "bob", "email": "bob@example.com", "password": "Password456!"}
_CHARLIE = {"username": "charlie", "email": "charlie@example.com", "password": "Password789!"}

_STORY_PAYLOAD = {
    "profile": {
        "name": "Zara",
        "gender": "girl",
        "skin_tone": "medium",
        "hair_color": "black",
        "eye_color": "brown",
        "favorite_color": "purple",
    },
    "title": "Zara and the Dragon",
    "panels": [],
}

# Story payload with two panels — needed for PATCH panel image tests.
_STORY_WITH_PANELS = {
    "profile": {
        "name": "Zara",
        "gender": "girl",
        "skin_tone": "medium",
        "hair_color": "black",
        "eye_color": "brown",
        "favorite_color": "purple",
    },
    "title": "Zara and the Dragon",
    "panels": [
        {"panel_order": 0, "text": "Once upon a time..."},
        {"panel_order": 1, "text": "The dragon roared."},
    ],
}

# Minimal valid base64 PNG (1×1 white pixel) — used to exercise image-writing paths.
_FAKE_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


@pytest.fixture
def client(tmp_path):
    """All non-generation routers, fresh DB per test."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, user_router, friend_router, stories_router)) as c:
        yield c


@pytest.fixture
def gen_client(tmp_path):
    """Auth + generation routers only. Used for auth-gate tests that must not hit Gemini."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, generation_router)) as c:
        yield c


def _signup(client, payload: dict) -> tuple[int, dict]:
    """Sign up, return (user_id, auth_headers)."""
    r = client.post("/api/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    me = client.get("/api/users/me", headers=headers)
    assert me.status_code == 200, me.text
    return me.json()["id"], headers


# ---------------------------------------------------------------------------
# Flow 1: Full auth lifecycle — signup → login → logout → protected endpoint rejected
# ---------------------------------------------------------------------------


def test_auth_lifecycle(client):
    """
    Signup gives a working token.
    Login gives a fresh token.
    After logout the user is set offline (is_online=False).
    A stale token still authenticates (stateless JWT), but is_online reflects logout.
    """
    #   1. POST /api/auth/signup with _ALICE, assert 200 and access_token in response
    alice_id, alice_h = _signup(client, _ALICE)
    #   2. POST /api/auth/login with alice's email + password
    login_r = client.post("/api/auth/login", json={"email": _ALICE["email"], "password": _ALICE["password"]})
    #   3. Assert login also returns a token
    assert login_r.status_code == 200
    assert "access_token" in login_r.json()
    #   4. GET /api/users/me with signup token → assert is_online=True
    me_r = client.get("/api/users/me", headers=alice_h)
    assert me_r.status_code == 200
    assert me_r.json()["is_online"] is True
    #   5. POST /api/auth/logout with the token
    logout_r = client.post("/api/auth/logout", headers=alice_h)
    assert logout_r.status_code == 200
    #   6. GET /api/users/me again → assert is_online=False
    me_after = client.get("/api/users/me", headers=alice_h)
    assert me_after.status_code == 200
    assert me_after.json()["is_online"] is False


# ---------------------------------------------------------------------------
# Flow 2: Profile update visible via public endpoint
# ---------------------------------------------------------------------------


def test_profile_update_visible_publicly(client):
    """
    Alice updates her username via PATCH /api/users/me.
    The change is immediately visible on the unauthenticated GET /api/users/{id}.
    """
    alice_id, alice_h = _signup(client, _ALICE)

    r = client.patch("/api/users/me", json={"username": "alice_updated", "email": _ALICE["email"]}, headers=alice_h)
    assert r.status_code == 200, r.text
    assert r.json()["username"] == "alice_updated"

    # Public endpoint — no auth header
    pub = client.get(f"/api/users/{alice_id}")
    assert pub.status_code == 200
    assert pub.json()["username"] == "alice_updated"


# ---------------------------------------------------------------------------
# Flow 3: Full friendship state machine
# ---------------------------------------------------------------------------


def test_friendship_full_lifecycle(client):
    """
    send → pending → accept → friends list → delete → empty again.
    Covers the most common happy path across auth + friend routers.
    """
    alice_id, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)

    # Alice sends request to Bob
    r = client.post(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200, r.text

    # Bob sees it in /pending
    pending = client.get("/api/friends/pending", headers=bob_h).json()
    assert any(p["username"] == "alice" for p in pending)

    # Bob accepts
    r = client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)
    assert r.status_code == 200, r.text

    # Both see each other in /friends
    assert any(f["username"] == "bob" for f in client.get("/api/friends/", headers=alice_h).json())
    assert any(f["username"] == "alice" for f in client.get("/api/friends/", headers=bob_h).json())

    # Alice removes Bob
    r = client.delete(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200

    # Both lists are empty again
    assert client.get("/api/friends/", headers=alice_h).json() == []
    assert client.get("/api/friends/", headers=bob_h).json() == []


def test_duplicate_request_after_deletion_is_allowed(client):
    """
    After a friendship is deleted, either user should be able to re-send a request.
    This tests that DELETE fully cleans the row rather than soft-deleting it.
    """
    alice_id, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)

    #   1. Alice sends request to Bob
    r = client.post(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200, r.text
    #   2. Bob accepts
    r = client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)
    assert r.status_code == 200, r.text
    #   3. Alice deletes the friendship
    r = client.delete(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200, r.text
    #   4. Bob sends a new request to Alice  ← this is the critical assertion
    r = client.post(f"/api/friends/{alice_id}", headers=bob_h)
    assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# Flow 4: Story CRUD — create → list → get → delete
# ---------------------------------------------------------------------------


def test_story_full_lifecycle(client):
    """
    A user creates a story, sees it in the list, fetches it by ID, then deletes it.
    Stories routes require auth — sign up Alice and use her token throughout.
    """
    _, alice_h = _signup(client, _ALICE)

    # Create
    r = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h)
    assert r.status_code == 200, r.text
    story_id = r.json()["id"]
    assert r.json()["title"] == "Zara and the Dragon"
    assert r.json()["visibility"] == "private"

    # List — new story appears
    listing = client.get("/api/stories", headers=alice_h).json()
    assert any(s["id"] == story_id for s in listing)

    # Get by ID
    detail = client.get(f"/api/stories/{story_id}", headers=alice_h)
    assert detail.status_code == 200
    assert detail.json()["profile"]["name"] == "Zara"

    # Delete
    r = client.delete(f"/api/stories/{story_id}", headers=alice_h)
    assert r.status_code == 204

    # Confirm gone
    assert client.get(f"/api/stories/{story_id}", headers=alice_h).status_code == 404
    assert all(s["id"] != story_id for s in client.get("/api/stories", headers=alice_h).json())


def test_get_nonexistent_story_returns_404(client):
    _, alice_h = _signup(client, _ALICE)
    r = client.get("/api/stories/9999", headers=alice_h)
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Flow 5: Auth token gates — protected routes reject missing / malformed tokens
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/users/me"),
        ("PATCH", "/api/users/me"),
        ("GET", "/api/friends/"),
        ("GET", "/api/friends/pending"),
        ("POST", "/api/auth/logout"),
        # Story routes
        ("GET", "/api/stories"),
        ("POST", "/api/stories"),
        ("GET", "/api/stories/1"),
        ("PATCH", "/api/stories/1"),
        ("PATCH", "/api/stories/1/visibility"),
        ("DELETE", "/api/stories/1"),
        ("PATCH", "/api/stories/1/panels/0"),
        ("GET", "/api/friends/1/stories"),
        ("GET", "/api/friends/1/stories/1"),
    ],
)
def test_protected_routes_reject_no_token(client, method, path):
    """Every route that requires auth must return 401 with no Authorization header."""
    r = client.request(method, path)
    assert r.status_code == 401


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/users/me"),
        ("GET", "/api/friends/"),
        ("GET", "/api/stories"),
        ("GET", "/api/stories/1"),
    ],
)
def test_protected_routes_reject_bad_token(client, method, path):
    """Garbage token must return 401, not 500."""
    r = client.request(method, path, headers={"Authorization": "Bearer not.a.real.token"})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# Flow 6: Cross-user isolation — one user cannot act on another's data
# ---------------------------------------------------------------------------


def test_cannot_delete_someone_elses_friendship(client):
    """
    Charlie has no relationship with Alice or Bob.
    Charlie's DELETE on bob_id must return 404 — not silently remove Bob's
    friendship with Alice.
    """
    alice_id, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)
    _, charlie_h = _signup(client, _CHARLIE)

    # Alice and Bob become friends
    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    # Charlie tries to delete bob from alice's friend list
    r = client.delete(f"/api/friends/{bob_id}", headers=charlie_h)
    assert r.status_code == 404

    # Alice and Bob are still friends
    assert any(f["username"] == "bob" for f in client.get("/api/friends/", headers=alice_h).json())


def test_pending_list_scoped_to_current_user(client):
    """
    Alice sends requests to both Bob and Charlie.
    Bob's /pending must contain only Alice's request to him — not the one
    sent to Charlie.
    """
    _, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)
    charlie_id, charlie_h = _signup(client, _CHARLIE)

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{charlie_id}", headers=alice_h)

    bob_pending = client.get("/api/friends/pending", headers=bob_h).json()
    charlie_pending = client.get("/api/friends/pending", headers=charlie_h).json()

    assert len(bob_pending) == 1 and bob_pending[0]["username"] == "alice"
    assert len(charlie_pending) == 1 and charlie_pending[0]["username"] == "alice"


def test_friends_list_scoped_to_current_user(client):
    """
    Alice–Bob are friends. Charlie–Bob are friends.
    Alice's /friends must not include Charlie, even though Charlie shares Bob.
    """
    alice_id, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)
    charlie_id, charlie_h = _signup(client, _CHARLIE)

    # Alice ↔ Bob
    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    # Charlie ↔ Bob
    client.post(f"/api/friends/{bob_id}", headers=charlie_h)
    client.post(f"/api/friends/{charlie_id}/accept", headers=bob_h)

    alice_friends = client.get("/api/friends/", headers=alice_h).json()
    usernames = [f["username"] for f in alice_friends]
    assert "bob" in usernames
    assert "charlie" not in usernames


# ---------------------------------------------------------------------------
# Flow 7: Story PATCH endpoints
# ---------------------------------------------------------------------------


def test_patch_story_updates_is_unlocked(client):
    """PATCH /api/stories/{id} can flip is_unlocked and returns the updated story."""
    _, alice_h = _signup(client, _ALICE)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]

    r = client.patch(
        f"/api/stories/{story_id}",
        json={"is_unlocked": False, "panels": []},
        headers=alice_h,
    )
    assert r.status_code == 200, r.text
    assert r.json()["is_unlocked"] is False

    # Flip back
    r2 = client.patch(
        f"/api/stories/{story_id}",
        json={"is_unlocked": True, "panels": []},
        headers=alice_h,
    )
    assert r2.status_code == 200
    assert r2.json()["is_unlocked"] is True


def test_owner_can_update_story_visibility(client):
    """PATCH /api/stories/{id}/visibility updates the story sharing state."""
    _, alice_h = _signup(client, _ALICE)
    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]

    r = client.patch(
        f"/api/stories/{story_id}/visibility",
        json={"visibility": "shared_with_friends"},
        headers=alice_h,
    )
    assert r.status_code == 200, r.text
    assert r.json()["visibility"] == "shared_with_friends"

    listing = client.get("/api/stories", headers=alice_h)
    assert listing.status_code == 200
    assert listing.json()[0]["visibility"] == "shared_with_friends"


def test_patch_story_nonexistent_returns_404(client):
    """PATCH on a story ID that doesn't exist must return 404."""
    _, alice_h = _signup(client, _ALICE)
    r = client.patch("/api/stories/9999", json={"is_unlocked": True, "panels": []}, headers=alice_h)
    assert r.status_code == 404


def test_patch_panel_image_updates_panel(client):
    """PATCH /api/stories/{id}/panels/{order} saves a new image and returns 204."""
    _, alice_h = _signup(client, _ALICE)

    story_id = client.post("/api/stories", json=_STORY_WITH_PANELS, headers=alice_h).json()["id"]

    r = client.patch(
        f"/api/stories/{story_id}/panels/0",
        json={"image_base64": _FAKE_IMAGE_B64},
        headers=alice_h,
    )
    assert r.status_code == 204


def test_patch_panel_image_nonexistent_panel_returns_404(client):
    """PATCH on a panel_order that doesn't exist in the story must return 404."""
    _, alice_h = _signup(client, _ALICE)

    story_id = client.post("/api/stories", json=_STORY_WITH_PANELS, headers=alice_h).json()["id"]

    r = client.patch(
        f"/api/stories/{story_id}/panels/99",  # panel_order=99 does not exist
        json={"image_base64": _FAKE_IMAGE_B64},
        headers=alice_h,
    )
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Flow 8: Story cross-user isolation
# ---------------------------------------------------------------------------


def test_story_list_scoped_to_current_user(client):
    """GET /api/stories returns only the authenticated user's stories."""
    _, alice_h = _signup(client, _ALICE)
    _, bob_h = _signup(client, _BOB)

    client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h)

    # Bob's list must be empty — he cannot see Alice's story
    bob_stories = client.get("/api/stories", headers=bob_h).json()
    assert bob_stories == []


def test_cannot_get_another_users_story(client):
    """GET /api/stories/{id} returns 404 when the story belongs to a different user."""
    _, alice_h = _signup(client, _ALICE)
    _, bob_h = _signup(client, _BOB)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]

    r = client.get(f"/api/stories/{story_id}", headers=bob_h)
    assert r.status_code == 404


def test_cannot_patch_another_users_story(client):
    """PATCH /api/stories/{id} returns 404 when the story belongs to a different user."""
    _, alice_h = _signup(client, _ALICE)
    _, bob_h = _signup(client, _BOB)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]

    r = client.patch(
        f"/api/stories/{story_id}",
        json={"is_unlocked": False, "panels": []},
        headers=bob_h,
    )
    assert r.status_code == 404


def test_cannot_delete_another_users_story(client):
    """DELETE /api/stories/{id} returns 404 when the story belongs to a different user."""
    _, alice_h = _signup(client, _ALICE)
    _, bob_h = _signup(client, _BOB)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]

    r = client.delete(f"/api/stories/{story_id}", headers=bob_h)
    assert r.status_code == 404

    # Alice's story must still exist
    assert client.get(f"/api/stories/{story_id}", headers=alice_h).status_code == 200


def test_accepted_friend_can_list_and_open_shared_story(client):
    """Accepted friends can browse only stories shared with friends."""
    alice_id, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]
    client.patch(
        f"/api/stories/{story_id}/visibility",
        json={"visibility": "shared_with_friends"},
        headers=alice_h,
    )

    listing = client.get(f"/api/friends/{alice_id}/stories", headers=bob_h)
    assert listing.status_code == 200
    assert [story["id"] for story in listing.json()] == [story_id]

    detail = client.get(f"/api/friends/{alice_id}/stories/{story_id}", headers=bob_h)
    assert detail.status_code == 200
    assert detail.json()["visibility"] == "shared_with_friends"


def test_non_friend_cannot_list_shared_library(client):
    """Only accepted friends can browse a user's shared library."""
    alice_id, alice_h = _signup(client, _ALICE)
    _, bob_h = _signup(client, _BOB)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]
    client.patch(
        f"/api/stories/{story_id}/visibility",
        json={"visibility": "shared_with_friends"},
        headers=alice_h,
    )

    listing = client.get(f"/api/friends/{alice_id}/stories", headers=bob_h)
    assert listing.status_code == 404


def test_accepted_friend_cannot_see_private_story(client):
    """Friend library hides private stories from accepted friends."""
    alice_id, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]

    listing = client.get(f"/api/friends/{alice_id}/stories", headers=bob_h)
    assert listing.status_code == 200
    assert listing.json() == []

    detail = client.get(f"/api/friends/{alice_id}/stories/{story_id}", headers=bob_h)
    assert detail.status_code == 404


def test_unfriending_immediately_removes_shared_story_access(client):
    """Removing the friendship cuts off access to previously shared stories."""
    alice_id, alice_h = _signup(client, _ALICE)
    bob_id, bob_h = _signup(client, _BOB)

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    story_id = client.post("/api/stories", json=_STORY_PAYLOAD, headers=alice_h).json()["id"]
    client.patch(
        f"/api/stories/{story_id}/visibility",
        json={"visibility": "shared_with_friends"},
        headers=alice_h,
    )

    assert client.get(f"/api/friends/{alice_id}/stories", headers=bob_h).status_code == 200

    remove = client.delete(f"/api/friends/{alice_id}", headers=bob_h)
    assert remove.status_code == 200

    assert client.get(f"/api/friends/{alice_id}/stories", headers=bob_h).status_code == 404


# ---------------------------------------------------------------------------
# Flow 9: Generation routes — auth gating (no Gemini calls made)
# ---------------------------------------------------------------------------
# get_current_user runs before any handler logic, so a missing token returns
# 401 without touching the LLM at all.


@pytest.mark.parametrize(
    "path",
    [
        "/api/stories/generate",
        "/api/generate/story-script",
        "/api/generate/panel-image",
        "/api/generate/edit-image",
    ],
)
def test_generation_routes_reject_no_token(gen_client, path):
    """All generation endpoints must return 401 with no Authorization header."""
    r = gen_client.post(path)
    assert r.status_code == 401


@pytest.mark.parametrize(
    "path",
    [
        "/api/stories/generate",
        "/api/generate/story-script",
        "/api/generate/panel-image",
        "/api/generate/edit-image",
    ],
)
def test_generation_routes_reject_bad_token(gen_client, path):
    """All generation endpoints must return 401 with a garbage token."""
    r = gen_client.post(path, headers={"Authorization": "Bearer not.a.real.token"})
    assert r.status_code == 401
