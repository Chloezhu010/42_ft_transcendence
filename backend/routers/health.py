import aiosqlite
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from db.database import DB_PATH

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Health check for uptime monitoring."""
    checks: dict[str, str] = {}
    healthy = True

    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute("PRAGMA journal_mode=WAL")
            await db.execute("PRAGMA foreign_keys=ON")
            cursor = await db.execute("SELECT 1")
            await cursor.fetchone()
        checks["database"] = "ok"
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
