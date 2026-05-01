"""
Auth router (local auth + OAuth entrypoints)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from auth_utils import (
    create_access_token,
    get_current_user,
    verify_password,
)
from config import get_config
from db.crud_users import (
    create_user,
    get_user_by_email,
    get_user_by_username,
    set_online_status,
)
from db.database import get_db
from models import (
    LoginRequest,
    OauthExchangeRequest,
    SignupRequest,
    TokenResponse,
)
from services.oauth.account_linking import resolve_google_login
from services.oauth.client import get_google_oauth_client
from services.oauth.result_store import (
    consume_oauth_result_code,
    issue_oauth_result_code,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
config = get_config()


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
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["password_hash"] is None:
        raise HTTPException(status_code=401, detail="This account does not use password login.")
    # Verify password
    if not verify_password(body.password, user["password_hash"]):
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


@router.get("/oauth/google/start")
async def start_google_oauth(request: Request):
    """Start Google OAuth flow by redirecting to provider's auth page."""
    google_client = get_google_oauth_client()
    redirect_uri = config.google_redirect_uri
    return await google_client.authorize_redirect(request, redirect_uri)


@router.get("/oauth/google/callback")
async def google_callback(request: Request, db=Depends(get_db)):
    """Handle Google OAuth callback, resolve login, redirect to frontend with app token."""
    google_client = get_google_oauth_client()
    try:
        token = await google_client.authorize_access_token(request)
        userinfo = token["userinfo"]
        oauth_profile = await resolve_google_login(db, userinfo)
        app_user_id = oauth_profile["id"]
        await set_online_status(db, app_user_id, True)
        result_code = await issue_oauth_result_code(db, app_user_id)
        redirect_url = f"{config.frontend_url}/auth/callback?code={result_code}"
    except HTTPException as e:
        # For known errors like link conflicts, redirect with error details
        if e.status_code == 409 and "link_conflict" in e.detail:
            redirect_url = f"{config.frontend_url}/auth/callback?error=link_conflict"
        else:
            raise
    return RedirectResponse(redirect_url)


@router.post("/oauth/exchange", response_model=TokenResponse)
async def oauth_exchange(body: OauthExchangeRequest, db=Depends(get_db)):
    """Exchange a one-time OAuth result code for an app JWT token."""
    app_user_id = await consume_oauth_result_code(db, body.code)
    if not app_user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    access_token = create_access_token(app_user_id)
    return TokenResponse(access_token=access_token)
