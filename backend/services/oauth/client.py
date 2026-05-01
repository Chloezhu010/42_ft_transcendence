from authlib.integrations.starlette_client import OAuth

from config import get_config

_GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration"

_oauth: OAuth | None = None


def _get_oauth() -> OAuth:
    """Build and cache the oauth registry on first call."""
    global _oauth
    if _oauth is None:
        config = get_config()
        _oauth = OAuth()
        _oauth.register(
            name="google",
            client_id=config.google_client_id,
            client_secret=config.google_client_secret,
            server_metadata_url=_GOOGLE_DISCOVERY_URL,
            client_kwargs={"scope": "openid email profile"},
        )
    return _oauth


def get_google_oauth_client():
    """Get the registered OAuth client for Google."""
    oauth = _get_oauth()
    return oauth.create_client("google")
