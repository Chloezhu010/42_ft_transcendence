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
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e  # run browser smoke suite (chromium/firefox/webkit)
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
npm run test:e2e
npm run build
```

If your change touches both sides, run both sets of checks.

## Frontend Path Alias

The frontend resolves `@/*` to `frontend/*` (wired in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`). Prefer the alias over relative `../` imports so files can move without rewriting import paths:

```ts
import { Heading } from '@/components/design-system/Typography';
import { useStoryGenerator } from '@/hooks/useStoryGenerator';
```

## Browser Compatibility

Supported browser targets:

- Chrome (latest stable)
- Firefox (latest stable)
- Safari 17+ (validated through Playwright WebKit in CI plus manual Safari smoke check before release)

Cross-browser smoke tests are in `frontend/tests/e2e` and run through Playwright projects (`chromium`, `firefox`, `webkit`).

Known limitations and handling:

- CI uses WebKit as the Safari automation target. WebKit is a strong approximation, but final release validation should still include one real Safari pass (desktop or iOS) for rendering parity.
- Native browser UI elements (file-picker chrome and autofill styling) can differ slightly between browsers. This is cosmetic and does not affect functionality.
