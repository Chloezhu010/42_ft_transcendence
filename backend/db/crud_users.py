import aiosqlite  # for async SQLite access
from aiosqlite import Row  # for type hinting database rows

from auth_utils import hash_password  # for password hashing and token creation


# --- User identity ---
async def create_user(db: aiosqlite.Connection, username: str, email: str, password: str) -> int:
    """Create a new user and return their ID."""
    hashed_pwd = hash_password(password)  # hash the password before storing
    cursor = await db.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", (username, email, hashed_pwd)
    )
    await db.commit()  # commit the transaction to save changes
    return cursor.lastrowid  # return the ID of the newly created user


async def get_user_by_email(db: aiosqlite.Connection, email: str) -> Row | None:
    """Fetch a user by their email address. Returns None if not found."""
    async with db.execute("SELECT * FROM users WHERE email = ?", (email,)) as cursor:
        return await cursor.fetchone()  # return the user row or None if not found


async def get_user_by_username(db: aiosqlite.Connection, username: str) -> Row | None:
    """Fetch a user by their username. Returns None if not found."""
    async with db.execute("SELECT * FROM users WHERE username = ?", (username,)) as cursor:
        return await cursor.fetchone()  # return the user row or None if not found


async def get_user_by_id(db: aiosqlite.Connection, user_id: int) -> Row | None:
    """Fetch a user by their ID. Returns None if not found."""
    async with db.execute("SELECT * FROM users WHERE id = ?", (user_id,)) as cursor:
        return await cursor.fetchone()  # return the user row or None if not found


async def search_users_by_username(
    db: aiosqlite.Connection, query: str, current_user_id: int, limit: int = 10
) -> list[Row]:
    """Search users by username fragment, excluding the current user. Returns a list of user rows."""
    normalized_query = query.strip()
    if not normalized_query:
        return []
    safe_limit = max(1, min(limit, 20))
    escaped_query = (
        normalized_query.replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )
    like_pattern = f"%{escaped_query}%"
    async with db.execute(
        """
        SELECT * FROM users
        WHERE id != ? AND username LIKE ? ESCAPE '\\' COLLATE NOCASE
        ORDER BY username COLLATE NOCASE ASC, id ASC
        LIMIT ?
        """,
        (current_user_id, like_pattern, safe_limit),
    ) as cursor:
        return await cursor.fetchall()
    
# --- User profile management ---
async def update_user(
    db: aiosqlite.Connection, user_id: int, username: str | None = None, email: str | None = None
) -> Row | None:
    """Update a user's profile info. Returns the updated user row."""
    # Precheck if user exists
    current_user = await get_user_by_id(db, user_id)  # fetch current user data
    if not current_user:
        return None
    # Build dynamic sql query based on provided fields
    updates: list[str] = []
    values: list[str | int] = []
    if username is not None:
        updates.append("username = ?")
        values.append(username)
    if email is not None:
        updates.append("email = ?")
        values.append(email)
    if not updates:
        return current_user
    updates.append("updated_at = CURRENT_TIMESTAMP")
    values.append(user_id)
    # Execute the update query
    try:
        await db.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        await db.commit()
    except aiosqlite.IntegrityError as exc:
        # Handle unique constraint violations (e.g. duplicate email or username)
        if "users.username" in str(exc):
            raise ValueError("Username already in use") from exc
        if "users.email" in str(exc):
            raise ValueError("Email already in use") from exc
        raise
    # Return the updated user data
    return await get_user_by_id(db, user_id)


async def update_avatar(db: aiosqlite.Connection, user_id: int, avatar_path: str) -> Row | None:
    """Update a user's avatar URL."""
    # Check if user exists
    current_user = await get_user_by_id(db, user_id)
    if current_user is None:
        return None
    # Update the avatar path
    await db.execute(
        "UPDATE users SET avatar_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (avatar_path, user_id)
    )
    await db.commit()
    # Return the updated user data
    return await get_user_by_id(db, user_id)


async def set_online_status(db: aiosqlite.Connection, user_id: int, is_online: bool) -> Row | None:
    """Set a user's online status."""
    # Check if user exists
    current_user = await get_user_by_id(db, user_id)
    if current_user is None:
        return None
    # Update the online status
    await db.execute(
        "UPDATE users SET is_online = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (is_online, user_id)
    )
    await db.commit()
    # Return the updated user data
    return await get_user_by_id(db, user_id)


# --- Friends ---
async def get_friendship_between(db, user_id: int, other_user_id: int) -> Row | None:
    """Check if there is a friendship between two users. Returns the friendship row or None."""
    async with db.execute(
        "SELECT * FROM friendships"
        " WHERE (requester_id = ? AND addressee_id = ?)"
        " OR (requester_id = ? AND addressee_id = ?)",
        (user_id, other_user_id, other_user_id, user_id),
    ) as cursor:
        return await cursor.fetchone()  # return the friendship row or None if not found


