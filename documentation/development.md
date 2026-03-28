# Development Guide

## Local Development (without Docker)

**Backend** (from `backend/`):
```bash
uv sync --extra test
uv run uvicorn main:app --reload --port 8000
```

**Frontend** (from `frontend/`):
```bash
npm install
npm run dev       # http://localhost:3000
npm test          # run tests (vitest)
npm run build     # production build → dist/
```

## Docker Compose Commands

```bash
docker compose up --build      # Build and start (foreground)
docker compose up --build -d   # Build and start (background)
docker compose down            # Stop and remove containers
docker compose logs -f         # Follow all service logs
docker compose logs backend    # Backend logs only
docker compose logs frontend   # Frontend logs only
```

## Pre-push Checks

Run the checks for the area you changed before pushing:

**Backend** (from `backend/`):
```bash
ruff check .
uv run pytest
```

**Frontend** (from `frontend/`):
```bash
npm test
npm run build
```

If your change touches both sides, run both sets of checks.
