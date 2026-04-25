"""CRUD operations for friendships."""

import aiosqlite
from aiosqlite import Row

from db.users_crud import get_user_by_id


async def get_friendship_between(db: aiosqlite.Connection, user_id: int, other_user_id: int) -> Row | None:
    """Check if there is a friendship between two users."""
    async with db.execute(
        "SELECT * FROM friendships"
        " WHERE (requester_id = ? AND addressee_id = ?)"
        " OR (requester_id = ? AND addressee_id = ?)",
        (user_id, other_user_id, other_user_id, user_id),
    ) as cursor:
        return await cursor.fetchone()


async def has_accepted_friendship(db: aiosqlite.Connection, user_id: int, other_user_id: int) -> bool:
    """Return True when the two users have an accepted friendship."""
    friendship = await get_friendship_between(db, user_id, other_user_id)
    return friendship is not None and friendship["status"] == "accepted"


async def get_friend_view(db: aiosqlite.Connection, viewer_id: int, other_user_id: int) -> Row | None:
    """Return a joined friendship and user row shaped for FriendResponse."""
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


async def send_friend_request(db: aiosqlite.Connection, requester_id: int, addressee_id: int) -> Row:
    """Send a friend request from requester to addressee."""
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

    await db.execute("INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)", (requester_id, addressee_id))
    await db.commit()

    friendship = await get_friendship_between(db, requester_id, addressee_id)
    if friendship is None:
        raise RuntimeError("Failed to create friend request")
    return friendship


async def accept_friend_request(db: aiosqlite.Connection, current_user_id: int, requester_id: int) -> Row:
    """Accept a friend request."""
    friendship = await get_friendship_between(db, current_user_id, requester_id)
    if friendship is None:
        raise ValueError("Friend request not found")
    if friendship["status"] != "pending":
        raise ValueError("Friend request is not pending")
    if friendship["addressee_id"] != current_user_id:
        raise ValueError("Only the addressee can accept the friend request")

    await db.execute("UPDATE friendships SET status = 'accepted' WHERE id = ?", (friendship["id"],))
    await db.commit()

    updated_friendship = await get_friendship_between(db, current_user_id, requester_id)
    if updated_friendship is None:
        raise RuntimeError("Failed to update friend request")
    return updated_friendship


async def remove_friend(db: aiosqlite.Connection, user_id: int, friend_id: int) -> bool:
    """Remove a friend or pending friendship."""
    friendship = await get_friendship_between(db, user_id, friend_id)
    if friendship is None:
        raise ValueError("Friendship not found")

    await db.execute("DELETE FROM friendships WHERE id = ?", (friendship["id"],))
    await db.commit()
    return True


async def get_friends(db: aiosqlite.Connection, user_id: int) -> list[Row]:
    """Get accepted friends for the given user."""
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
        return await cursor.fetchall()


async def get_pending_requests(db: aiosqlite.Connection, user_id: int) -> list[Row]:
    """Get pending incoming friend requests for the given user."""
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
        return await cursor.fetchall()


async def get_outgoing_pending_requests(db: aiosqlite.Connection, user_id: int) -> list[Row]:
    """Get pending outgoing friend requests for the given user."""
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
