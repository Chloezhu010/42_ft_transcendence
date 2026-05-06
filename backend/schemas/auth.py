"""Authentication request and response schemas."""

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Request body for user signup."""

    email: EmailStr
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    """Request body for user login."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class TokenResponse(BaseModel):
    """Response containing the authentication token."""

    access_token: str
    token_type: str = "bearer"


class OauthExchangeRequest(BaseModel):
    """Request body for exchanging an OAuth callback code for an app token."""

    code: str = Field(min_length=1)
