import aiosqlite
import pytest
import pytest_asyncio
from fastapi import HTTPException

from db.database import init_db

result_store = pytest.importorskip("services.oauth.result_store")

if not hasattr(result_store, "issue_oauth_result_code") or not hasattr(result_store, "consume_oauth_result_code"):
    pytest.skip("services.oauth.result_store contract is not implemented yet", allow_module_level=True)

issue_oauth_result_code = result_store.issue_oauth_result_code
consume_oauth_result_code = result_store.consume_oauth_result_code


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


async def create_oauth_only_user(
    db: aiosqlite.Connection, email: str = "oauth@example.com", username: str = "oauth-user"
) -> int:
    cursor = await db.execute(
        """
        INSERT INTO users (email, username, password_hash)
        VALUES (?, ?, ?)
        """,
        (email, username, None),
    )
    await db.commit()
    return int(cursor.lastrowid)


@pytest.mark.asyncio
async def test_issue_oauth_result_code_creates_persisted_code(db):
    user_id = await create_oauth_only_user(db)

    code = await issue_oauth_result_code(db, user_id)

    row = await (await db.execute("SELECT * FROM oauth_results WHERE code = ?", (code,))).fetchone()

    assert isinstance(code, str)
    assert code
    assert row is not None
    assert row["user_id"] == user_id


@pytest.mark.asyncio
async def test_issue_oauth_result_code_generates_distinct_codes(db):
    user_id = await create_oauth_only_user(db)

    first_code = await issue_oauth_result_code(db, user_id)
    second_code = await issue_oauth_result_code(db, user_id)

    assert first_code != second_code


@pytest.mark.asyncio
async def test_consume_oauth_result_code_returns_user_id_and_deletes_code(db):
    user_id = await create_oauth_only_user(db)
    code = await issue_oauth_result_code(db, user_id)

    consumed_user_id = await consume_oauth_result_code(db, code)
    row = await (await db.execute("SELECT * FROM oauth_results WHERE code = ?", (code,))).fetchone()

    assert consumed_user_id == user_id
    assert row is None


@pytest.mark.asyncio
async def test_consume_oauth_result_code_rejects_missing_code(db):
    with pytest.raises(HTTPException) as exc_info:
        await consume_oauth_result_code(db, "missing-code")

    assert exc_info.value.status_code == 400
    assert "invalid" in str(exc_info.value.detail).lower() or "expired" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_consume_oauth_result_code_rejects_expired_code(db):
    user_id = await create_oauth_only_user(db)
    await db.execute(
        """
        INSERT INTO oauth_results (code, user_id, expires_at)
        VALUES (?, ?, datetime('now', '-10 minutes'))
        """,
        ("expired-code", user_id),
    )
    await db.commit()

    with pytest.raises(HTTPException) as exc_info:
        await consume_oauth_result_code(db, "expired-code")

    assert exc_info.value.status_code == 400
    assert "invalid" in str(exc_info.value.detail).lower() or "expired" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_consume_oauth_result_code_is_single_use(db):
    user_id = await create_oauth_only_user(db)
    code = await issue_oauth_result_code(db, user_id)

    first_user_id = await consume_oauth_result_code(db, code)

    with pytest.raises(HTTPException) as exc_info:
        await consume_oauth_result_code(db, code)

    assert first_user_id == user_id
    assert exc_info.value.status_code == 400
