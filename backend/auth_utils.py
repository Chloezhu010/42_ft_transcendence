import os  # for environment variable access
from datetime import UTC, datetime, timedelta  # for token expiration

import aiosqlite  # for async SQLite access
import bcrypt  # to hash/verify pwd
import jwt  # for encoding and decoding JWT tokens
from fastapi import Depends, HTTPException, status  # to extract the token from the Authorization header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer  # for token-based authentication
from jwt.exceptions import InvalidTokenError  # for handling JWT errors

from db.database import get_db  # to access the database connection

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def _get_secret_key() -> str:
    key = os.getenv("SECRET_KEY")
    if not key or not key.strip():
        raise ValueError("SECRET_KEY environment variable is not set or is empty")
    return key


security = HTTPBearer()  # for extracting the token from the Authorization header


# --- Password helpers ---
def hash_password(plain: str) -> str:
    """Hash a plaintext password."""
    return bcrypt.hashpw(
        plain.encode(),  # bcrypt requires bytes input, not str
        bcrypt.gensalt(),  # generate random salt
    ).decode()  # decode back to string for storage


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a hash. Returns True if they match."""
    return bcrypt.checkpw(
        plain.encode(),  # bcrypt requires bytes input, not str
        hashed.encode(),  # stored hash is also string, encode to bytes
    )


# --- JWT Token creation ---
def create_access_token(user_id: int) -> str:
    """Create a JWT token for the given user ID."""
    payload = {
        "sub": str(user_id),  # subject is the user ID
        "exp": datetime.now(UTC) + timedelta(hours=TOKEN_EXPIRE_HOURS),  # token expiration time
    }
    return jwt.encode(payload, _get_secret_key(), algorithm=ALGORITHM)


# --- get_current_user dependency ---
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),  # extract token from Authorization header
    db: aiosqlite.Connection = Depends(get_db),  # get database connection
):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # decode the token and extract user ID
    try:
        payload = jwt.decode(credentials.credentials, _get_secret_key(), algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")  # get user ID from token payload
        if user_id is None:
            raise unauthorized
        user_id_int = int(user_id)
    except (InvalidTokenError, ValueError, TypeError):
        raise unauthorized
    # Fetch user from DB to verify they still exist (e.g. not deleted)
    async with db.execute("SELECT id, username, email FROM users WHERE id = ?", (user_id_int,)) as cursor:
        user = await cursor.fetchone()
        if user is None:  # user not found in DB
            raise unauthorized
        return dict(user)  # return user data as dict for use in route handlers
