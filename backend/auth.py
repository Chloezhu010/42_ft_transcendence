import os # for environment variable access
from datetime import datetime, timedelta # for token expiration

from fastapi import Depends, HTTPException, status # to extract the token from the Authorization header
from fastapi import security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # for token-based authentication
from jose import JWTError, jwt # for encoding and decoding JWT tokens
import bcrypt # to hash/verify pwd
import aiosqlite # for async SQLite access

from database import get_db # to access the database connection

# --- Config constants ---
SECRET_KEY = os.getenv("SECRET_KEY") # from .env for JWT signing
ALGORITHM = "HS256" # JWT signing algorithm
TOKEN_EXPIRE_HOURS = 24 # Token validity duration

# --- Password helpers ---
def hash_password(plain: str) -> str:
    """Hash a plaintext password."""
    return bcrypt.hashpw(
        plain.encode(), # bcrypt requires bytes input, not str
        bcrypt.gensalt() # generate random salt
    ).decode() # decode back to string for storage

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a hash. Returns True if they match."""
    return bcrypt.checkpw(
        plain.encode(), # bcrypt requires bytes input, not str
        hashed.encode() # stored hash is also string, encode to bytes
    )

# --- JWT Token creation ---
def create_access_token(user_id: int) -> str:
    """Create a JWT token for the given user ID."""
    payload = {
        "sub": str(user_id), # subject is the user ID
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS) # token expiration time
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM) # encode the token

# --- get_current_user dependency ---
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), # extract token from Authorization header
    db: aiosqlite.Connection = Depends(get_db) # get database connection      
):
    # TBU