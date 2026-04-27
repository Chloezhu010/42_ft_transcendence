import aiosqlite
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from db.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: aiosqlite.Connection = Depends(get_db)):
    """Health check for uptime monitoring."""
    checks: dict[str, str] = {}
    healthy = True

    try:
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
