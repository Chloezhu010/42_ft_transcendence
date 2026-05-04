# ft_transcendence — Module Checklist

> Source: `docs/subject.md` Chapter IV
> Target: **14 points** (Major = 2 pts, Minor = 1 pt)
> Bonus: up to 5 extra points for modules beyond 14

---

## Proposed Modules to Implement

> **Total proposed after dropping microservices: 18 pts** (14 required + 4 buffer — buffer protects against a module being rejected at evaluation)

| # | Category | Module | Type | Pts | Status | Risk | Notes |
|---|----------|--------|------|-----|--------|------|-------|
| 1 | Web | Use a framework for both frontend and backend | Major | 2 | ✅ Done | Low | React 19 + FastAPI — claimable immediately |
| 2 | Web | Public API (secured API key, rate limiting, docs, 5 endpoints) | Major | 2 | ⚠️ Partial | Low | FastAPI auto-docs + many endpoints exist; per-user fixed-window rate limiter wired to generation endpoints (`services/rate_limit.py`); still need API key header, broader rate limiting, `PUT`, and CORS support for `PUT` |
| 3 | Web | Complete notification system | Minor | 1 | ⚠️ Partial | Low | `sonner` already installed; wire to all create/update/delete actions |
| 4 | Web | Custom design system (10+ reusable components) | Minor | 1 | ✅ Done | Low | 10+ reusable components now exist: buttons, card, inputs, typography, icons, loaders, storage image, etc. |
| 5 | Web | Advanced search functionality (filters, sorting, pagination) | Minor | 1 | ❌ Not started | Low | Add search UI + backend query filtering for the gallery/library: filter by art style/language/kid profile, sort by created date, paginate results |
| 6 | Accessibility | Multiple languages — i18n (3 languages) | Minor | 1 | ⚠️ Partial | Low | `i18next`, 6 locales, language switcher, and document `lang`/`dir` exist; finish remaining hardcoded UI text before claiming |
| 7 | Accessibility | Right-to-left (RTL) language support | Minor | 1 | ✅ Done | Low | Arabic locale + `document.dir` synced via `i18n.dir()`; full layout mirroring (logical properties), RTL-specific UI adjustments, seamless LTR↔RTL switching through the language switcher |
| 8 | User Management | Standard user management and authentication | Major | 2 | ✅ Done | Low | Signup/login/logout, hashed passwords, JWT sessions, profile update, avatar upload, friends, online status, and profile page exist |
| 9 | User Management | OAuth 2.0 (42 School / GitHub / Google) | Minor | 1 | ✅ Done | Low | Google OAuth flow exists; demo requires valid Google OAuth environment variables |
| 10 | AI | LLM system interface (Gemini story + image generation) | Major | 2 | ✅ Done | Low | Text + image generation with retry; story-script streaming via NDJSON (`POST /api/generate/story-script/stream`) drives the live title/foreword intro |
| 11 | AI | Voice / speech integration | Minor | 1 | ✅ Done | Low | Web Speech API hooks (`useSpeechSynthesis`, `useSpeechRecognition`); read-aloud control wired into Storyboard + Preview views; voice input wired into KidWizard |
| 12 | DevOps | Prometheus + Grafana monitoring | Major | 2 | ✅ Done | Low | `/metrics`, Prometheus, Grafana, Alertmanager, node exporter, custom Gemini/story metrics, dashboards, and alert rules exist |
| 13 | DevOps | Health check + status page + automated backups | Minor | 1 | ✅ Done | Low | `GET /health`, `/status` UI, startup + 24h backups, manual backup trigger, rotation, and recovery docs exist |

### Point Breakdown

| Category | Modules | Pts |
|----------|---------|-----|
| Web | Frameworks + Public API + Notification + Design system + Advanced search | 7 |
| Accessibility | Multi-language + RTL | 2 |
| User Management | Standard auth + OAuth | 3 |
| AI | LLM interface + Voice/speech | 3 |
| DevOps | Prometheus/Grafana + Health check | 3 |
| **Total proposed** | | **18** |

