# Development Guide

## Local Development (without Podman)

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

## Podman Compose Commands

```bash
podman compose up --build      # Build and start (foreground)
podman compose up --build -d   # Build and start (background)
podman compose down            # Stop and remove containers
podman compose logs -f         # Follow all service logs
podman compose logs backend    # Backend logs only
podman compose logs frontend   # Frontend logs only
```

The container stack maps nginx to unprivileged host ports for no-sudo Fedora
machines. Open `https://localhost:8443` for the app, or
`http://localhost:8080` to test the HTTP-to-HTTPS redirect.

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

## Frontend Path Alias

The frontend resolves `@/*` to `frontend/*` (wired in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`). Prefer the alias over relative `../` imports so files can move without rewriting import paths:

```ts
import { Heading } from '@/components/design-system/Typography';
import { useStoryGenerator } from '@/hooks/useStoryGenerator';
```
