import os # for environment variable access
from datetime import datetime, timedelta # for token expiration

from fastapi import Depends, HTTPException, status # to extract the token from the Authorization header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials # for token-based authentication
from jose import JWTError, jwt # for encoding and decoding JWT tokens
import bcrypt # to hash/verify pwd
import aiosqlite # for async SQLite access

from db.database import get_db # to access the database connection

# --- Config constants ---
SECRET_KEY = os.getenv("SECRET_KEY") # from .env for JWT signing
if not SECRET_KEY or not SECRET_KEY.strip():
    raise ValueError("SECRET_KEY environment variable is not set or is empty")

ALGORITHM = "HS256" # JWT signing algorithm
TOKEN_EXPIRE_HOURS = 24 # Token validity duration

security = HTTPBearer() # for extracting the token from the Authorization header

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
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # decode the token and extract user ID
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]) # decode the token
        user_id: str = payload.get("sub") # get user ID from token payload
        if user_id is None:
            raise unauthorized
    except JWTError:
        raise unauthorized
    # Fetch user from DB to verify they still exist (e.g. not deleted)
    async with db.execute("SELECT id, username, email FROM users WHERE id = ?", (int(user_id),)) as cursor:
        user = await cursor.fetchone()
        if user is None: # user not found in DB
            raise unauthorized
        return dict(user) # return user data as dict for use in route handlers
    
    