| **Minimum required** | | **14** |
| **Buffer** | Protects against 1 Major + 2 Minors being rejected | **+4** |

### Dependencies & Implementation Order

```
Mandatory auth            ──► Standard user management (#7) ──► OAuth 2.0 (#8)
                         ──► Public API (#2)  ← benefits from user-scoped API keys
Gallery/library page      ──► Advanced search (#5)  ← needs an existing list view to filter/sort/paginate
LLM interface (#9)       ──► streaming shipped — claimable now
```

### Risk Note — Backend as Microservices (#11)
**Dropped** — team decision. The 17pt total still sits 3pts above the 14pt minimum, providing sufficient buffer.

## Coverage Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Already implemented — can claim now |
| ⚠️ | Partially implemented — needs specific work to claim |
| ❌ | Not started |
| 🚫 | Dropped or cannot claim |

---

## IV.1 Web

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Use a framework for **both** frontend and backend | Major | 2 | ✅ | React 19 (frontend) + FastAPI (backend) | Nothing — fully claimable |
| Use a frontend framework only | Minor | 1 | — | — | Cannot claim alongside the Major above |
| Use a backend framework only | Minor | 1 | — | — | Cannot claim alongside the Major above |
| Real-time features (WebSockets) | Major | 2 | ❌ | Nothing | WebSocket endpoint in FastAPI; client-side connection; real-time generation progress broadcast |
| User interaction (chat + profile + friends) | Major | 2 | ⚠️ | Profile pages, friends, and online status exist | Basic chat system is still missing, so this Web major is not claimable yet |
| Public API (API key, rate limiting, docs, 5 endpoints) | Major | 2 | ⚠️ | FastAPI auto-docs at `/docs`; many authenticated API endpoints with GET + POST + PATCH + DELETE; per-user fixed-window rate limiter (`services/rate_limit.py`) protecting generation endpoints, configurable via `GENERATION_RATE_LIMIT_REQUESTS`/`_WINDOW_SECONDS` | Secured API key header; broaden rate limiting beyond generation; subject requires `PUT` but only `PATCH` exists; add `PUT` to CORS `allow_methods` (currently `GET, POST, PATCH, DELETE, OPTIONS`) |
| ORM for the database | Minor | 1 | ❌ | Raw SQL via aiosqlite | SQLAlchemy or Tortoise ORM replacing raw queries |
| Notification system | Minor | 1 | ⚠️ | `sonner` toast library installed, global `Toaster` mounted; story, gallery, profile, and friends flows all use toasts | Wire success/failure toasts to remaining flows: auth (login/signup), OAuth callback, and admin backup trigger |
| Real-time collaborative features | Minor | 1 | ❌ | Nothing | Shared workspaces, live editing, or collaborative drawing |
| Server-Side Rendering (SSR) | Minor | 1 | ❌ | Vite SPA (client-side only) | Would require migrating to Next.js or similar |
| Progressive Web App (PWA) | Minor | 1 | ⚠️ | `frontend/metadata.json` exists (app manifest) | Link manifest in `index.html` (`<link rel="manifest">`); add service worker; add offline fallback page |
| Custom design system (10+ reusable components) | Minor | 1 | ✅ | **10+ components/utilities**: `SketchyButton`, `SketchyCard`, `SketchyInput`, `SketchyTextarea`, `Typography`, `Heading`, `Text`, `Label`, `MagicLoader`, `StorageImage`, `LanguageSwitcher`, friend rows, custom icons, brand color tokens, and typography scale | Document the component inventory in README/evaluation notes |
| Advanced search (filters, sorting, pagination) | Minor | 1 | ❌ **Proposed (#5)** | Nothing | Gallery/library search UI: text query, filter by art style/language/kid profile, sort by created date, paginated backend endpoint |
| File upload and management system | Minor | 1 | ⚠️ | Avatar upload uses multipart with server-side type/size/signature validation and replacement; `KidWizard.tsx` also accepts a photo converted to base64 | To claim as a full file management module: add broader file management UI, progress indicator, deletion controls, and secure access rules for all uploaded files |

---

## IV.2 Accessibility and Internationalization

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Complete accessibility (WCAG 2.1 AA) | Major | 2 | ❌ | Nothing audited | Screen reader support, keyboard navigation, ARIA labels, contrast ratios |
| Multiple languages (i18n, 3 languages) | Minor | 1 | ⚠️ | `i18next`, browser language detection, 6 translation files (`en`, `fr`, `es`, `zh`, `ja`, `ar`), language switcher, and translated major flows | All user-facing text must be translatable; hardcoded strings remain in Status, Friends, OAuth callback, auth buttons, and some read-only labels |
| RTL language support | Minor | 1 | ✅ | Arabic locale, `document.dir` synced through `i18n.dir()`, full layout mirroring via CSS logical properties, RTL-specific UI adjustments, and seamless LTR↔RTL switching from the language switcher | Nothing — fully claimable |
| Additional browser support (2+ browsers) | Minor | 1 | ❌ | Nothing tested | Test + fix in Firefox, Safari, or Edge |

---

## IV.3 User Management

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Standard user management and authentication | Major | 2 | ✅ | Email/password signup/login/logout, bcrypt hashing, JWT auth, protected routes, profile update, avatar upload with validation/default avatar, friends, online status, and profile page | Nothing major; optional hardening: online presence currently changes on login/logout, not heartbeat/disconnect |
| Game statistics and match history | Minor | 1 | 🚫 | — | Requires a game module |
| OAuth 2.0 (Google, GitHub, 42, etc.) | Minor | 1 | ✅ | Google OAuth authorization-code flow, session middleware, OAuth account/result tables, frontend callback route, and JWT exchange exist | Demo requires real Google OAuth credentials in `.env`; add GitHub/42 only if evaluators insist on a 42-specific provider |
| Advanced permissions system (roles, CRUD) | Major | 2 | ❌ | Nothing | Admin/user/guest roles, role-based views |
| Organization system | Major | 2 | ❌ | Nothing | Create/manage organizations, add/remove users |
| 2FA | Minor | 1 | ❌ | Nothing | TOTP or SMS 2FA |
| User activity analytics dashboard | Minor | 1 | ❌ Not proposed | Nothing user-facing yet; Prometheus app metrics are operational but not per-user insights | Replaced in proposed list by Advanced search (#5); could be revived as a fallback if another module is rejected |

---

## IV.4 Artificial Intelligence

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| AI Opponent for games | Major | 2 | 🚫 | — | Requires a game module |
| RAG system | Major | 2 | ❌ | Nothing | Vector store, retrieval pipeline, LLM response generation |
| **LLM system interface** | Major | 2 | ✅ | `gemini_service.py`: text generation (story scripts) + image generation (panels); exponential backoff on 429; error handling. Streaming path `generate_story_script_stream` + `POST /api/generate/story-script/stream` emits NDJSON `intro_delta`/`script`/`error` events so the frontend can render the title and foreword character-by-character. | — |
| Recommendation system (ML) | Major | 2 | ❌ | Nothing | Collaborative/content-based filtering model |
| Content moderation AI | Minor | 1 | ❌ | Nothing | Auto-moderation on user content |
| Voice/speech integration | Minor | 1 | ✅ | Web Speech API hooks (`components/speech/useSpeechSynthesis.ts`, `useSpeechRecognition.ts`); read-aloud control on Storyboard and Preview views; voice input wired into KidWizard | Verify cross-browser support during demo (Chrome/Edge fully supported; Firefox partial) |
| Sentiment analysis | Minor | 1 | ❌ | Nothing | Sentiment scoring on user content |
| Image recognition and tagging | Minor | 1 | ❌ | Nothing | ML model for image classification |

---

## IV.5 Cybersecurity

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| WAF/ModSecurity + HashiCorp Vault | Major | 2 | ❌ | Nothing | ModSecurity WAF config + Vault for secrets management |

---

## IV.6 Gaming and User Experience

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Web-based game | Major | 2 | 🚫 | — | N/A — this project is a comic generator |
| Remote players | Major | 2 | 🚫 | — | Requires a game |
| Multiplayer (3+ players) | Major | 2 | 🚫 | — | Requires a game |
| Add another game | Major | 2 | 🚫 | — | Requires a first game |
| Advanced 3D graphics | Major | 2 | 🚫 | — | Requires a game |
| Advanced chat features | Minor | 1 | 🚫 | — | Requires "User interaction" Major first |
| Tournament system | Minor | 1 | 🚫 | — | Requires a game |
| Game customization | Minor | 1 | 🚫 | — | Requires a game |
| Gamification system | Minor | 1 | ❌ | Nothing | Achievements, badges, XP — could work for comic generation (e.g. "Generated 10 comics") |
| Spectator mode | Minor | 1 | 🚫 | — | Requires a game |

---

## IV.7 DevOps

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| ELK stack (Elasticsearch + Logstash + Kibana) | Major | 2 | ❌ | Nothing | Full ELK Docker Compose setup |
| Prometheus + Grafana monitoring | Major | 2 | ✅ | Backend exposes `/metrics`; Docker Compose includes Prometheus, Grafana, Alertmanager, node exporter; custom Gemini/story metrics, dashboards, alert rules, and alert webhook exist | Demo Grafana behind nginx and document credentials/env (`GRAFANA_ADMIN_PASSWORD`) |
| Backend as microservices | Major | 2 | 🚫 Dropped | — | Team decision — dropped |
| Health check + status page + automated backups | Minor | 1 | ✅ | `GET /health`, visible `/status` UI, backup inventory, admin manual backup trigger, startup + 24h scheduled SQLite backups, rotation, and disaster recovery docs | Nothing major; verify demo flow with Docker volumes |

---

## IV.8 Data and Analytics

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Advanced analytics dashboard | Major | 2 | ❌ | Nothing | Interactive charts, real-time data, export (PDF/CSV) |
| Data export and import | Minor | 1 | ❌ | Nothing | JSON/CSV export + validated import |
| GDPR compliance features | Minor | 1 | ❌ | Nothing | User data export, deletion with confirmation, confirmation emails |

---

## IV.9 Blockchain

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Store tournament scores on blockchain | Major | 2 | 🚫 | — | Requires a tournament (requires a game) |
| ICP backend | Minor | 1 | ❌ | Nothing | Full backend rewrite on Internet Computer Protocol |

---

## IV.10 Modules of Choice

| Module | Type | Pts | Status | Notes |
|--------|------|-----|--------|-------|
| Custom major module | Major | 2 | ❌ | Must justify in README why it's Major complexity |
| Custom minor module | Minor | 1 | ❌ | Must justify in README |

---

## Summary

| Status | Proposed modules | Pts |
|--------|-----------------|-----|
| ✅ Done | Frameworks, Design system, Standard user management, OAuth, LLM interface, Voice/speech, Prometheus + Grafana, Health/status/backups, RTL | 13 |
| ⚠️ Partial — low effort to complete | Public API, Notification system, Multi-language | 4 |
| ❌ Not started — low/medium effort | Advanced search | 1 |
| 🚫 Dropped | Backend as microservices, User activity analytics | — |
| **Total proposed** | | **18** |

| Symbol | Meaning |
|--------|---------|
| ✅ | Already implemented — claimable now |
| ⚠️ | Partially implemented — needs specific work to claim |
| ❌ | Not started |
| 🚫 | Dropped or blocked by an incompatible/missing prerequisite |
