import aiosqlite
import pytest
import pytest_asyncio

from db.crud_oauth import create_oauth_account
from db.crud_users import create_user
from db.database import init_db

account_linking = pytest.importorskip("services.oauth.account_linking")
resolve_google_login = account_linking.resolve_google_login


@pytest_asyncio.fixture
async def db(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DB_PATH", str(db_path))

    import db.database as database

    database.DB_PATH = str(db_path)
    await init_db()

    conn = await aiosqlite.connect(str(db_path))
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    yield conn
    await conn.close()


def make_google_userinfo(
    *,
    sub: str = "google-123",
    email: str | None = "alice@example.com",
    email_verified: bool = True,
    name: str = "Alice Example",
    picture: str = "https://example.com/avatar.png",
) -> dict:
    userinfo = {
        "sub": sub,
        "email_verified": email_verified,
        "name": name,
        "picture": picture,
    }
    if email is not None:
        userinfo["email"] = email
    return userinfo


def error_text(error: Exception) -> str:
    detail = getattr(error, "detail", None)
    if isinstance(detail, str):
        return detail.lower()
    return str(error).lower()


async def fetch_user_count(db: aiosqlite.Connection) -> int:
    row = await (await db.execute("SELECT COUNT(*) AS count FROM users WHERE id != 1")).fetchone()
    return int(row["count"])


async def fetch_oauth_count(db: aiosqlite.Connection) -> int:
    row = await (await db.execute("SELECT COUNT(*) AS count FROM oauth_accounts")).fetchone()
    return int(row["count"])


@pytest.mark.asyncio
async def test_resolve_google_login_returns_existing_linked_user(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")
    await create_oauth_account(
        db,
        user_id=user_id,
        provider="google",
        provider_user_id="google-123",
        provider_email="alice@example.com",
    )

    user = await resolve_google_login(db, make_google_userinfo())

    assert user["id"] == user_id
    assert await fetch_user_count(db) == 1
    assert await fetch_oauth_count(db) == 1


@pytest.mark.asyncio
async def test_resolve_google_login_rejects_unverified_email(db):
    with pytest.raises(Exception) as exc_info:
        await resolve_google_login(db, make_google_userinfo(email_verified=False))

    assert "verified" in error_text(exc_info.value)
    assert await fetch_user_count(db) == 0
    assert await fetch_oauth_count(db) == 0


@pytest.mark.asyncio
async def test_resolve_google_login_rejects_missing_email(db):
    with pytest.raises(Exception) as exc_info:
        await resolve_google_login(db, make_google_userinfo(email=None))

    text = error_text(exc_info.value)
    assert "email" in text
    assert await fetch_user_count(db) == 0
    assert await fetch_oauth_count(db) == 0


@pytest.mark.asyncio
async def test_resolve_google_login_rejects_existing_local_email_conflict(db):
    await create_user(db, "alice", "alice@example.com", "password123")

    with pytest.raises(Exception) as exc_info:
        await resolve_google_login(db, make_google_userinfo(sub="google-999"))

    assert "link_conflict" in error_text(exc_info.value)
    assert await fetch_user_count(db) == 1
    assert await fetch_oauth_count(db) == 0


@pytest.mark.asyncio
async def test_resolve_google_login_creates_new_oauth_user_when_identity_is_new(db):
    user = await resolve_google_login(db, make_google_userinfo())

    linked_user = await (
        await db.execute("SELECT * FROM users WHERE id = ?", (user["id"],))
    ).fetchone()
    oauth_row = await (
        await db.execute(
            """
            SELECT *
            FROM oauth_accounts
            WHERE provider = ? AND provider_user_id = ?
            """,
            ("google", "google-123"),
        )
    ).fetchone()

    assert linked_user is not None
    assert linked_user["password_hash"] is None
    assert oauth_row is not None
    assert oauth_row["user_id"] == linked_user["id"]
    assert oauth_row["provider_email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_resolve_google_login_uses_email_local_part_for_username(db):
    user = await resolve_google_login(db, make_google_userinfo(email="alice@example.com"))

    assert user["username"] == "alice"


@pytest.mark.asyncio
async def test_resolve_google_login_generates_unique_username_suffix(db):
    await create_user(db, "alice", "existing@example.com", "password123")

    user = await resolve_google_login(db, make_google_userinfo(email="alice@example.com"))

    assert user["username"] != "alice"
    assert user["username"].startswith("alice")


@pytest.mark.asyncio
async def test_resolve_google_login_reuses_existing_provider_identity(db):
    first_user = await resolve_google_login(db, make_google_userinfo())
    second_user = await resolve_google_login(db, make_google_userinfo())

    assert first_user["id"] == second_user["id"]
    assert await fetch_user_count(db) == 1
    assert await fetch_oauth_count(db) == 1


@pytest.mark.asyncio
async def test_resolve_google_login_returns_local_user_row_shape(db):
    user = await resolve_google_login(db, make_google_userinfo())

    assert user["id"] > 0
    assert user["email"] == "alice@example.com"
    assert user["username"]
