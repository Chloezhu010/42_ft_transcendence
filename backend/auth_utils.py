import os
from datetime import UTC, datetime, timedelta

import aiosqlite
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError

from db.database import get_db

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24
DEFAULT_BCRYPT_ROUNDS = 12


def _get_secret_key() -> str:
    key = os.getenv("JWT_SECRET_KEY")
    if not key or not key.strip():
        raise ValueError("JWT_SECRET_KEY environment variable is not set or is empty")
    return key


def _get_bcrypt_rounds() -> int:
    """Return bcrypt rounds from env, clamped to bcrypt's valid range."""
    configured = os.getenv("BCRYPT_ROUNDS")
    if not configured:
        return DEFAULT_BCRYPT_ROUNDS

    try:
        rounds = int(configured)
    except ValueError:
        return DEFAULT_BCRYPT_ROUNDS

    return max(4, min(31, rounds))


security = HTTPBearer()


# --- Password helpers ---
def hash_password(plain: str) -> str:
    """Hash a plaintext password."""
    return bcrypt.hashpw(
        plain.encode(),
        bcrypt.gensalt(rounds=_get_bcrypt_rounds()),
    ).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a hash. Returns True if they match."""
    return bcrypt.checkpw(
        plain.encode(),
        hashed.encode(),
    )


# --- JWT Token creation ---
def create_access_token(user_id: int) -> str:
    """Create a JWT token for the given user ID."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(UTC) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, _get_secret_key(), algorithm=ALGORITHM)


# --- get_current_user dependency ---
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: aiosqlite.Connection = Depends(get_db),
):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, _get_secret_key(), algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise unauthorized
        user_id_int = int(user_id)
    except (InvalidTokenError, ValueError, TypeError):
        raise unauthorized

    async with db.execute("SELECT id, username, email FROM users WHERE id = ?", (user_id_int,)) as cursor:
        user = await cursor.fetchone()
        if user is None:
            raise unauthorized
        return dict(user)
