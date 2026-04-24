"""
FastAPI main application with CORS and API routes.
"""

import shutil
from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from config import get_config
from db.database import get_db, init_db
from routers import auth, friend, generation, monitoring, stories, user


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database lifecycle."""
    config = get_config()
    print(f"Starting WonderComic API with frontend URL: {config.frontend_url}")

    await init_db()
    yield


app = FastAPI(title="WonderComic API", version="1.0.0", lifespan=lifespan)

# CORS for frontend
config = get_config()
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://localhost",
]
if config.frontend_url not in allowed_origins:
    allowed_origins.append(config.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Serve images as static files
images_dir = Path(__file__).parent / "images"
images_dir.mkdir(exist_ok=True)

# Seed immutable default assets into the images volume on startup.
# The named `backend_images` volume shadows this subpath of the repo bind-mount,
# so files committed under backend/images/ aren't visible inside the container.
# Keep seed copies under backend/seed/ (outside the shadowed path) and restore
# them idempotently here — safe across fresh volumes and existing ones.
seed_dir = Path(__file__).parent / "seed"
if seed_dir.is_dir():
    for seed_file in seed_dir.iterdir():
        if seed_file.is_file():
            target = images_dir / seed_file.name
            if not target.exists():
                shutil.copy(seed_file, target)

app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

# Register routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(friend.router)
app.include_router(generation.router)
app.include_router(stories.router)
app.include_router(monitoring.router)

# Expose /metrics endpoint for Prometheus scraping
# Exclude internal endpoints to avoid noise in dashboards
Instrumentator(excluded_handlers=["/metrics", "/health"]).instrument(app).expose(app)


# --- Health Check ---
@app.get("/health")
async def health_check(db: aiosqlite.Connection = Depends(get_db)):
    """Health check for uptime monitoring."""
    checks = {}
    healthy = True

    try:
        cursor = await db.execute("SELECT 1")
        await cursor.fetchone()
        checks["database"] = "ok"
    except Exception as e:
        print(f"Health check database error: {e}")
        checks["database"] = "unavailable"
        healthy = False

    status_code = 200 if healthy else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if healthy else "unhealthy",
            "version": "1.0.0",
            "checks": checks,
        },
    )
