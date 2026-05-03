import aiosqlite
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from db.backup import get_last_backup_time
from db.database import DB_PATH

router = APIRouter(tags=["health"])

_REQUIRED_TABLES = {"users", "stories", "panels"}


@router.get("/health")
async def health_check():
    """Health check for uptime monitoring."""
    checks: dict[str, str] = {}
    healthy = True

    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("PRAGMA journal_mode=WAL")
            await db.execute("PRAGMA foreign_keys=ON")

            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','stories','panels')"
            )
            rows = await cursor.fetchall()
            found = {row[0] for row in rows}
            missing = _REQUIRED_TABLES - found
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

        checks["backup"] = "ok" if get_last_backup_time() else "never"
    except Exception as e:
        print(f"Health check database error: {e}")
        checks["database"] = "unavailable"
        healthy = False

    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status": "healthy" if healthy else "unhealthy",
            "version": "1.0.0",
            "checks": checks,
        },
    )