async def get_friend_view(db, viewer_id: int, other_user_id: int) -> Row | None:
    """Return a joined friendship+user row shaped for FriendResponse.

    Columns: u.id, u.username, u.avatar_path, u.is_online, f.requester_id, f.status.
    u.id is always the *other* user's id (the friend, from viewer_id's perspective),
    matching the contract used by get_friends / get_pending_requests.

    Used by the friend router to build response bodies after send/accept writes
    without leaking that concern into the CRUD write functions (which must keep
    returning raw friendships rows — see test_crud_users.py).
    """
    async with db.execute(
        """
        SELECT
            u.id, u.username, u.avatar_path, u.is_online,
            f.requester_id, f.status
        FROM friendships f
        JOIN users u ON u.id = ?
        WHERE (f.requester_id = ? AND f.addressee_id = ?)
           OR (f.requester_id = ? AND f.addressee_id = ?)
        """,
        (other_user_id, viewer_id, other_user_id, other_user_id, viewer_id),
    ) as cursor:
        return await cursor.fetchone()


async def send_friend_request(db, requester_id: int, addressee_id: int) -> Row:
    """Send a friend request from requester to addressee. Returns the created friendship row."""
    # Validation checks
    if requester_id == addressee_id:
        raise ValueError("Cannot send friend request to yourself")
    requester = await get_user_by_id(db, requester_id)
    addressee = await get_user_by_id(db, addressee_id)
    if requester is None:
        raise ValueError("Requester user not found")
    if addressee is None:
        raise ValueError("Addressee user not found")
    existing_friendship = await get_friendship_between(db, requester_id, addressee_id)
    if existing_friendship is not None:
        if existing_friendship["status"] == "accepted":
            raise ValueError("Users are already friends")
        raise ValueError("A friend request already exists")
    # Add friend request to DB
    await db.execute("INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)", (requester_id, addressee_id))
    await db.commit()
    # Return the raw friendships row (CRUD contract; router re-queries via get_friend_view).
    friendship = await get_friendship_between(db, requester_id, addressee_id)
    if friendship is None:
        raise RuntimeError("Failed to create friend request")
    return friendship


async def accept_friend_request(db, current_user_id: int, requester_id: int) -> Row:
    """Accept a friend request. Returns the updated raw friendships row."""
    # Check if the friend request exists and is pending
    friendship = await get_friendship_between(db, current_user_id, requester_id)
    if friendship is None:
        raise ValueError("Friend request not found")
    if friendship["status"] != "pending":
        raise ValueError("Friend request is not pending")
    if friendship["addressee_id"] != current_user_id:
        raise ValueError("Only the addressee can accept the friend request")
    # Update the friendship status to accepted
    await db.execute("UPDATE friendships SET status = 'accepted' WHERE id = ?", (friendship["id"],))
    await db.commit()
    # Return the raw updated friendships row (CRUD contract; router re-queries via get_friend_view).
    updated_friendship = await get_friendship_between(db, current_user_id, requester_id)
    if updated_friendship is None:
        raise RuntimeError("Failed to update friend request")
    return updated_friendship


async def remove_friend(db, user_id: int, friend_id: int) -> bool:
    """Remove a friend (both accepted and pending). Returns True if a row was deleted."""
    # Check if the friendship exists
    friendship = await get_friendship_between(db, user_id, friend_id)
    if friendship is None:
        raise ValueError("Friendship not found")
    # Delete the friendship
    await db.execute("DELETE FROM friendships WHERE id = ?", (friendship["id"],))
    await db.commit()
    # Return True to indicate a friendship was removed
    return True


async def get_friends(db, user_id: int) -> list[Row]:
    """Get a list of accepted friends for the given user id. Returns a list of user rows."""
    async with db.execute(
        """
        SELECT
            u.id, u.username, u.avatar_path, u.is_online,
            f.id AS friendship_id, f.requester_id, f.status, f.created_at
        FROM friendships f
        JOIN users u
            ON (
                (f.requester_id = ? AND u.id = f.addressee_id)
                OR (f.addressee_id = ? AND u.id = f.requester_id)
            )
        WHERE f.status = 'accepted'
        ORDER BY f.created_at DESC
        """,
        (user_id, user_id),
    ) as cursor:
        return await cursor.fetchall()  # return a list of accepted friends


async def get_pending_requests(db, user_id: int) -> list[Row]:
    """Get a list of pending *incoming* friend requests for the given user id.

    Returns rows shaped for FriendResponse: the viewer is always the addressee,
    so the "other user" (u.*) is the requester. requester_id is included so the
    router's is_requester check stays consistent with get_friends.
    """
    async with db.execute(
        """
        SELECT
            u.id, u.username, u.avatar_path, u.is_online,
            f.id AS friendship_id, f.requester_id, f.status, f.created_at
        FROM friendships f
        JOIN users u
            ON f.requester_id = u.id
        WHERE f.addressee_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
        """,
        (user_id,),
    ) as cursor:
        return await cursor.fetchall()  # return a list of pending friend requests


async def get_outgoing_pending_requests(db, user_id: int) -> list[Row]:
    """Get a list of pending *outgoing* friend requests for the given user id.

    Returns rows shaped for FriendResponse: the viewer is always the requester,
    so the "other user" (u.*) is the addressee. requester_id is included so the
    router's is_requester check stays consistent with the other friend reads.
    """
    async with db.execute(
        """
        SELECT
            u.id, u.username, u.avatar_path, u.is_online,
            f.id AS friendship_id, f.requester_id, f.status, f.created_at
        FROM friendships f
        JOIN users u
            ON f.addressee_id = u.id
        WHERE f.requester_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
        """,
        (user_id,),
    ) as cursor:
        return await cursor.fetchall()
