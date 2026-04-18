"""
Auth router (handle signup, login, logout)
"""

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import (
    create_access_token,
    get_current_user,
    verify_password,
)
from db.crud_users import (
    create_user,
    get_user_by_email,
    get_user_by_username,
    set_online_status,
)
from db.database import get_db
from models import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignupRequest, db=Depends(get_db)):
    """Signup: check email isn't taken, create user, return JWT token."""
    # Check if username or email already exists
    if await get_user_by_email(db, body.email):
        raise HTTPException(status_code=400, detail="Email already taken")
    if await get_user_by_username(db, body.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    # Create new user
    user_id = await create_user(db, body.username, body.email, body.password)
    # Generate access token
    access_token = create_access_token(user_id)
    return TokenResponse(access_token=access_token)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db=Depends(get_db)):
    """Login: verify password, set user online, return JWT token."""
    # Fetch user by email
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Set user online
    await set_online_status(db, user["id"], True)
    # Generate access token
    access_token = create_access_token(user["id"])
    return TokenResponse(access_token=access_token)


@router.post("/logout")
async def logout(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Logout: validate jwt token, set offline."""
    await set_online_status(db, current_user["id"], False)
    return {"message": "Logged out successfully"}
