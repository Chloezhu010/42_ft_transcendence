*This project has been created as part of the 42 curriculum by \<login1>, \<login2>, \<login3>, \<login4>.*

---

# ft_transcendence

> **Subject version:** 20.0 — Open-ended group web application (4–5 people). Must earn 14 points from a module menu.

**\[Project name TBD by team]** — Brief description of what your team is building goes here.

---

## Description

_[Replace this with your team's chosen project concept, its goal, and key features.]_

**Current state:** This repository starts from the **WonderComic scaffold** — a React 19 + FastAPI + Docker Compose base. The WonderComic-specific features (comic generation, Gemini AI, KidWizard onboarding) are being replaced with the actual ft_transcendence application.

### Key Features (planned)

- _Feature 1_
- _Feature 2_
- _Feature 3_

---

## Team Information

| Login | Role(s) | Responsibilities |
|-------|---------|-----------------|
| \<login1> | Product Owner + Developer | Product backlog, feature prioritization, _[module name]_ |
| \<login2> | Project Manager + Developer | Sprint planning, blocker removal, _[module name]_ |
| \<login3> | Tech Lead + Developer | Architecture decisions, code reviews, _[module name]_ |
| \<login4> | Developer | _[module name]_, _[module name]_ |

---

## Project Management

- **Task tracking:** _[GitHub Issues / Trello / Notion — TBD]_
- **Meetings:** _[Weekly / bi-weekly — TBD]_
- **Communication:** _[Discord / Slack — TBD]_
- **Work distribution:** Tasks assigned per module; each module has one owner with code review from at least one other member.

---

## Instructions

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose (included with Docker Desktop)
- Or for local dev: Python 3.13+, [uv](https://docs.astral.sh/uv/), Node.js 18+

### Setup & Run (Docker — required for evaluation)

```bash
git clone https://github.com/<your-team-org>/ft_transcendence.git
cd ft_transcendence
cp .env.example .env
# Edit .env and fill in required values (see Environment Variables below)
docker compose up --build
```

Open https://localhost (or http://localhost:3000 for dev).

#### Docker Compose Commands

```bash
docker compose up --build      # Build and start (foreground)
docker compose up --build -d   # Build and start (background)
docker compose down            # Stop and remove containers
docker compose logs -f         # Follow all service logs
docker compose logs backend    # Backend logs only
```

### Local Development (without Docker)

**Backend** (from `backend/`):
```bash
uv sync
uv run uvicorn main:app --reload --port 8000
```

**Frontend** (from `frontend/`):
```bash
npm install
npm run dev   # starts on http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | JWT signing secret (generate with `openssl rand -hex 32`) | **Yes** |
| `DATABASE_URL` | DB connection string (default: SQLite `./app.db`) | No |
| `FRONTEND_URL` | Allowed CORS origin (default: `http://localhost:3000`) | No |
| `VITE_API_BASE_URL` | Backend URL seen by the browser (default: `http://localhost:8000`) | No |
| `GEMINI_API_KEY` | Google Gemini API key (only if AI module is implemented) | If AI module |

> ⚠️ Never commit `.env` — it is git-ignored. Only `.env.example` is tracked.

---

## Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend framework | React 19 + Vite 6 + TypeScript | Fast HMR, strong typing, component ecosystem |
| Routing | React Router v7 | Client-side SPA routing |
| Styling | Tailwind CSS | Utility-first, rapid UI iteration |
| Backend framework | FastAPI (Python 3.13) | Async, Pydantic validation, auto OpenAPI docs |
| Database | SQLite (aiosqlite) → PostgreSQL for prod | Lightweight for dev; PostgreSQL for multi-user concurrency |
| Auth | JWT (python-jose / PyJWT) + bcrypt | Stateless tokens, industry-standard password hashing |
| Containerization | Docker Compose | Single-command startup as required by subject |
| HTTPS | nginx reverse proxy (TLS termination) | Mandatory per subject |
| Real-time | WebSockets (FastAPI native) | _[if Real-time features module chosen]_ |

> **Justification for major choices:**
> - **FastAPI over Django/Flask:** Async-native, Pydantic validation built-in, automatic OpenAPI docs, Python 3.13 compatible.
> - **SQLite → PostgreSQL path:** SQLite works for dev (zero setup), but the subject requires multi-user concurrency — PostgreSQL handles concurrent writes properly.
> - **JWT over sessions:** Stateless, works across Docker services without shared session storage.

---

## Database Schema

_[Replace with your actual schema once designed. Example below uses a Pong game as reference.]_

```
users
├── id          INTEGER PRIMARY KEY
├── email       TEXT UNIQUE NOT NULL
├── username    TEXT UNIQUE NOT NULL
├── password    TEXT NOT NULL          ← bcrypt hash
├── avatar_url  TEXT
├── created_at  TIMESTAMP
└── updated_at  TIMESTAMP

[additional tables based on your app concept]
```

**Relationships:**
- _[Describe foreign keys and relationships here]_

---

## Features List

| Feature | Description | Implemented by |
|---------|-------------|---------------|
| User signup | Email + password with bcrypt hashing | _TBD_ |
| User login | JWT token issuance | _TBD_ |
| Privacy Policy page | Static page accessible from footer | _TBD_ |
| Terms of Service page | Static page accessible from footer | _TBD_ |
| _[Feature N]_ | _[Description]_ | _TBD_ |

---

## Modules

**Target: 14 points minimum**

| Module | Category | Type | Points | Owner | Status |
|--------|----------|------|--------|-------|--------|
| _TBD_ | | Major | 2 | | ☐ |
| _TBD_ | | Minor | 1 | | ☐ |

**Point total: TBD / 14**

> Module choices must be finalized by the team before implementation begins. See `docs/subject.md` Chapter IV for the full module list and dependencies.

---

## Implementation Roadmap

This section tracks what needs to be built or changed from the current WonderComic scaffold.

### 🔴 Phase 1 — Mandatory Foundation (blocks everything else)

These are required by the subject and must exist before any module work:

- [ ] **User authentication** — Add `users` table; implement `POST /api/auth/signup` and `POST /api/auth/login` with bcrypt password hashing and JWT tokens; protect all endpoints with auth middleware
- [ ] **Fix global DB connection** — `database.py` uses a single global `_db` connection, which breaks under concurrent users; replace with per-request connection or connection pool
- [ ] **User-scoped data** — All existing endpoints have hardcoded `user_id = 'local-user'`; scope them to the authenticated user from the JWT
- [ ] **HTTPS** — Add an nginx service to `docker-compose.yml` as TLS-terminating reverse proxy; generate self-signed cert for dev
- [ ] **Privacy Policy page** — Add `/privacy` route in React; link from footer on every page
- [ ] **Terms of Service page** — Add `/terms` route in React; link from footer on every page
- [ ] **Form validation** — Add Pydantic validators for all user inputs on backend; add client-side validation on all forms in frontend
- [ ] **Zero console errors** — Test in latest stable Chrome; fix all warnings and errors

### 🟡 Phase 2 — WonderComic Cleanup (replace scaffold-specific code)

These files are WonderComic-specific and must be replaced with your actual app:

- [ ] **Delete** `backend/gemini_service.py` (unless AI module chosen)
- [ ] **Rewrite** `backend/database.py` — new schema for your app's domain
- [ ] **Rewrite** `backend/models.py` — Pydantic models for your domain
- [ ] **Rewrite** `backend/crud.py` — CRUD for your domain
- [ ] **Rewrite** `frontend/App.tsx` — new routes, auth-protected routes, footer with Policy/ToS links
- [ ] **Delete** `frontend/components/KidWizard.tsx`, `MainPage.tsx`, `GalleryPage.tsx`, `ComicPanel.tsx`
- [ ] **Delete** `frontend/hooks/useStoryGenerator.ts`
- [ ] **Keep & extend** `frontend/components/design-system/` — reusable primitives (Forms, Icons, Typography, Primitives)
- [ ] **Keep & extend** `frontend/services/backendApi.ts` — add auth headers, new typed API calls
- [ ] **Update** `docker-compose.yml` — add nginx, remove `GEMINI_API_KEY` if not using AI module
- [ ] **Update** `.env.example` — add `SECRET_KEY`, remove Gemini key if unused
- [ ] **Set** `testConfig.ts` `TEST_MODE = false`

### 🟢 Phase 3 — Module Implementation

_[Fill in once team decides on modules. Each module should have its own sub-section here.]_

### 📄 Phase 4 — README & Submission

- [ ] Fill in team logins at top of this file
- [ ] Choose and commit to project concept (replace _TBD_ sections)
- [ ] Finalize module table with owners and point totals
- [ ] Write database schema section
- [ ] Write individual contributions section
- [ ] Confirm `docker compose up --build` starts everything cleanly
- [ ] Final Chrome smoke test (zero console errors)

---

## Individual Contributions

_[Fill in as work is completed. Required for evaluation.]_

| Login | Contributed | Challenges |
|-------|------------|-----------|
| \<login1> | _TBD_ | _TBD_ |
| \<login2> | _TBD_ | _TBD_ |
| \<login3> | _TBD_ | _TBD_ |
| \<login4> | _TBD_ | _TBD_ |

---

## Resources

### Documentation
- [FastAPI docs](https://fastapi.tiangolo.com/)
- [React 19 docs](https://react.dev/)
- [Vite docs](https://vitejs.dev/)
- [Tailwind CSS docs](https://tailwindcss.com/docs)
- [aiosqlite](https://aiosqlite.omnilib.dev/)
- [python-jose (JWT)](https://python-jose.readthedocs.io/)
- [bcrypt (passlib)](https://passlib.readthedocs.io/)
- [Docker Compose reference](https://docs.docker.com/compose/compose-file/)
- [nginx HTTPS self-signed cert guide](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [ft_transcendence subject v20.0](./docs/subject.md)

### AI Usage
_[Describe how AI tools were used, which tasks, and which parts of the project — required by subject Chapter VI.]_

Example:
- Claude Code was used for initial scaffold analysis, gap analysis vs. subject requirements, and README drafting. All generated code was reviewed and understood by the team before use.
- _[AI tool]_ was used for _[specific task]_ — outputs were reviewed by _[login]_.
