"""
User router (profile viewing, editing, avatar upload, public profile lookup)
"""

import shutil, uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from auth_utils import get_current_user
from db.crud_users import get_user_by_id, update_user, update_avatar
from db.database import get_db
from models import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/api/users", tags=["users"])
