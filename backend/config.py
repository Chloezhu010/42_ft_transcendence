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
    gemini_api_key: str

    # Optional with defaults
    db_path: str = "wondercomic.db"
    frontend_url: str = "http://localhost:3000"
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
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise ValueError("Missing required environment variables:\n  - GEMINI_API_KEY is required")

    return Config(
        gemini_api_key=gemini_api_key,
        db_path=get_env_or_default("DB_PATH", "wondercomic.db"),
        frontend_url=get_env_or_default("FRONTEND_URL", "http://localhost:3000"),
        debug_mode=os.getenv("DEBUG", "").lower() in ("true", "1", "yes"),
    )


# Singleton config instance (validated on import)
_config: Config | None = None


def get_config() -> Config:
    """Get validated config, validating on first call."""
    global _config
    if _config is None:
        _config = validate_environment()
    return _config


def safe_error_detail(e: Exception, fallback: str = "Internal server error") -> str:
    """Return full error in debug mode, generic message in production."""
    if get_config().debug_mode:
        return str(e)
    return fallback
