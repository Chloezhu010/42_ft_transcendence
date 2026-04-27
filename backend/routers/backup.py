"""
Backup management endpoints.

GET  /backup/status  — list available backups and last backup timestamp
POST /backup/trigger — run an immediate backup and return the full status after rotation
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth_utils import get_current_user
from db.backup import create_backup, get_last_backup_time, list_backups

router = APIRouter(prefix="/api/backup", tags=["backup"])


class BackupEntry(BaseModel):
    filename: str
    size_bytes: int
    created_at: str


class BackupStatusResponse(BaseModel):
    last_backup: str | None
    total_backups: int
    backups: list[BackupEntry]


@router.get("/status", response_model=BackupStatusResponse)
async def backup_status():
    """Return backup inventory and the timestamp of the last backup."""
    backups = list_backups()
    return {
        "last_backup": get_last_backup_time(),
        "total_backups": len(backups),
        "backups": backups,
    }


@router.post("/trigger", response_model=BackupStatusResponse)
async def trigger_backup(
    current_user: dict = Depends(get_current_user),
):
    """Run an immediate database backup and return the full status after rotation. Requires authentication."""
    await create_backup()
    backups = list_backups()
    return {
        "last_backup": get_last_backup_time(),
        "total_backups": len(backups),
        "backups": backups,
    }
