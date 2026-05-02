"""Rate-limit coverage for Gemini-backed generation routes."""

import asyncio

import pytest
from fastapi.testclient import TestClient

from routers import generation
from routers.auth import router as auth_router
from routers.generation import router as generation_router
from services.rate_limit import generation_rate_limiter
from tests.conftest import _init_test_db, make_test_app

_ALICE = {"username": "alice", "email": "alice@example.com", "password": "Password123!"}
_BOB = {"username": "bob", "email": "bob@example.com", "password": "Password456!"}

_PROFILE = {
    "name": "Zara",
    "gender": "girl",
    "skin_tone": "medium",
    "hair_color": "black",
    "eye_color": "brown",
    "favorite_color": "purple",
}

_SCRIPT_RESPONSE = {
    "title": "Zara and the Dragon",
    "foreword": "A tiny hero finds a brave spark.",
    "characterDescription": "Zara wears a purple cape.",
    "coverImagePrompt": "Zara and a dragon above a valley.",
    "panels": [
        {
            "id": "1",
            "text": "Zara waves at the glowing hill.",
            "imagePrompt": "Zara on a glowing hill.",
        }
    ],
}


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, auth_router, generation_router)) as test_client:
        yield test_client
    asyncio.run(generation_rate_limiter.configure(max_requests=20, window_seconds=60))


@pytest.fixture(autouse=True)
def reset_generation_rate_limiter():
    asyncio.run(generation_rate_limiter.configure(max_requests=20, window_seconds=60))
    yield
    asyncio.run(generation_rate_limiter.configure(max_requests=20, window_seconds=60))


def _signup(client: TestClient, payload: dict) -> dict[str, str]:
    response = client.post("/api/auth/signup", json=payload)
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_generation_route_returns_429_when_user_exceeds_quota(client, monkeypatch):
    calls = 0

    async def fake_gen_script(profile):
        nonlocal calls
        calls += 1
        return _SCRIPT_RESPONSE

    monkeypatch.setattr(generation, "gen_script", fake_gen_script)
    asyncio.run(generation_rate_limiter.configure(max_requests=2, window_seconds=60))
    headers = _signup(client, _ALICE)

    first = client.post("/api/generate/story-script", json={"profile": _PROFILE}, headers=headers)
    second = client.post("/api/generate/story-script", json={"profile": _PROFILE}, headers=headers)
    limited = client.post("/api/generate/story-script", json={"profile": _PROFILE}, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert limited.status_code == 429
    assert limited.json()["detail"] == "Generation rate limit exceeded. Please try again later."
    assert int(limited.headers["Retry-After"]) > 0
    assert calls == 2


def test_generation_rate_limit_is_per_user(client, monkeypatch):
    async def fake_gen_script(profile):
        return _SCRIPT_RESPONSE

    monkeypatch.setattr(generation, "gen_script", fake_gen_script)
    asyncio.run(generation_rate_limiter.configure(max_requests=1, window_seconds=60))
    alice_headers = _signup(client, _ALICE)
    bob_headers = _signup(client, _BOB)

    alice_first = client.post("/api/generate/story-script", json={"profile": _PROFILE}, headers=alice_headers)
    alice_limited = client.post("/api/generate/story-script", json={"profile": _PROFILE}, headers=alice_headers)
    bob_first = client.post("/api/generate/story-script", json={"profile": _PROFILE}, headers=bob_headers)

    assert alice_first.status_code == 200
    assert alice_limited.status_code == 429
    assert bob_first.status_code == 200


def test_streaming_generation_is_rejected_before_stream_starts_when_limited(client, monkeypatch):
    stream_started = False

    async def fake_gen_script(profile):
        return _SCRIPT_RESPONSE

    async def fake_gen_script_stream(profile):
        nonlocal stream_started
        stream_started = True
        yield {"type": "script", "script": _SCRIPT_RESPONSE}

    monkeypatch.setattr(generation, "gen_script", fake_gen_script)
    monkeypatch.setattr(generation, "gen_script_stream", fake_gen_script_stream)
    asyncio.run(generation_rate_limiter.configure(max_requests=1, window_seconds=60))
    headers = _signup(client, _ALICE)

    first = client.post("/api/generate/story-script", json={"profile": _PROFILE}, headers=headers)
    limited_stream = client.post("/api/generate/story-script/stream", json={"profile": _PROFILE}, headers=headers)

    assert first.status_code == 200
    assert limited_stream.status_code == 429
    assert stream_started is False
