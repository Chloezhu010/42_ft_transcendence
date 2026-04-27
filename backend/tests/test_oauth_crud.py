import aiosqlite
import pytest
import pytest_asyncio

from db.crud_users import create_user
from db.database import init_db

crud_oauth = pytest.importorskip("db.crud_oauth")

create_oauth_account = crud_oauth.create_oauth_account
create_oauth_result = crud_oauth.create_oauth_result
get_oauth_account = crud_oauth.get_oauth_account
get_oauth_result = crud_oauth.get_oauth_result
get_user_by_oauth_account = crud_oauth.get_user_by_oauth_account


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


@pytest.mark.asyncio
async def test_create_oauth_account_inserts_row(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    oauth_id = await create_oauth_account(
        db,
        user_id=user_id,
        provider="google",
        provider_user_id="google-123",
        provider_email="alice@example.com",
    )

    row = await get_oauth_account(db, "google", "google-123")

    assert isinstance(oauth_id, int)
    assert row is not None
    assert row["user_id"] == user_id
    assert row["provider"] == "google"
    assert row["provider_user_id"] == "google-123"


@pytest.mark.asyncio
async def test_get_oauth_account_returns_none_when_missing(db):
    row = await get_oauth_account(db, "google", "missing")

    assert row is None


@pytest.mark.asyncio
async def test_get_user_by_oauth_account_returns_linked_user(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")
    await create_oauth_account(
        db,
        user_id=user_id,
        provider="google",
        provider_user_id="google-123",
        provider_email="alice@example.com",
    )

    user = await get_user_by_oauth_account(db, "google", "google-123")

    assert user is not None
    assert user["id"] == user_id
    assert user["email"] == "alice@example.com"
    assert user["username"] == "alice"


@pytest.mark.asyncio
async def test_create_oauth_account_rejects_duplicate_provider_user_id(db):
    first_user_id = await create_user(db, "alice", "alice@example.com", "password123")
    second_user_id = await create_user(db, "bob", "bob@example.com", "password123")

    await create_oauth_account(
        db,
        user_id=first_user_id,
        provider="google",
        provider_user_id="google-123",
        provider_email="alice@example.com",
    )

    with pytest.raises(aiosqlite.IntegrityError):
        await create_oauth_account(
            db,
            user_id=second_user_id,
            provider="google",
            provider_user_id="google-123",
            provider_email="bob@example.com",
        )


@pytest.mark.asyncio
async def test_create_oauth_result_inserts_one_time_code(db):
    user_id = await create_user(db, "alice", "alice@example.com", "password123")

    await create_oauth_result(
        db,
        code="code-123",
        user_id=user_id,
        expires_at="2099-01-01T00:00:00Z",
    )

    row = await get_oauth_result(db, "code-123")

    assert row is not None
    assert row["code"] == "code-123"
    assert row["user_id"] == user_id
