import asyncio
import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from fastapi.testclient import TestClient

os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session-secret-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/google/callback")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

from routers.auth import router
from tests.conftest import _init_test_db, make_test_app

required_paths = {
    "/api/auth/oauth/google/start",
    "/api/auth/oauth/google/callback",
    "/api/auth/oauth/exchange",
}
existing_paths = {route.path for route in router.routes}
missing_paths = required_paths - existing_paths
if missing_paths:
    pytest.skip(f"OAuth auth routes are not implemented yet: {sorted(missing_paths)}", allow_module_level=True)


@pytest.fixture
def client_with_db_path(tmp_path):
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, router)) as client:
        yield client, db_path


@pytest.fixture
def client(client_with_db_path):
    test_client, _ = client_with_db_path
    return test_client


def test_google_oauth_start_redirects_to_provider(client, monkeypatch):
    captured_request = {}
    captured_redirect_uri = {}

    class FakeGoogleClient:
        async def authorize_redirect(self, request, redirect_uri):
            captured_request["value"] = request
            captured_redirect_uri["value"] = redirect_uri
            return RedirectResponse("https://accounts.google.com/o/oauth2/auth")

    monkeypatch.setattr("routers.auth.get_google_oauth_client", lambda: FakeGoogleClient())

    response = client.get("/api/auth/oauth/google/start", follow_redirects=False)

    assert response.status_code in (302, 307)
    assert response.headers["location"] == "https://accounts.google.com/o/oauth2/auth"
    assert captured_request["value"] is not None
    assert captured_redirect_uri["value"] == os.environ["GOOGLE_REDIRECT_URI"]


def test_google_oauth_callback_redirects_to_frontend_with_one_time_code(client, monkeypatch):
    class FakeGoogleClient:
        async def authorize_access_token(self, request):
            return {
                "userinfo": {
                    "sub": "google-123",
                    "email": "alice@example.com",
                    "email_verified": True,
                    "name": "Alice Example",
                }
            }

    monkeypatch.setattr("routers.auth.get_google_oauth_client", lambda: FakeGoogleClient())
    monkeypatch.setattr("routers.auth.resolve_google_login", _async_return({"id": 42}))
    monkeypatch.setattr("routers.auth.set_online_status", _async_return(None))
    monkeypatch.setattr("routers.auth.issue_oauth_result_code", _async_return("code-123"))

    response = client.get("/api/auth/oauth/google/callback?code=provider-code&state=test", follow_redirects=False)

    assert response.status_code in (302, 307)
    assert response.headers["location"] == "http://localhost:3000/auth/callback?code=code-123"


def test_google_oauth_callback_redirects_link_conflict_error(client, monkeypatch):
    class FakeGoogleClient:
        async def authorize_access_token(self, request):
            return {
                "userinfo": {
                    "sub": "google-123",
                    "email": "alice@example.com",
                    "email_verified": True,
                    "name": "Alice Example",
                }
            }

    async def raise_link_conflict(*_args, **_kwargs):
        raise HTTPException(status_code=409, detail="link_conflict: email already used by a local account")

    monkeypatch.setattr("routers.auth.get_google_oauth_client", lambda: FakeGoogleClient())
    monkeypatch.setattr("routers.auth.resolve_google_login", raise_link_conflict)

    response = client.get("/api/auth/oauth/google/callback?code=provider-code&state=test", follow_redirects=False)

    assert response.status_code in (302, 307)
    assert "error=link_conflict" in response.headers["location"]


def test_oauth_exchange_returns_app_token(client, monkeypatch):
    monkeypatch.setattr("routers.auth.consume_oauth_result_code", _async_return(42))
    monkeypatch.setattr("routers.auth.create_access_token", lambda user_id: f"jwt-for-{user_id}")

    response = client.post("/api/auth/oauth/exchange", json={"code": "code-123"})

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "jwt-for-42",
        "token_type": "bearer",
    }


def test_oauth_exchange_rejects_invalid_or_expired_code(client, monkeypatch):
    async def raise_invalid_code(*_args, **_kwargs):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth code")

    monkeypatch.setattr("routers.auth.consume_oauth_result_code", raise_invalid_code)

    response = client.post("/api/auth/oauth/exchange", json={"code": "expired-code"})

    assert response.status_code == 400
    assert "invalid or expired oauth code" in response.json()["detail"].lower()


def _async_return(value):
    async def inner(*_args, **_kwargs):
        return value

    return inner
