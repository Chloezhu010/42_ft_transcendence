import asyncio

import pytest
from fastapi.testclient import TestClient

from routers.auth import router
from tests.conftest import _init_test_db, make_test_app

# --- Fixtures ---
@pytest.fixture
def client(tmp_path):
    """Fresh DB + TestClient per test function."""
    db_path = str(tmp_path / "test.db")
    asyncio.run(_init_test_db(db_path))
    with TestClient(make_test_app(db_path, router)) as c:
        yield c

# --- Test cases ---
# --- Signup ---
def test_signup_success(client):
    """Test successful signup."""
    resp = client.post("/api/auth/signup", json={
        "username": "alice",
        "email": "alice@example.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_signup_duplicate_email(client):
    """Test signup with an email that's already taken."""
    # First signup should succeed
    resp1 = client.post("/api/auth/signup", json={
        "username": "bob",
        "email": "bob@example.com",
        "password": "password123",
    })
    assert resp1.status_code == 200
    # Second signup with same email should fail
    resp2 = client.post("/api/auth/signup", json={
        "username": "bobby",
        "email": "bob@example.com",
        "password": "password123",
    })
    assert resp2.status_code == 400

def test_signup_duplicate_username(client):
    """Test signup with a username that's already taken."""
    # First signup should succeed
    resp1 = client.post("/api/auth/signup", json={
        "username": "charlie",
        "email": "charlie@example.com",
        "password": "password123",
    })
    assert resp1.status_code == 200
    # Second signup with same username should fail
    resp2 = client.post("/api/auth/signup", json={
        "username": "charlie",
        "email": "charlie2@example.com",
        "password": "password123",
    })
    assert resp2.status_code == 400

# --- Login ---
def test_login_success(client):
    """Test successful login."""
    # First signup to create user
    client.post("/api/auth/signup", json={
        "username": "dave",
        "email": "dave@example.com",
        "password": "password123",
    })
    # Then login with the created user
    resp = client.post("/api/auth/login", json={
        "email": "dave@example.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data

def test_login_wrong_password(client):
    """Test login with incorrect password."""
    # First signup to create user
    client.post("/api/auth/signup", json={
        "username": "eve",
        "email": "eve@example.com",
        "password": "password123",
    })
    # Then login with wrong password
    resp = client.post("/api/auth/login", json={
        "email": "eve@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401

def test_login_nonexistent_email(client):
    """Test login with an email that doesn't exist."""
    resp = client.post("/api/auth/login", json={
        "email": "ghost@example.com",
        "password": "password123",
    })
    assert resp.status_code == 401

# --- Logout ---
def test_logout_success(client):
    """Test successful logout."""
    # First signup and login to get token
    signup = client.post("/api/auth/signup", json={
        "username": "frank",
        "email": "frank@example.com",
        "password": "password123",
    })
    token = signup.json()["access_token"]
    # Then logout with the token
    resp = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["message"] == "Logged out successfully"

def test_logout_invalid_token(client):
    """Test logout with an invalid token."""
    resp = client.post("/api/auth/logout", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401