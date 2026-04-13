"""
Integration tests for /api/friends/* routes.

Uses the same TestClient + make_test_app pattern as test_user_routes.py:
a fresh file-based SQLite DB per test via tmp_path, with per-request
connections that mirror how production get_db works.

Run:
    cd backend && uv run pytest tests/test_friend_routes.py -v
"""

import asyncio

import pytest
from fastapi.testclient import TestClient

from routers.auth import router as auth_router
from routers.friend import router as friend_router
from routers.user import router as user_router
from tests.conftest import _init_test_db, make_test_app

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

_SIGNUP_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}
_SIGNUP_BOB = {"username": "bob", "email": "bob@example.com", "password": "Password456!"}
_SIGNUP_CHARLIE = {"username": "charlie", "email": "charlie@example.com", "password": "Password789!"}


@pytest.fixture
def client(tmp_path):
    """Fresh DB + TestClient per test. Mounts auth, user, and friend routers."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, user_router, friend_router)) as c:
        yield c


def _signup(client, payload: dict) -> tuple[int, dict]:
    """Sign up a user and return (user_id, auth_headers)."""
    r = client.post("/api/auth/signup", json=payload)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    # Resolve the user id via /me so tests don't depend on insert order
    me = client.get("/api/users/me", headers=headers)
    assert me.status_code == 200, me.text
    return me.json()["id"], headers


@pytest.fixture
def alice(client):
    return _signup(client, _SIGNUP_ALICE)  # (id, headers)


@pytest.fixture
def bob(client):
    return _signup(client, _SIGNUP_BOB)


@pytest.fixture
def charlie(client):
    return _signup(client, _SIGNUP_CHARLIE)


# ---------------------------------------------------------------------------
# GET /api/friends/  — list accepted friends
# ---------------------------------------------------------------------------


def test_list_friends_empty(client, alice):
    _, alice_h = alice
    r = client.get("/api/friends/", headers=alice_h)
    assert r.status_code == 200
    assert r.json() == []


def test_list_friends_returns_accepted_only(client, alice, bob, charlie):
    """Only friendships in state 'accepted' appear in GET /."""
    alice_id, alice_h = alice
    bob_id, bob_h = bob
    charlie_id, _ = charlie

    # alice -> bob and accept
    assert client.post(f"/api/friends/{bob_id}", headers=alice_h).status_code == 200
    assert client.post(f"/api/friends/{alice_id}/accept", headers=bob_h).status_code == 200

    # alice -> charlie (left pending)
    assert client.post(f"/api/friends/{charlie_id}", headers=alice_h).status_code == 200

    r = client.get("/api/friends/", headers=alice_h)
    assert r.status_code == 200
    friends = r.json()
    assert len(friends) == 1
    assert friends[0]["username"] == "bob"
    assert friends[0]["friendship_status"] == "accepted"
    # alice was the requester, so is_requester should be True from her POV
    assert friends[0]["is_requester"] is True


def test_list_friends_is_symmetric(client, alice, bob):
    """Both ends see the same friendship after acceptance."""
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    alice_friends = client.get("/api/friends/", headers=alice_h).json()
    bob_friends = client.get("/api/friends/", headers=bob_h).json()

    assert [f["username"] for f in alice_friends] == ["bob"]
    assert [f["username"] for f in bob_friends] == ["alice"]
    # Requester flag must flip based on viewer
    assert alice_friends[0]["is_requester"] is True  # alice sent it
    assert bob_friends[0]["is_requester"] is False  # bob received it


def test_list_friends_requires_auth(client):
    r = client.get("/api/friends/")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/friends/pending  — incoming pending requests
# ---------------------------------------------------------------------------


def test_list_pending_empty(client, alice):
    _, alice_h = alice
    r = client.get("/api/friends/pending", headers=alice_h)
    assert r.status_code == 200
    assert r.json() == []


def test_list_pending_returns_incoming_request(client, alice, bob):
    """After alice -> bob, bob's /pending contains alice."""
    _, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)

    r = client.get("/api/friends/pending", headers=bob_h)
    assert r.status_code == 200
    pending = r.json()
    assert len(pending) == 1
    assert pending[0]["username"] == "alice"
    assert pending[0]["friendship_status"] == "pending"
    # Router hard-codes is_requester=False for /pending (addressee view)
    assert pending[0]["is_requester"] is False


def test_list_pending_excludes_outgoing(client, alice, bob):
    """The sender of a pending request does NOT see it in /pending."""
    _, alice_h = alice
    bob_id, _ = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)

    r = client.get("/api/friends/pending", headers=alice_h)
    assert r.status_code == 200
    assert r.json() == []


def test_list_pending_excludes_accepted(client, alice, bob):
    """Once accepted, the friendship leaves /pending."""
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    assert client.get("/api/friends/pending", headers=bob_h).json() == []


def test_list_pending_requires_auth(client):
    r = client.get("/api/friends/pending")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/friends/{user_id}  — send a friend request
# ---------------------------------------------------------------------------


