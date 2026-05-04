from datetime import UTC, datetime

import aiosqlite
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from db.backup import STALE_THRESHOLD, get_last_backup_time
from db.database import DB_PATH, REQUIRED_TABLES

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Health check for uptime monitoring."""
    checks: dict[str, str] = {}
    healthy = True

    try:
        # Open read-only via SQLite URI: won't create the file if absent, and
        # prevents any accidental write (including journal_mode changes).
        async with aiosqlite.connect(f"file:{DB_PATH}?mode=ro", uri=True) as db:
            placeholders = ",".join("?" * len(REQUIRED_TABLES))
            cursor = await db.execute(
                f"SELECT name FROM sqlite_master WHERE type='table' AND name IN ({placeholders})",
                tuple(REQUIRED_TABLES),
            )
            rows = await cursor.fetchall()
            found = {row[0] for row in rows}
            missing = REQUIRED_TABLES - found
            if missing:
                checks["database"] = f"schema_incomplete: missing {', '.join(sorted(missing))}"
                healthy = False
            else:
                cursor = await db.execute("PRAGMA quick_check")
                result = await cursor.fetchone()
                if result and result[0] == "ok":
                    checks["database"] = "ok"
                else:
                    checks["database"] = "corrupted"
                    healthy = False
    except Exception as e:
        print(f"Health check database error: {e}")
        checks["database"] = "unavailable"
        healthy = False

    try:
        last_backup = get_last_backup_time()
        if last_backup is None:
            checks["backup"] = "never"
            healthy = False
        else:
            age = (datetime.now(UTC) - datetime.fromisoformat(last_backup)).total_seconds()
            if age <= STALE_THRESHOLD:
                checks["backup"] = "ok"
            else:
                checks["backup"] = "stale"
                healthy = False
    except Exception as e:
        print(f"Health check backup error: {e}")
        checks["backup"] = "unavailable"
        healthy = False

    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "healthy" if healthy else "unhealthy",
            "version": "1.0.0",
            "checks": checks,
        },
    )
