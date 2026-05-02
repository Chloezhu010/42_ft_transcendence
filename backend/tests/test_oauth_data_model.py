import aiosqlite
import pytest
import pytest_asyncio

from db.database import init_db


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
async def test_users_password_hash_column_is_nullable_after_init(db):
    rows = await (await db.execute("PRAGMA table_info(users)")).fetchall()
    password_hash = next(row for row in rows if row["name"] == "password_hash")

    assert password_hash["notnull"] == 0


@pytest.mark.asyncio
async def test_oauth_accounts_table_exists(db):
    row = await (
        await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'oauth_accounts'")
    ).fetchone()

    assert row is not None
    assert row["name"] == "oauth_accounts"


@pytest.mark.asyncio
async def test_oauth_results_table_exists(db):
    row = await (
        await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'oauth_results'")
    ).fetchone()

    assert row is not None
    assert row["name"] == "oauth_results"


@pytest.mark.asyncio
async def test_oauth_accounts_has_unique_provider_identity_constraint(db):
    await db.execute(
        """
        INSERT INTO users (email, username, password_hash)
        VALUES (?, ?, ?)
        """,
        ("alice@example.com", "alice", "hash"),
    )
    await db.commit()

    user = await (await db.execute("SELECT id FROM users WHERE email = ?", ("alice@example.com",))).fetchone()

    await db.execute(
        """
        INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
        VALUES (?, ?, ?, ?)
        """,
        (user["id"], "google", "google-123", "alice@example.com"),
    )
    await db.commit()

    with pytest.raises(aiosqlite.IntegrityError):
        await db.execute(
            """
            INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_email)
            VALUES (?, ?, ?, ?)
            """,
            (user["id"], "google", "google-123", "alice@example.com"),
        )


@pytest.mark.asyncio
async def test_oauth_results_can_store_one_time_code(db):
    await db.execute(
        """
        INSERT INTO users (email, username, password_hash)
        VALUES (?, ?, ?)
        """,
        ("oauth@example.com", "oauth-user", None),
    )
    await db.commit()

    user = await (await db.execute("SELECT id FROM users WHERE email = ?", ("oauth@example.com",))).fetchone()

    await db.execute(
        """
        INSERT INTO oauth_results (code, user_id, expires_at)
        VALUES (?, ?, datetime('now', '+10 minutes'))
        """,
        ("code-123", user["id"]),
    )
    await db.commit()

    row = await (await db.execute("SELECT * FROM oauth_results WHERE code = ?", ("code-123",))).fetchone()

    assert row is not None
    assert row["code"] == "code-123"
    assert row["user_id"] == user["id"]


@pytest.mark.asyncio
async def test_init_db_migrates_legacy_users_password_hash_not_null(tmp_path, monkeypatch):
    db_path = tmp_path / "legacy.db"
    monkeypatch.setenv("DB_PATH", str(db_path))

    async with aiosqlite.connect(str(db_path)) as db:
        await db.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                avatar_path TEXT DEFAULT 'default-avatar.png',
                is_online BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE friendships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending', 'accepted', 'rejected')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CHECK(requester_id != addressee_id),
                UNIQUE(requester_id, addressee_id)
            );

            CREATE TABLE kid_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                gender TEXT NOT NULL CHECK(gender IN ('boy', 'girl', 'neutral')),
                skin_tone TEXT NOT NULL,
                hair_color TEXT NOT NULL,
                eye_color TEXT NOT NULL,
                favorite_color TEXT NOT NULL,
                dream TEXT,
                archetype TEXT,
                art_style TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE stories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                kid_profile_id INTEGER NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
                title TEXT,
                foreword TEXT,
                character_description TEXT,
                cover_image_prompt TEXT,
                cover_image_path TEXT,
                visibility TEXT NOT NULL DEFAULT 'private'
                    CHECK(visibility IN ('private', 'shared_with_friends')),
                is_unlocked BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE panels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
                panel_order INTEGER NOT NULL,
                text TEXT NOT NULL,
                image_prompt TEXT,
                image_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(story_id, panel_order)
            );
            """
        )
        await db.commit()

    import db.database as database

    database.DB_PATH = str(db_path)
    await init_db()

    async with aiosqlite.connect(str(db_path)) as db:
        db.row_factory = aiosqlite.Row
        rows = await (await db.execute("PRAGMA table_info(users)")).fetchall()
        password_hash = next(row for row in rows if row["name"] == "password_hash")

        assert password_hash["notnull"] == 0


@pytest.mark.asyncio
async def test_init_db_preserves_admin_flags_when_migrating_legacy_users(tmp_path, monkeypatch):
    db_path = tmp_path / "legacy-admin.db"
    monkeypatch.setenv("DB_PATH", str(db_path))

    async with aiosqlite.connect(str(db_path)) as db:
        await db.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                avatar_path TEXT DEFAULT 'default-avatar.png',
                is_online BOOLEAN NOT NULL DEFAULT 0,
                is_admin BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            INSERT INTO users (id, email, username, password_hash, is_admin)
            VALUES
                (1, 'local@dev', 'local-user', 'none', 1),
                (2, 'admin@example.com', 'admin-user', 'hash', 1),
                (3, 'regular@example.com', 'regular-user', 'hash', 0);
            """
        )
        await db.commit()

    import db.database as database

    database.DB_PATH = str(db_path)
    await init_db()

    async with aiosqlite.connect(str(db_path)) as db:
        db.row_factory = aiosqlite.Row
        rows = await (await db.execute("SELECT id, is_admin FROM users ORDER BY id")).fetchall()

        assert {row["id"]: row["is_admin"] for row in rows} == {
            1: 1,
            2: 1,
            3: 0,
        }