def test_send_friend_request_creates_pending_row(client, alice, bob):
    """Smoke test: the request shows up on bob's /pending after POST."""
    _, alice_h = alice
    bob_id, bob_h = bob

    r = client.post(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200, r.text

    # Independent assertion that the row exists, via bob's /pending
    pending = client.get("/api/friends/pending", headers=bob_h).json()
    assert any(p["username"] == "alice" for p in pending)


def test_send_friend_request_returns_friend_response(client, alice, bob):
    """
    FAILS on current friend.py — see top-of-file NOTE.
    The endpoint re-uses _to_friend_response on a friendships-only row
    (no username / avatar_path / is_online). Once the CRUD returns a joined
    row (or the router re-queries with a join), this passes.
    """
    _, alice_h = alice
    bob_id, _ = bob

    r = client.post(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["username"] == "bob"
    assert body["friendship_status"] == "pending"
    assert body["is_requester"] is True


def test_send_friend_request_to_self_returns_400(client, alice):
    alice_id, alice_h = alice
    r = client.post(f"/api/friends/{alice_id}", headers=alice_h)
    assert r.status_code == 400
    assert "yourself" in r.json()["detail"].lower()


def test_send_friend_request_duplicate_returns_409(client, alice, bob):
    _, alice_h = alice
    bob_id, _ = bob

    first = client.post(f"/api/friends/{bob_id}", headers=alice_h)
    assert first.status_code == 200, first.text

    second = client.post(f"/api/friends/{bob_id}", headers=alice_h)
    assert second.status_code == 409


def test_send_friend_request_when_already_friends_returns_409(client, alice, bob):
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    # alice tries again — should conflict
    r = client.post(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 409


def test_send_to_nonexistent_user_returns_409(client, alice):
    """
    NOTE: This asserts the *current* (arguably wrong) behavior. The CRUD
    raises 'Addressee user not found', but the router's exception handler
    only branches on the substring 'yourself', so everything else — including
    'not found' — maps to 409. Once the router uses domain exceptions,
    change this test to expect 404.
    """
    _, alice_h = alice
    r = client.post("/api/friends/9999", headers=alice_h)
    assert r.status_code == 409


def test_send_friend_request_requires_auth(client, bob):
    bob_id, _ = bob
    r = client.post(f"/api/friends/{bob_id}")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/friends/{user_id}/accept  — accept a pending request
# ---------------------------------------------------------------------------


def test_accept_friend_request_moves_to_friends_list(client, alice, bob):
    """Smoke test: after accept, bob sees alice in GET /."""
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    r = client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)
    assert r.status_code == 200, r.text

    bob_friends = client.get("/api/friends/", headers=bob_h).json()
    assert any(f["username"] == "alice" for f in bob_friends)


def test_accept_friend_request_returns_friend_response(client, alice, bob):
    """
    FAILS on current friend.py — see top-of-file NOTE. Same bug as
    test_send_friend_request_returns_friend_response.
    """
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    r = client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["username"] == "alice"
    assert body["friendship_status"] == "accepted"
    # Bob accepted alice's request → bob is NOT the requester
    assert body["is_requester"] is False


def test_accept_nonexistent_request_returns_404(client, bob):
    """No friendship row at all → CRUD raises 'not found' → 404."""
    _, bob_h = bob
    # bob tries to accept a request from a user id that never sent one
    r = client.post("/api/friends/9999/accept", headers=bob_h)
    assert r.status_code == 404


def test_accept_own_outgoing_request_returns_409(client, alice, bob):
    """
    The CRUD rejects this with 'Only the addressee can accept the friend
    request'. The string doesn't contain 'not found', so the router maps
    it to 409.
    """
    _, alice_h = alice
    bob_id, _ = bob
    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    r = client.post(f"/api/friends/{bob_id}/accept", headers=alice_h)
    assert r.status_code == 409


def test_accept_already_accepted_returns_409(client, alice, bob):
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    # Second accept → 'Friend request is not pending' → 409
    r = client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)
    assert r.status_code == 409


def test_accept_friend_request_requires_auth(client, alice):
    alice_id, _ = alice
    r = client.post(f"/api/friends/{alice_id}/accept")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# DELETE /api/friends/{friend_id}  — remove friend / cancel request
# ---------------------------------------------------------------------------


def test_delete_accepted_friendship(client, alice, bob):
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    r = client.delete(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200
    assert r.json()["message"] == "Friend removed successfully"

    # Both sides should now have empty friends lists
    assert client.get("/api/friends/", headers=alice_h).json() == []
    assert client.get("/api/friends/", headers=bob_h).json() == []


def test_delete_cancels_pending_request(client, alice, bob):
    """DELETE also works for pending requests — the requester can cancel."""
    _, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)

    r = client.delete(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 200
    assert client.get("/api/friends/pending", headers=bob_h).json() == []


def test_delete_can_be_called_by_either_side(client, alice, bob):
    """get_friendship_between is symmetric, so either user can delete."""
    alice_id, alice_h = alice
    bob_id, bob_h = bob

    client.post(f"/api/friends/{bob_id}", headers=alice_h)
    client.post(f"/api/friends/{alice_id}/accept", headers=bob_h)

    # bob removes the friendship
    r = client.delete(f"/api/friends/{alice_id}", headers=bob_h)
    assert r.status_code == 200
    assert client.get("/api/friends/", headers=alice_h).json() == []


def test_delete_nonexistent_friendship_returns_404(client, alice, bob):
    _, alice_h = alice
    bob_id, _ = bob
    r = client.delete(f"/api/friends/{bob_id}", headers=alice_h)
    assert r.status_code == 404


def test_delete_friend_requires_auth(client, bob):
    bob_id, _ = bob
    r = client.delete(f"/api/friends/{bob_id}")
    assert r.status_code == 401
