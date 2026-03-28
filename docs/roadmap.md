# Roadmap

## Features

| Feature | Description | Implemented by |
|---------|-------------|---------------|
| User signup | Email + password with bcrypt hashing, JWT issued on success | _TBD_ |
| User login | JWT token auth, `/api/auth/login` | _TBD_ |
| User profile | View/edit username, avatar upload, profile page | _TBD_ |
| Friends system | Add/remove friends, online status indicator | _TBD_ |
| Character wizard | Multi-step form: name, appearance, photo upload, archetype, dream, art style | existing |
| Story generation | Gemini script → 10-18 panels + cover | existing |
| Image generation | Per-panel Gemini image generation with Cast Visual Guide | existing |
| Comic reader | Skeuomorphic book viewer with page-turn navigation | existing |
| Panel editing | "Magic Revision" — natural language image edit | existing |
| Story gallery | Browse past stories, re-read, delete | existing |
| Privacy Policy page | Static page, linked from footer | _TBD_ |
| Terms of Service page | Static page, linked from footer | _TBD_ |
| HTTPS | nginx TLS termination in Docker Compose | _TBD_ |
| _[Module features]_ | _[TBD based on chosen modules]_ | _TBD_ |

## Modules

**Target: 14 points minimum**

| Module | Category | Type | Points | Owner | Status |
|--------|----------|------|--------|-------|--------|
| Use a framework (frontend + backend) | Web | Major | 2 | _TBD_ | - |
| LLM system interface (Gemini comic gen) | AI | Major | 2 | _TBD_ | - |
| Standard user management | User Management | Major | 2 | _TBD_ | - |
| Real-time features (WebSocket gen progress) | Web | Major | 2 | _TBD_ | - |
| Custom design system (10+ components) | Web | Minor | 1 | _TBD_ | - |
| File upload (photo + avatar management) | Web | Minor | 1 | _TBD_ | - |
| Multiple languages (i18n, 3 languages) | Accessibility | Minor | 1 | _TBD_ | - |
| PWA with offline support | Web | Minor | 1 | _TBD_ | - |
| Notification system | Web | Minor | 1 | _TBD_ | - |

**Suggested point total: 13 — confirm final selection with team to reach 14**

> This is a suggested list — the team must finalize before implementation begins. See `docs/subject.md` Chapter IV for full module descriptions and dependencies.

## Implementation Phases

### Phase 1 — Mandatory Foundation

- [ ] Add `users` table — replace `user_id TEXT DEFAULT 'local-user'` with `INTEGER NOT NULL REFERENCES users(id)`
- [ ] Auth endpoints — `POST /api/auth/signup` and `POST /api/auth/login` using bcrypt + JWT
- [ ] JWT middleware — protect all `/api/stories/*` and `/api/generate/*` endpoints
- [ ] Fix global DB connection — replace with per-request connection
- [ ] Scope all queries to authenticated user
- [ ] HTTPS — add nginx service to `docker-compose.yml` as TLS-terminating reverse proxy
- [ ] Privacy Policy page — `/privacy` route in React
- [ ] Terms of Service page — `/terms` route in React
- [ ] Backend input validation — Pydantic field validators for all user-submitted data
- [ ] Frontend form validation — client-side validation on all forms
- [ ] Zero Chrome console errors
- [ ] Set `TEST_MODE = false` in `frontend/testConfig.ts`

### Phase 2 — Multi-user Adaptation

Existing WonderComic code to adapt (keep the logic, add user-scoping):

- [ ] `backend/database.py` — migrate schema: add `users`, `friendships` tables; update foreign keys
- [ ] `backend/main.py` — add auth routes; add `current_user` dependency to all endpoints
- [ ] `backend/crud.py` — add user filtering to all list/get queries
- [ ] `backend/models.py` — add `UserCreate`, `UserResponse`, `LoginRequest`, `TokenResponse` models
- [ ] `frontend/App.tsx` — add auth routes, protected route wrapper, footer links
- [ ] `frontend/services/backendApi.ts` — add `Authorization: Bearer <token>` header; add auth API calls
- [ ] `docker-compose.yml` — add nginx service, add `SECRET_KEY` env var

### Phase 3 — Module Implementation

_[Fill in per module once team finalizes selection]_

### Phase 4 — Submission Checklist

- [ ] Fill in team logins at top of README
- [ ] Finalize module table (reach 14 points)
- [ ] Complete Individual Contributions section
- [ ] `docker compose up --build` starts cleanly from a fresh clone
- [ ] Open Chrome → https://localhost → zero console errors
- [ ] Privacy Policy and Terms of Service pages reachable from footer
- [ ] All team members have commits visible in `git log`

## Individual Contributions

_[Fill in as work is completed — required for evaluation]_

| Login | Contributed | Challenges |
|-------|------------|-----------|
| \<login1> | _TBD_ | _TBD_ |
| \<login2> | _TBD_ | _TBD_ |
| \<login3> | _TBD_ | _TBD_ |
| \<login4> | _TBD_ | _TBD_ |
