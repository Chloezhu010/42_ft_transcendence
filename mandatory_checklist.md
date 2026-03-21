# ft_transcendence — Mandatory Compliance Checklist

> Source: `docs/subject.md` Chapter III (§ III.2 General Requirements + § III.3 Technical Requirements)
> These are **non-negotiable**. Any single ❌ at evaluation = project rejection.
> Module points (Chapter IV) are only counted after all mandatory items pass.

---

## § III.2 — General Requirements

| # | Requirement (subject wording) | Status | Current state | Owner |
|---|---|:---:|---|---|
| 1 | "The project must be a web application, and requires a **frontend, backend, and a database**" | ✅ | React + FastAPI + SQLite | — |
| 2a | "Commits from **all team members**" | ❌ | Single author in git log | All |
| 2b | "**Clear commit messages** describing the changes" | ⚠️ | Some commits exist (`changed table size`, `added playground folder`) — no convention yet | All |
| 2c | "**Proper work distribution** across the team" | ❌ | No evidence yet; evaluators check `git log` | All |
| 3 | "Deployment must use a **containerization solution** and run with a **single command**" | ⚠️ | `docker compose up --build` works but HTTPS is missing (see #15) | TBD |
| 4 | "Website must be compatible with the latest stable version of **Google Chrome**" | ⚠️ | Never tested; `TEST_MODE=true` means full generation is broken | TBD |
| 5 | "**No warnings or errors** should appear in the browser console" | ⚠️ | Needs Chrome DevTools audit; likely issues with CDN Tailwind + missing env vars | TBD |
| 6 | "**Privacy Policy** page — easily accessible, relevant content, **not placeholder**" | ❌ | No `/privacy` route exists | TBD |
| 7 | "**Terms of Service** page — easily accessible, relevant content, **not placeholder**" | ❌ | No `/terms` route exists | TBD |
| 8a | "**Multiple users** can be logged in and active at the same time" | ❌ | No auth — everyone is hardcoded `'local-user'` | TBD |
| 8b | "**Concurrent actions** by different users are handled properly" | ❌ | `database.py:8` — single global `_db` connection; SQLite single-writer will deadlock | TBD |
| 8c | "**Real-time updates** reflected across all connected users when applicable" | ❌ | No WebSockets, no SSE, nothing real-time | TBD |
| 8d | "**No data corruption or race conditions** with simultaneous user actions" | ❌ | Global connection + no user isolation = guaranteed corruption under concurrent load | TBD |

---

## § III.3 — Technical Requirements

| # | Requirement (subject wording) | Status | Current state | Owner |
|---|---|:---:|---|---|
| 9 | "A frontend that is **clear, responsive, and accessible** across all devices" | ⚠️ | UI exists; mobile responsiveness and a11y not verified | TBD |
| 10 | "Use a **CSS framework or styling solution** of your choice" | ✅ | Tailwind CSS (CDN) | — |
| 11a | "Store credentials in a local **`.env` file that is ignored by Git**" | ✅ | `.env` is in `.gitignore` | — |
| 11b | "Provide an **`.env.example`** file" | ✅ | Exists at repo root | — |
| 12 | "Database must have a **clear schema** and **well-defined relations**" | ⚠️ | Schema exists but `user_id TEXT DEFAULT 'local-user'` is not a real FK — no `users` table | TBD |
| 13 | "**Email and password** authentication with **hashed passwords, salted**" | ❌ | No auth system. No `users` table. bcrypt not installed | TBD |
| 14a | "All forms validated in the **frontend**" | ❌ | `KidWizard.tsx` collects inputs with no validation logic | TBD |
| 14b | "All forms validated in the **backend**" | ⚠️ | Pydantic enforces types but no business-rule validators (email format, password strength, etc.) | TBD |
| 15 | "For the backend, **HTTPS must be used everywhere**" | ❌ | Plain HTTP on port 8000. No nginx, no TLS in `docker-compose.yml` | TBD |

---

## Score

| | Count |
|---|---|
| ✅ Already done | 5 |
| ⚠️ Partial / needs verification | 6 |
| ❌ Completely missing | 9 |

---

## The 9 Blockers (fix these before any module work)

These are the ❌ items above. Any one of them causes project rejection:

- [ ] **#2a / #2c** — No commits from all team members. Every member must have visible contributions in `git log`.
- [ ] **#6** — No Privacy Policy page. Must be a real page (not placeholder), linked from footer.
- [ ] **#7** — No Terms of Service page. Must be a real page (not placeholder), linked from footer.
- [ ] **#8a / #13** — No authentication. Add `users` table, `POST /api/auth/signup`, `POST /api/auth/login` with bcrypt-hashed passwords + JWT.
- [ ] **#8b / #8d** — Global DB connection (`database.py:8`). Will deadlock under concurrent users. Replace with per-request `aiosqlite.connect()`.
- [ ] **#8a** — All data is scoped to hardcoded `'local-user'`. Must be replaced with FK to authenticated user.
- [ ] **#8c** — No real-time updates across concurrent users. At minimum, generation progress must reflect state to the active user; if multiple users affect shared state, it must propagate.
- [ ] **#14a** — No frontend form validation on any form (KidWizard, future login/signup forms).
- [ ] **#15** — No HTTPS. Add nginx service to `docker-compose.yml` as TLS-terminating reverse proxy.

---

## Partial Items to Complete (⚠️)

These pass partially but will be flagged during evaluation if not finished:

- [ ] **#2b** — Agree on a commit message convention as a team (e.g. `feat:`, `fix:`, `docs:`). Apply from now on.
- [ ] **#3** — `docker compose up --build` must be truly single-command including HTTPS. Fix after adding nginx.
- [ ] **#4** — Open the app in latest stable Chrome and test all flows end-to-end. Set `TEST_MODE=false` first.
- [ ] **#5** — Run Chrome DevTools → Console on every page. Fix all warnings and errors before evaluation.
- [ ] **#9** — Test on mobile viewport (375px). Check keyboard navigation and color contrast (a11y).
- [ ] **#12** — Add `users` table and update `kid_profiles.user_id` + `stories.user_id` to proper `INTEGER NOT NULL REFERENCES users(id)` foreign keys.
- [ ] **#14b** — Add Pydantic field validators for email format, password strength, required fields, string length limits.

---

## Quick Reference — Files to Change per Blocker

| Blocker | Files |
|---------|-------|
| Auth (signup/login/JWT) | `backend/database.py`, `backend/models.py`, `backend/crud.py`, `backend/main.py`, `frontend/App.tsx`, `frontend/services/backendApi.ts` |
| Global DB connection | `backend/database.py` |
| User scoping | `backend/crud.py`, `backend/main.py` |
| HTTPS / nginx | `docker-compose.yml` + new `nginx/` config directory |
| Privacy Policy page | `frontend/App.tsx` + new `frontend/components/PrivacyPage.tsx` |
| Terms of Service page | `frontend/App.tsx` + new `frontend/components/TermsPage.tsx` |
| Frontend form validation | `frontend/components/KidWizard.tsx` + future auth forms |
| Backend validation | `backend/models.py` (add Pydantic validators) |
| Real-time updates | `backend/main.py` (add WebSocket endpoint) + `frontend/hooks/` |
| Git contributions | All team members must make commits — no technical fix, just team process |
