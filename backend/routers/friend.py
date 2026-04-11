"""
Friend router (handle friend requests, etc.)
"""
from fastapi import APIRouter, Depends, HTTPException
from auth_utils import get_current_user
from db.crud_users import (
    send_friend_request,
    accept_friend_request,
    remove_friend,
    get_friends,
    get_pending_requests,
)
from db.database import get_db
from models import FriendResponse

router = APIRouter(prefix="/api/friends", tags=["friends"])

def _to_friend_response(row, is_requester: bool) -> FriendResponse:
    """Convert a DB friendship row to a FriendResponse model."""
    return FriendResponse(
        id=row["id"],
        username=row["username"],
        avatar_url=row["avatar_path"],
        is_online=bool(row["is_online"]),
        friendship_status=row["status"],
        is_requester=is_requester,
    )

@router.get("/", response_model=list[FriendResponse])
async def list_friends(current_user = Depends(get_current_user), db = Depends(get_db)):
    """Get friends for the authenticated user."""
    rows = await get_friends(db, current_user["id"])
    return [
        _to_friend_response(row, is_requester=row["requester_id"] == current_user["id"])
        for row in rows]

@router.get("/pending", response_model=list[FriendResponse])
async def list_pending_req(current_user = Depends(get_current_user), db = Depends(get_db)):
    """Get pending friend requests for the authenticated user."""
    rows = await get_pending_requests(db, current_user["id"])
    return [_to_friend_response(row, is_requester=False) for row in rows]

@router.post("/{user_id}/accept", response_model=FriendResponse)
async def accept_friend_req(user_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    """Accept a friend request from another user."""
    try:
        friendship = await accept_friend_request(db, current_user["id"], user_id)
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=msg) from exc
        raise HTTPException(status_code=409, detail=msg) from exc   
    return _to_friend_response(friendship, is_requester=False)

@router.post("/{user_id}", response_model=FriendResponse)
async def send_friend_req(user_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    """Send a friend request to another user."""
    try:
        friendship = await send_friend_request(db, current_user["id"], user_id)
    except ValueError as exc:
        msg = str(exc)
        if "yourself" in msg:
            raise HTTPException(status_code=400, detail=msg) from exc
        raise HTTPException(status_code=409, detail=msg) from exc
    return _to_friend_response(friendship, is_requester=True)

@router.delete("/{friend_id}")
async def remove_friend_req(friend_id: int, current_user = Depends(get_current_user), db = Depends(get_db)):
    """Remove a friend or cancel a pending friend request."""
    try:
        await remove_friend(db, current_user["id"], friend_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"message": "Friend removed successfully"}