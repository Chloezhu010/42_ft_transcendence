"""Route tests for JWT-protected API key management."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from routers.api_keys import router as api_keys_router
from routers.auth import router as auth_router
from tests.conftest import _init_test_db, make_test_app

_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}
_BOB = {"username": "bob", "email": "bob@example.com", "password": "Password456!"}


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, api_keys_router)) as test_client:
        yield test_client


def _signup(client: TestClient, payload: dict) -> dict[str, str]:
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_key(client: TestClient, headers: dict[str, str], name: str = "Demo key") -> dict:
    response = client.post("/api/api-keys", json={"name": name}, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_post_keys_returns_raw_key_once(client):
    alice_headers = _signup(client, _ALICE)

    created = _create_key(client, alice_headers)
    listing = client.get("/api/api-keys", headers=alice_headers)

    assert created["key"].startswith("wc_live_")
    assert "key_hash" not in created
    assert listing.status_code == 200
    assert listing.json()[0]["id"] == created["id"]
    assert "key" not in listing.json()[0]
    assert "key_hash" not in listing.json()[0]


def test_post_keys_requires_jwt(client):
    response = client.post("/api/api-keys", json={"name": "Demo key"})

    assert response.status_code == 401


def test_get_keys_lists_only_caller_keys(client):
    alice_headers = _signup(client, _ALICE)
    bob_headers = _signup(client, _BOB)
    alice_key = _create_key(client, alice_headers, "Alice key")
    _create_key(client, bob_headers, "Bob key")

    response = client.get("/api/api-keys", headers=alice_headers)

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert ids == {alice_key["id"]}


def test_get_key_by_id_other_user_returns_404(client):
    alice_headers = _signup(client, _ALICE)
    bob_headers = _signup(client, _BOB)
    bob_key = _create_key(client, bob_headers, "Bob key")

    response = client.get(f"/api/api-keys/{bob_key['id']}", headers=alice_headers)

    assert response.status_code == 404


def test_delete_key_revokes_it(client):
    alice_headers = _signup(client, _ALICE)
    created = _create_key(client, alice_headers)

    deleted = client.delete(f"/api/api-keys/{created['id']}", headers=alice_headers)
    detail = client.get(f"/api/api-keys/{created['id']}", headers=alice_headers)

    assert deleted.status_code == 204
    assert detail.status_code == 200
    assert detail.json()["is_active"] is False


def test_delete_other_users_key_returns_404(client):
    alice_headers = _signup(client, _ALICE)
    bob_headers = _signup(client, _BOB)
    bob_key = _create_key(client, bob_headers, "Bob key")

    response = client.delete(f"/api/api-keys/{bob_key['id']}", headers=alice_headers)

    assert response.status_code == 404
