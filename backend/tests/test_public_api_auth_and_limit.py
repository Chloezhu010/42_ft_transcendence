"""Public API authentication and rate-limit route tests."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from routers.api_keys import router as api_keys_router
from routers.auth import router as auth_router
from routers.public_stories import router as public_stories_router
from services.rate_limit import generation_rate_limiter, public_api_rate_limiter
from tests.conftest import _init_test_db, make_test_app

_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    asyncio.run(public_api_rate_limiter.configure(max_requests=60, window_seconds=60))
    asyncio.run(generation_rate_limiter.configure(max_requests=20, window_seconds=60))
    yield
    asyncio.run(public_api_rate_limiter.configure(max_requests=60, window_seconds=60))
    asyncio.run(generation_rate_limiter.configure(max_requests=20, window_seconds=60))


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, api_keys_router, public_stories_router)) as test_client:
        yield test_client


def _signup(client: TestClient, payload: dict) -> dict[str, str]:
    signup = client.post("/api/auth/signup", json=payload)
    assert signup.status_code == 200, signup.text
    token = signup.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_key(client: TestClient, jwt_headers: dict[str, str], name: str = "Demo key") -> str:
    response = client.post("/api/api-keys", json={"name": name}, headers=jwt_headers)
    assert response.status_code == 200, response.text
    return response.json()["key"]


def test_missing_x_api_key_returns_401(client):
    response = client.get("/api/public/stories")

    assert response.status_code == 401


def test_invalid_x_api_key_returns_401(client):
    response = client.get("/api/public/stories", headers={"X-API-Key": "wc_live_invalid"})

    assert response.status_code == 401


def test_revoked_x_api_key_returns_401(client):
    alice_headers = _signup(client, _ALICE)
    created = client.post("/api/api-keys", json={"name": "Demo key"}, headers=alice_headers).json()
    delete_response = client.delete(f"/api/api-keys/{created['id']}", headers=alice_headers)

    response = client.get("/api/public/stories", headers={"X-API-Key": created["key"]})

    assert delete_response.status_code == 204
    assert response.status_code == 401


def test_valid_x_api_key_resolves_user(client):
    alice_headers = _signup(client, _ALICE)
    api_key = _create_key(client, alice_headers)

    response = client.get("/api/public/stories", headers={"X-API-Key": api_key})

    assert response.status_code == 200
    assert response.json() == []


def test_authorization_bearer_does_not_authenticate_public_api(client):
    alice_headers = _signup(client, _ALICE)

    response = client.get("/api/public/stories", headers=alice_headers)

    assert response.status_code == 401


def test_jwt_in_x_api_key_header_returns_401(client):
    alice_headers = _signup(client, _ALICE)
    jwt_token = alice_headers["Authorization"].removeprefix("Bearer ")

    response = client.get("/api/public/stories", headers={"X-API-Key": jwt_token})

    assert response.status_code == 401


def test_under_limit_returns_200(client):
    alice_headers = _signup(client, _ALICE)
    api_key = _create_key(client, alice_headers)
    asyncio.run(public_api_rate_limiter.configure(max_requests=2, window_seconds=60))

    first = client.get("/api/public/stories", headers={"X-API-Key": api_key})
    second = client.get("/api/public/stories", headers={"X-API-Key": api_key})

    assert first.status_code == 200
    assert second.status_code == 200


def test_over_limit_returns_429_with_retry_after(client):
    alice_headers = _signup(client, _ALICE)
    api_key = _create_key(client, alice_headers)
    asyncio.run(public_api_rate_limiter.configure(max_requests=1, window_seconds=60))

    first = client.get("/api/public/stories", headers={"X-API-Key": api_key})
    limited = client.get("/api/public/stories", headers={"X-API-Key": api_key})

    assert first.status_code == 200
    assert limited.status_code == 429
    assert int(limited.headers["Retry-After"]) > 0


def test_limit_per_api_key_not_per_user(client):
    alice_headers = _signup(client, _ALICE)
    first_key = _create_key(client, alice_headers, "first")
    second_key = _create_key(client, alice_headers, "second")
    asyncio.run(public_api_rate_limiter.configure(max_requests=1, window_seconds=60))

    first_ok = client.get("/api/public/stories", headers={"X-API-Key": first_key})
    first_limited = client.get("/api/public/stories", headers={"X-API-Key": first_key})
    second_ok = client.get("/api/public/stories", headers={"X-API-Key": second_key})

    assert first_ok.status_code == 200
    assert first_limited.status_code == 429
    assert second_ok.status_code == 200


def test_public_limit_independent_from_generation_limit(client):
    alice_headers = _signup(client, _ALICE)
    api_key = _create_key(client, alice_headers)
    asyncio.run(public_api_rate_limiter.configure(max_requests=1, window_seconds=60))
    asyncio.run(generation_rate_limiter.configure(max_requests=100, window_seconds=60))

    first = client.get("/api/public/stories", headers={"X-API-Key": api_key})
    limited = client.get("/api/public/stories", headers={"X-API-Key": api_key})

    assert first.status_code == 200
    assert limited.status_code == 429
