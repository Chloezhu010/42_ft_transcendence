import os

import pytest

os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")
os.environ.setdefault("SESSION_SECRET_KEY", "test-session-secret-key")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-google-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/google/callback")

oauth_client = pytest.importorskip("services.oauth.client")

if not hasattr(oauth_client, "get_google_oauth_client"):
    pytest.skip("services.oauth.client contract is not implemented yet", allow_module_level=True)

get_google_oauth_client = oauth_client.get_google_oauth_client


def test_get_google_oauth_client_returns_registered_client():
    client = get_google_oauth_client()

    assert client is not None


def test_get_google_oauth_client_uses_google_registration_name():
    client = get_google_oauth_client()

    client_name = getattr(client, "name", None)
    if client_name is not None:
        assert client_name == "google"
    else:
        pytest.skip("OAuth client object does not expose a public name attribute")
