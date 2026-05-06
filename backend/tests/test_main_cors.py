"""CORS regression tests for public API browser clients."""

from fastapi.testclient import TestClient

from main import app


def test_cors_allows_put_and_x_api_key_preserves_patch():
    client = TestClient(app)

    response = client.options(
        "/api/public/stories/1/visibility",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "X-API-Key, Content-Type",
        },
    )

    assert response.status_code == 200
    assert "PUT" in response.headers["access-control-allow-methods"]
    assert "PATCH" in response.headers["access-control-allow-methods"]
    assert "x-api-key" in response.headers["access-control-allow-headers"].lower()
