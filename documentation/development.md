# Development Guide

## Prerequisites

- **Python 3.13+** and [uv](https://docs.astral.sh/uv/) (backend)
- **Node.js 20+** and npm (frontend; CI uses Node.js 22, Docker uses `node:20-alpine`)
- **Docker + Docker Compose v2** (containerised run)
- A `.env` file at repo root — copy `.env.example` and fill in secrets

## Local Development (without Docker)

**Backend** (from `backend/`):
```bash
uv sync --extra test
uv run uvicorn main:app --reload --port 8000
```

Requires `GEMINI_API_KEY`, `JWT_SECRET_KEY`, `SESSION_SECRET_KEY` in `.env` (loaded automatically via `python-dotenv`).

For Google OAuth locally, also set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

**Frontend** (from `frontend/`):
```bash
npm install
npm run dev       # http://localhost:3000
npm test          # run vitest
npm run typecheck # TypeScript check
npm run build     # production build → dist/
```

Vite, TypeScript, React, and test tooling are project dependencies installed by `npm install`; only Node.js and npm need to be installed globally.

## Docker Compose Commands

```bash
docker compose up --build        # Build and start (foreground)
docker compose up --build -d     # Build and start (background)
docker compose down              # Stop and remove containers
docker compose logs -f           # Follow all service logs
docker compose logs backend      # Backend logs only
docker compose logs frontend     # Frontend logs only
```

Open **https://localhost:8443** in Google Chrome. Accept the self-signed certificate warning on first load.

Grafana is available at **https://localhost:8443/grafana** (credentials: admin / `$GRAFANA_ADMIN_PASSWORD`).

## Pre-push Checks

Run all checks for the area you changed before pushing. CI mirrors these exactly.

**Backend** (from `backend/`):
```bash
uv tool run ruff check .          # lint
uv tool run ruff format --check . # format
uv run pytest                     # tests
```

**Frontend** (from `frontend/`):
```bash
npm run lint         # eslint
npm test -- --run    # vitest (non-interactive)
npm run typecheck    # TypeScript compilation check
npm run build        # Vite production build
```

If your change touches both sides, run both sets of checks.

## CI Workflows

Two GitHub Actions workflows run on PRs and pushes to `main`:

| Workflow | Triggers on | Steps |
|----------|------------|-------|
| `backend-ci.yml` | `backend/**` changes | ruff lint → ruff format check → pytest |
| `frontend-ci.yml` | `frontend/**` changes | npm ci → eslint → typecheck → vitest → Vite build |

## Frontend Path Alias

The frontend resolves `@/*` to `frontend/*` (configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`). Always prefer the alias over relative `../` imports:

```ts
import { Heading } from '@/components/design-system/Typography';
import { getStory } from '@/client-api/storyApi';
import type { Story } from '@/types/story';
```

### Directory layout (frontend)

```
frontend/
├── app/            # Route tree, AppLayout, ProtectedRoute, AuthContext
├── pages/          # Feature pages — each has Page.tsx + usePageHook.ts
├── components/     # Pure UI components (no page-level state)
│   └── design-system/   # Typed reusable primitives
├── client-api/     # All browser → backend API calls
├── types/          # Shared TypeScript interfaces
├── utils/          # Pure helpers and mappers
└── locales/        # i18n translation JSON files (en/fr/es/zh/ja/ar)
```

## RTL Audit

A static audit test prevents new physical-side Tailwind classes from being added to RTL-critical surfaces:

```bash
cd frontend && npx vitest run tests/i18n/rtlAudit.test.ts
```

To regenerate the baseline after intentionally fixing legacy debt:
```bash
UPDATE_RTL_BASELINE=1 npx vitest run tests/i18n/rtlAudit.test.ts
```
