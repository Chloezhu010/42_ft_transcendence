"""
Backup management endpoints.

GET  /backup/status  — list available backups and last backup timestamp
POST /backup/trigger — run an immediate backup and return the full status after rotation
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth_utils import require_admin
from db.backup import SchemaNotReadyError, create_backup, get_last_backup_time, list_backups

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
async def backup_status(
    _: dict = Depends(require_admin),
):
    """Return backup inventory and the timestamp of the last backup. Requires admin."""
    backups = list_backups()
    return {
        "last_backup": get_last_backup_time(),
        "total_backups": len(backups),
        "backups": backups,
    }


@router.post("/trigger", response_model=BackupStatusResponse)
async def trigger_backup(
    _: dict = Depends(require_admin),
):
    """Run an immediate database backup and return the full status after rotation. Requires admin."""
    try:
        await create_backup()
    except SchemaNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    backups = list_backups()
    return {
        "last_backup": get_last_backup_time(),
        "total_backups": len(backups),
        "backups": backups,
    }
