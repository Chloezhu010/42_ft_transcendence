from services.oauth.types import NormalizedOAuthProfile


def normalize_google_profile(userinfo: dict) -> NormalizedOAuthProfile:
    """Convert raw Google userinfo dict into the app's stable profile shape."""
    email: str | None = userinfo.get("email")
    display_name = email.split("@")[0] if email else userinfo.get("name", "user")

    return NormalizedOAuthProfile(
        provider="google",
        provider_user_id=userinfo["sub"],
        email=email or "",
        email_verified=bool(userinfo.get("email_verified", False)),
        display_name=display_name,
    )
