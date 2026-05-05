"""
SQLite database setup with aiosqlite.
"""

import os  # for env variables
from pathlib import Path

import aiosqlite  # for async SQLite access
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

# Single connection (initialized on startup)
_db: aiosqlite.Connection | None = None

DB_PATH = os.getenv("DB_PATH", "wondercomic.db")


async def init_db():
    """Create tables on startup."""
    async with aiosqlite.connect(DB_PATH) as db:
        await _create_tables(db)  # create tables if they don't exist


async def _users_password_hash_is_not_null(db: aiosqlite.Connection) -> bool:
    """Return True if users.password_hash is declared NOT NULL in the live schema."""
    async with db.execute("PRAGMA table_info(users)") as cursor:
        rows = await cursor.fetchall()
    password_hash = next((row for row in rows if row[1] == "password_hash"), None)
    if password_hash is None:
        return False  # column doesn't exist, treat as already compatible
    return bool(password_hash[3])


async def _users_table_has_column(db: aiosqlite.Connection, column_name: str) -> bool:
    """Return True if the live users table contains the named column."""
    async with db.execute("PRAGMA table_info(users)") as cursor:
        rows = await cursor.fetchall()
    return any(row[1] == column_name for row in rows)


async def _migrate_users_password_hash_nullable(db: aiosqlite.Connection) -> None:
    """Relax the NOT NULL constraint on users.password_hash for OAuth users."""
    if not await _users_password_hash_is_not_null(db):
        return  # already nullable, no migration needed
    is_admin_select = "is_admin" if await _users_table_has_column(db, "is_admin") else "0"
    await db.execute("PRAGMA foreign_keys=OFF")
    try:
        await db.execute(
            """
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT,
                avatar_path TEXT DEFAULT 'default-avatar.png',
                is_online BOOLEAN NOT NULL DEFAULT 0,
                is_admin BOOLEAN NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        await db.execute(
            f"""
            INSERT INTO users_new (
                id, email, username, password_hash, avatar_path, is_online, is_admin, created_at, updated_at
            )
            SELECT
                id, email, username, password_hash, avatar_path, is_online, {is_admin_select}, created_at, updated_at
            FROM users
            """
        )
        await db.execute("DROP TABLE users")
        await db.execute("ALTER TABLE users_new RENAME TO users")
    finally:
        await db.execute("PRAGMA foreign_keys=ON")


async def _create_oauth_accounts_table(db: aiosqlite.Connection) -> None:
    """Create the oauth_accounts table if it doesn't exist."""
    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS oauth_accounts (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider            TEXT NOT NULL,
            provider_user_id    TEXT NOT NULL,
            provider_email      TEXT,
            created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(provider, provider_user_id)
        );
        """
    )


async def _create_oauth_results_table(db: aiosqlite.Connection) -> None:
    """Create the oauth_results table if it doesn't exist."""
    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS oauth_results (
            code            TEXT PRIMARY KEY,
            user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at      TIMESTAMP NOT NULL,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
    )


async def _create_tables(db: aiosqlite.Connection):
    """Create tables if they don't exist."""
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT, -- unique ID for each user
            email           TEXT NOT NULL UNIQUE, -- unique email for login
            username        TEXT NOT NULL UNIQUE, -- unique username for display
            password_hash   TEXT, -- nullable for OAuth-only users
            avatar_path     TEXT DEFAULT 'default-avatar.png', -- path to user's avatar image
            is_online       BOOLEAN NOT NULL DEFAULT 0, -- online status for presence indication
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- timestamp of account creation
            updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- timestamp of last profile update
        );
                           
        CREATE TABLE IF NOT EXISTS friendships (
            id              INTEGER PRIMARY KEY AUTOINCREMENT, -- unique ID for each friendship
            requester_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- user who sent the friend request
            addressee_id    INTEGER NOT NULL REFERENCES users(id)
                            ON DELETE CASCADE, -- user who received the friend request
            status          TEXT NOT NULL DEFAULT 'pending' 
                            CHECK(status IN ('pending', 'accepted', 'rejected')), -- status of the friend request
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            CHECK(requester_id != addressee_id), -- prevent self-friendship
            UNIQUE(requester_id, addressee_id) -- prevent duplicate friendships
        );
                           
        CREATE TABLE IF NOT EXISTS kid_profiles (
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
            language TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stories (
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

        CREATE TABLE IF NOT EXISTS panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
            panel_order INTEGER NOT NULL,
            text TEXT NOT NULL,
            image_prompt TEXT,
            image_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(story_id, panel_order)
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            key_prefix TEXT NOT NULL UNIQUE,
            key_hash TEXT NOT NULL UNIQUE,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP
        );
    """)

    await _migrate_users_password_hash_nullable(db)
    await _create_oauth_accounts_table(db)
    await _create_oauth_results_table(db)

    try:
        await db.execute(
            """
            ALTER TABLE stories
            ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
                CHECK(visibility IN ('private', 'shared_with_friends'))
            """
        )
    except aiosqlite.OperationalError as exc:
        if "duplicate column name" not in str(exc).lower():
            raise
    try:
        await db.execute(
            """
            ALTER TABLE kid_profiles
            ADD COLUMN language TEXT
            """
        )
    except aiosqlite.OperationalError as exc:
        if "duplicate column name" not in str(exc).lower():
            raise
    await db.execute("UPDATE stories SET visibility = 'private' WHERE visibility IS NULL")
    try:
        await db.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0")
    except aiosqlite.OperationalError as exc:
        if "duplicate column name" not in str(exc).lower():
            raise
    # Seed a default local user for dev mode and mark it admin
    await db.execute("""
        INSERT OR IGNORE INTO users (id, email, username, password_hash)
        VALUES (1, 'local@dev', 'local-user', 'none')
    """)
    await db.execute("UPDATE users SET is_admin = 1 WHERE id = 1")
    await db.commit()


async def get_db():
    """Per-request database connection generator."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row  # return rows as dict-like objects
    await db.execute("PRAGMA journal_mode=WAL")  # concurrent read/write
    await db.execute("PRAGMA foreign_keys=ON")  # enforce foreign key constraints
    try:
        yield db
    finally:
        await db.close()
