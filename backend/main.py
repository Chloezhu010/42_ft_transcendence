"""
FastAPI main application with CORS and API routes.
"""

import asyncio
import contextlib
import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.sessions import SessionMiddleware

from config import get_config
from db.backup import create_backup
from db.database import init_db
from routers import auth, backup, friend, generation, health, monitoring, stories, user

_BACKUP_INTERVAL_SECONDS = 24 * 60 * 60


async def _schedule_backups() -> None:
    """Run a backup immediately on startup, then repeat every 24 hours."""
    while True:
        try:
            await create_backup()
        except Exception as exc:
            print(f"Scheduled backup failed: {exc}")
        await asyncio.sleep(_BACKUP_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database lifecycle and scheduled backup task."""
    config = get_config()
    print(f"Starting WonderComic API with frontend URL: {config.frontend_url}")

    await init_db()
    backup_task = asyncio.create_task(_schedule_backups())
    yield
    backup_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await backup_task


app = FastAPI(title="WonderComic API", version="1.0.0", lifespan=lifespan)

# CORS for frontend
config = get_config()
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://localhost:8443",
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

app.add_middleware(
    SessionMiddleware,
    secret_key=config.session_secret_key,
    https_only=config.session_cookie_secure,
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
app.include_router(backup.router)
app.include_router(health.router)

# Expose /metrics endpoint for Prometheus scraping
# Exclude internal endpoints to avoid noise in dashboards
Instrumentator(excluded_handlers=["/metrics", "/health"]).instrument(app).expose(app)
