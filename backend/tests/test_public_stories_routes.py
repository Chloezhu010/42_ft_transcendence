"""Public story API route tests for the required database CRUD surface."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from routers.api_keys import router as api_keys_router
from routers.auth import router as auth_router
from routers.public_stories import router as public_stories_router
from tests.conftest import _init_test_db, make_test_app

_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}
_BOB = {"username": "bob", "email": "bob@example.com", "password": "Password456!"}

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
    "foreword": "A tiny hero finds a brave spark.",
    "character_description": "Zara wears a purple cape.",
    "panels": [
        {"panel_order": 0, "text": "Zara sees a glowing hill."},
        {"panel_order": 1, "text": "The dragon waves hello."},
    ],
}


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, api_keys_router, public_stories_router)) as test_client:
        yield test_client


def _signup(client: TestClient, payload: dict) -> dict[str, str]:
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_api_key(client: TestClient, jwt_headers: dict[str, str], name: str = "Demo key") -> dict[str, str]:
    response = client.post("/api/api-keys", json={"name": name}, headers=jwt_headers)
    assert response.status_code == 200, response.text
    return {"X-API-Key": response.json()["key"]}


def _create_story(client: TestClient, api_headers: dict[str, str], title: str = "Zara and the Dragon") -> dict:
    payload = {**_STORY_PAYLOAD, "title": title}
    response = client.post("/api/public/stories", json=payload, headers=api_headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_get_stories_scoped_to_api_key_owner(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE), "Alice key")
    bob_key = _create_api_key(client, _signup(client, _BOB), "Bob key")
    alice_story = _create_story(client, alice_key, "Alice story")
    _create_story(client, bob_key, "Bob story")

    response = client.get("/api/public/stories", headers=alice_key)

    assert response.status_code == 200
    ids = {story["id"] for story in response.json()}
    assert ids == {alice_story["id"]}


def test_get_story_by_id_returns_owned_story(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE))
    story = _create_story(client, alice_key)

    response = client.get(f"/api/public/stories/{story['id']}", headers=alice_key)

    assert response.status_code == 200
    assert response.json()["id"] == story["id"]
    assert response.json()["profile"]["name"] == "Zara"


def test_get_story_by_id_other_owner_returns_404(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE), "Alice key")
    bob_key = _create_api_key(client, _signup(client, _BOB), "Bob key")
    bob_story = _create_story(client, bob_key, "Bob story")

    response = client.get(f"/api/public/stories/{bob_story['id']}", headers=alice_key)

    assert response.status_code == 404


def test_post_stories_creates_under_api_key_owner(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE))

    created = _create_story(client, alice_key)
    listing = client.get("/api/public/stories", headers=alice_key)

    assert created["title"] == "Zara and the Dragon"
    assert listing.status_code == 200
    assert [story["id"] for story in listing.json()] == [created["id"]]


def test_put_visibility_changes_state(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE))
    story = _create_story(client, alice_key)

    response = client.put(
        f"/api/public/stories/{story['id']}/visibility",
        json={"visibility": "shared_with_friends"},
        headers=alice_key,
    )

    assert response.status_code == 200
    assert response.json()["visibility"] == "shared_with_friends"


def test_put_visibility_is_idempotent(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE))
    story = _create_story(client, alice_key)
    url = f"/api/public/stories/{story['id']}/visibility"
    body = {"visibility": "shared_with_friends"}

    first = client.put(url, json=body, headers=alice_key)
    second = client.put(url, json=body, headers=alice_key)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["visibility"] == second.json()["visibility"] == "shared_with_friends"


def test_put_visibility_invalid_value_returns_422(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE))
    story = _create_story(client, alice_key)

    response = client.put(
        f"/api/public/stories/{story['id']}/visibility",
        json={"visibility": "public"},
        headers=alice_key,
    )

    assert response.status_code == 422


def test_delete_stories_removes_owned_story(client):
    alice_key = _create_api_key(client, _signup(client, _ALICE))
    story = _create_story(client, alice_key)

    deleted = client.delete(f"/api/public/stories/{story['id']}", headers=alice_key)
    detail = client.get(f"/api/public/stories/{story['id']}", headers=alice_key)

    assert deleted.status_code == 204
    assert detail.status_code == 404


def test_full_public_api_demo_flow(client):
    alice_jwt = _signup(client, _ALICE)
    create_key = client.post("/api/api-keys", json={"name": "Evaluation demo"}, headers=alice_jwt)
    assert create_key.status_code == 200, create_key.text
    key_id = create_key.json()["id"]
    api_headers = {"X-API-Key": create_key.json()["key"]}

    created = _create_story(client, api_headers)
    listing = client.get("/api/public/stories", headers=api_headers)
    detail = client.get(f"/api/public/stories/{created['id']}", headers=api_headers)
    visibility = client.put(
        f"/api/public/stories/{created['id']}/visibility",
        json={"visibility": "shared_with_friends"},
        headers=api_headers,
    )
    deleted = client.delete(f"/api/public/stories/{created['id']}", headers=api_headers)
    revoked = client.delete(f"/api/api-keys/{key_id}", headers=alice_jwt)
    rejected = client.get("/api/public/stories", headers=api_headers)

    assert listing.status_code == 200
    assert any(story["id"] == created["id"] for story in listing.json())
    assert detail.status_code == 200
    assert visibility.status_code == 200
    assert visibility.json()["visibility"] == "shared_with_friends"
    assert deleted.status_code == 204
    assert revoked.status_code == 204
    assert rejected.status_code == 401
