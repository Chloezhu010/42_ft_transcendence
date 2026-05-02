"""
Environment configuration with validation.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


@dataclass
class Config:
    """Application configuration from environment variables."""

    # Required
    secret_key: str  # For signing JWTs, separate from session secret
    session_secret_key: str  # For signing session cookies, separate from JWT secret

    # Optional feature-specific settings
    gemini_api_key: str | None = None
    google_client_id: str | None = None  # credentials from Google Cloud Console for OAuth
    google_client_secret: str | None = None  # credentials from Google Cloud Console for OAuth

    # Optional with defaults
    db_path: str = "wondercomic.db"
    frontend_url: str = "http://localhost:3000"
    google_redirect_uri: str = "http://localhost:8000/api/auth/oauth/google/callback"
    session_cookie_secure: bool = False  # a boolean flag passed to SessionMiddleware
    debug_mode: bool = False


def get_env_or_default(name: str, default: str) -> str:
    """Return default when the env var is missing or blank."""
    value = os.getenv(name)
    if value is None:
        return default
    stripped = value.strip()
    return stripped or default


def validate_environment() -> Config:
    """
    Validate required environment variables and return config.

    Raises:
        ValueError: If required environment variables are missing.
    """
    missing = []

    secret_key = os.getenv("JWT_SECRET_KEY")
    if not secret_key:
        missing.append("JWT_SECRET_KEY")

    session_secret_key = os.getenv("SESSION_SECRET_KEY")
    if not session_secret_key:
        missing.append("SESSION_SECRET_KEY")

    if missing:
        lines = "\n".join(f"  - {v}" for v in missing)
        raise ValueError(f"Missing required environment variables:\n{lines}")

    return Config(
        secret_key=secret_key,
        session_secret_key=session_secret_key,
        gemini_api_key=get_optional_env("GEMINI_API_KEY"),
        google_client_id=get_optional_env("GOOGLE_CLIENT_ID"),
        google_client_secret=get_optional_env("GOOGLE_CLIENT_SECRET"),
        db_path=get_env_or_default("DB_PATH", "wondercomic.db"),
        frontend_url=get_env_or_default("FRONTEND_URL", "http://localhost:3000"),
        google_redirect_uri=get_env_or_default(
            "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/google/callback"
        ),
        session_cookie_secure=os.getenv("SESSION_COOKIE_SECURE", "").lower() in ("true", "1", "yes"),
        debug_mode=os.getenv("DEBUG", "").lower() in ("true", "1", "yes"),
    )


def get_optional_env(name: str) -> str | None:
    """Return a stripped env var value or None when missing/blank."""
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


# Singleton config instance (validated on import)
_config: Config | None = None


def get_config() -> Config:
    """Get validated config, validating on first call."""
    global _config
    if _config is None:
        _config = validate_environment()
    return _config


def get_google_oauth_config() -> tuple[str, str, str]:
    """Return validated Google OAuth settings when the feature is used."""
    config = get_config()
    missing: list[str] = []
    if not config.google_client_id:
        missing.append("GOOGLE_CLIENT_ID")
    if not config.google_client_secret:
        missing.append("GOOGLE_CLIENT_SECRET")
    if missing:
        lines = "\n".join(f"  - {name}" for name in missing)
        raise ValueError(f"Missing required Google OAuth environment variables:\n{lines}")
    return (config.google_client_id, config.google_client_secret, config.google_redirect_uri)


def safe_error_detail(e: Exception, fallback: str = "Internal server error") -> str:
    """Return full error in debug mode, generic message in production."""
    if get_config().debug_mode:
        return str(e)
    return fallback
