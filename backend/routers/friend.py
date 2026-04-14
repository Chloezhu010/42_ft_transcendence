"""
Friend router (handle friend requests, etc.)

URL contract (authoritative: tests/test_friend_routes.py):
    GET    /api/friends/                  list accepted friends
    GET    /api/friends/pending           list *incoming* pending requests
    POST   /api/friends/{user_id}         send a friend request
    POST   /api/friends/{user_id}/accept  accept an incoming request
    DELETE /api/friends/{friend_id}       remove friend / cancel pending
"""

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user
from db.crud_users import (
    accept_friend_request,
    get_friend_view,
    get_friends,
    get_pending_requests,
    remove_friend,
    send_friend_request,
)
from db.database import get_db
from models import FriendResponse

router = APIRouter(prefix="/api/friends", tags=["friends"])

# --- helpers ---------------------------------------------------------------


def _to_friend_response(row, viewer_id: int) -> FriendResponse:
    """Convert a joined friendship+user row to a FriendResponse.

    The row MUST contain: id (the *friend*'s user id), username, avatar_path,
    is_online, status, requester_id. Every read path goes through a joined
    query (get_friends / get_pending_requests / _get_friend_view) that
    guarantees this shape.
    """
    return FriendResponse(
        id=row["id"],
        username=row["username"],
        avatar_url=row["avatar_path"],
        is_online=bool(row["is_online"]),
        friendship_status=row["status"],
        is_requester=row["requester_id"] == viewer_id,
    )


# --- reads -----------------------------------------------------------------


@router.get("/", response_model=list[FriendResponse])
async def list_friends_endpoint(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
) -> list[FriendResponse]:
    """Get accepted friends for the authenticated user."""
    rows = await get_friends(db, current_user["id"])
    return [_to_friend_response(row, current_user["id"]) for row in rows]


@router.get("/pending", response_model=list[FriendResponse])
async def list_pending_endpoint(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
) -> list[FriendResponse]:
    """Get incoming pending friend requests for the authenticated user."""
    rows = await get_pending_requests(db, current_user["id"])
    return [_to_friend_response(row, current_user["id"]) for row in rows]


# --- writes ----------------------------------------------------------------


@router.post("/{user_id}/accept", response_model=FriendResponse)
async def accept_friend_request_endpoint(
    user_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
) -> FriendResponse:
    """Accept a pending friend request from user_id."""
    try:
        await accept_friend_request(db, current_user["id"], user_id)
    except ValueError as exc:
        msg = str(exc)
        # No friendship row exists between these two users at all.
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=msg) from exc
        # Already accepted, or caller is the requester (not the addressee).
        raise HTTPException(status_code=409, detail=msg) from exc
    view = await get_friend_view(db, current_user["id"], user_id)
    if view is None:  # defensive: write succeeded but join missed
        raise HTTPException(status_code=500, detail="Failed to load friend view")
    return _to_friend_response(view, current_user["id"])


@router.post("/{user_id}", response_model=FriendResponse)
async def create_friend_request(
    user_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
) -> FriendResponse:
    """Send a friend request to user_id."""
    try:
        await send_friend_request(db, current_user["id"], user_id)
    except ValueError as exc:
        msg = str(exc)
        # Cannot send request to yourself → 400
        if "yourself" in msg:
            raise HTTPException(status_code=400, detail=msg) from exc
        # Everything else (already friends, pending exists, addressee not
        # found) → 409. Pinned by test_send_to_nonexistent_user_returns_409.
        raise HTTPException(status_code=409, detail=msg) from exc
    view = await get_friend_view(db, current_user["id"], user_id)
    if view is None:  # defensive: write succeeded but join missed
        raise HTTPException(status_code=500, detail="Failed to load friend view")
    return _to_friend_response(view, current_user["id"])


@router.delete("/{friend_id}")
async def delete_friend_endpoint(
    friend_id: int,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
) -> dict:
    """Remove a friend or cancel/reject a pending friend request."""
    try:
        await remove_friend(db, current_user["id"], friend_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"message": "Friend removed successfully"}
