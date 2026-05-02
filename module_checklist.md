# ft_transcendence — Module Checklist

> Source: `docs/subject.md` Chapter IV
> Target: **14 points** (Major = 2 pts, Minor = 1 pt)
> Bonus: up to 5 extra points for modules beyond 14

---

## Proposed Modules to Implement

> **Total proposed after dropping microservices: 17 pts** (14 required + 3 buffer — buffer protects against a module being rejected at evaluation)

| # | Category | Module | Type | Pts | Status | Risk | Notes |
|---|----------|--------|------|-----|--------|------|-------|
| 1 | Web | Use a framework for both frontend and backend | Major | 2 | ✅ Done | Low | React 19 + FastAPI — claimable immediately |
| 2 | Web | Public API (secured API key, rate limiting, docs, 5 endpoints) | Major | 2 | ⚠️ Partial | Low | FastAPI auto-docs + many endpoints exist; add API key header, app rate limiter, `PUT`, and CORS support for `PUT` |
| 3 | Web | Complete notification system | Minor | 1 | ⚠️ Partial | Low | `sonner` already installed; wire to all create/update/delete actions |
| 4 | Web | Custom design system (10+ reusable components) | Minor | 1 | ✅ Done | Low | 10+ reusable components now exist: buttons, card, inputs, typography, icons, loaders, storage image, etc. |
| 5 | Accessibility | Multiple languages — i18n (3 languages) | Minor | 1 | ⚠️ Partial | Low | `i18next`, 6 locales, language switcher, and document `lang`/`dir` exist; finish remaining hardcoded UI text before claiming |
| 6 | User Management | Standard user management and authentication | Major | 2 | ✅ Done | Low | Signup/login/logout, hashed passwords, JWT sessions, profile update, avatar upload, friends, online status, and profile page exist |
| 7 | User Management | OAuth 2.0 (42 School / GitHub / Google) | Minor | 1 | ✅ Done | Low | Google OAuth flow exists; demo requires valid Google OAuth environment variables |
| 7b | User Management | User activity analytics and insights dashboard | Minor | 1 | ❌ Not started | Low | **Depends on #6** — per-user stats: stories generated, panels created, favourite art styles, generation history; simple charts on profile page |
| 8 | AI | LLM system interface (Gemini story + image generation) | Major | 2 | ✅ Done | Low | Text + image generation with retry; story-script streaming via NDJSON (`POST /api/generate/story-script/stream`) drives the live title/foreword intro |
| 9 | AI | Voice / speech integration | Minor | 1 | ❌ Not started | Low | TTS reading comic panels aloud fits naturally for a children's app; Web Speech API is built into Chrome (no extra library) |
| 10 | DevOps | Prometheus + Grafana monitoring | Major | 2 | ✅ Done | Low | `/metrics`, Prometheus, Grafana, Alertmanager, node exporter, custom Gemini/story metrics, dashboards, and alert rules exist |
| 11 | DevOps | Backend as microservices | Major | 2 | 🚫 Dropped | ⚠️ High | Full architectural rewrite — split monolith into auth-service / story-service / ai-service; significant inter-service communication work |
| 12 | DevOps | Health check + status page + automated backups | Minor | 1 | ✅ Done | Low | `GET /health`, `/status` UI, startup + 24h backups, manual backup trigger, rotation, and recovery docs exist |

### Point Breakdown

| Category | Modules | Pts |
|----------|---------|-----|
| Web | Frameworks + Public API + Notification + Design system | 6 |
| Accessibility | Multi-language | 1 |
| User Management | Standard auth + OAuth + User activity analytics | 4 |
| AI | LLM interface + Voice/speech | 3 |
| DevOps | Prometheus/Grafana + Health check | 3 |
| **Total proposed** | | **17** |

| **Minimum required** | | **14** |
| **Buffer** | Protects against 1 Major + 2 Minors being rejected | **+3** |

### Dependencies & Implementation Order

```
Mandatory auth            ──► Standard user management (#6) ──► OAuth 2.0 (#7)
                         ──► User activity analytics (#7b)
                         ──► Public API (#2)  ← benefits from user-scoped API keys
LLM interface (#8)       ──► streaming shipped — claimable now
Microservices (#11)      ──► do last — highest risk, can drop if time is short
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
| Public API (API key, rate limiting, docs, 5 endpoints) | Major | 2 | ⚠️ | FastAPI auto-docs at `/docs`; many authenticated API endpoints exist with GET + POST + PATCH + DELETE | Secured API key header; app-level rate limiting middleware; subject requires `PUT` but only `PATCH` exists; add `PUT` to CORS allowed methods |
| ORM for the database | Minor | 1 | ❌ | Raw SQL via aiosqlite | SQLAlchemy or Tortoise ORM replacing raw queries |
| Notification system | Minor | 1 | ⚠️ | `sonner` toast library is installed, global `Toaster` is mounted, and some story/gallery/profile flows use toasts | Wire success/failure toasts to all create/update/delete actions, especially friends, auth/OAuth, backup trigger, and every story CUD flow |
| Real-time collaborative features | Minor | 1 | ❌ | Nothing | Shared workspaces, live editing, or collaborative drawing |
| Server-Side Rendering (SSR) | Minor | 1 | ❌ | Vite SPA (client-side only) | Would require migrating to Next.js or similar |
| Progressive Web App (PWA) | Minor | 1 | ⚠️ | `frontend/metadata.json` exists (app manifest) | Link manifest in `index.html` (`<link rel="manifest">`); add service worker; add offline fallback page |
| Custom design system (10+ reusable components) | Minor | 1 | ✅ | **10+ components/utilities**: `SketchyButton`, `SketchyCard`, `SketchyInput`, `SketchyTextarea`, `Typography`, `Heading`, `Text`, `Label`, `MagicLoader`, `StorageImage`, `LanguageSwitcher`, friend rows, custom icons, brand color tokens, and typography scale | Document the component inventory in README/evaluation notes |
| Advanced search (filters, sorting, pagination) | Minor | 1 | ❌ | Nothing | Search UI + backend query filtering |
| File upload and management system | Minor | 1 | ⚠️ | Avatar upload uses multipart with server-side type/size/signature validation and replacement; `KidWizard.tsx` also accepts a photo converted to base64 | To claim as a full file management module: add broader file management UI, progress indicator, deletion controls, and secure access rules for all uploaded files |

---

## IV.2 Accessibility and Internationalization

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Complete accessibility (WCAG 2.1 AA) | Major | 2 | ❌ | Nothing audited | Screen reader support, keyboard navigation, ARIA labels, contrast ratios |
| Multiple languages (i18n, 3 languages) | Minor | 1 | ⚠️ | `i18next`, browser language detection, 6 translation files (`en`, `fr`, `es`, `zh`, `ja`, `ar`), language switcher, and translated major flows | All user-facing text must be translatable; hardcoded strings remain in Status, Friends, OAuth callback, auth buttons, and some read-only labels |
| RTL language support | Minor | 1 | ⚠️ | Arabic locale exists and `document.dir` is synced through i18n | Complete layout mirroring and RTL-specific UI checks/fixes are still needed before claiming |
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
| User activity analytics dashboard | Minor | 1 | ❌ | Nothing user-facing yet; Prometheus app metrics are operational but not per-user insights | Add profile/dashboard stats from `stories`, `panels`, and `kid_profiles`: stories generated, panels created, favorite styles/languages, sharing count, generation history |

---

## IV.4 Artificial Intelligence

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| AI Opponent for games | Major | 2 | 🚫 | — | Requires a game module |
| RAG system | Major | 2 | ❌ | Nothing | Vector store, retrieval pipeline, LLM response generation |
| **LLM system interface** | Major | 2 | ✅ | `gemini_service.py`: text generation (story scripts) + image generation (panels); exponential backoff on 429; error handling. Streaming path `generate_story_script_stream` + `POST /api/generate/story-script/stream` emits NDJSON `intro_delta`/`script`/`error` events so the frontend can render the title and foreword character-by-character. | — |
| Recommendation system (ML) | Major | 2 | ❌ | Nothing | Collaborative/content-based filtering model |
| Content moderation AI | Minor | 1 | ❌ | Nothing | Auto-moderation on user content |
| Voice/speech integration | Minor | 1 | ❌ | Nothing | Speech-to-text or TTS; easiest fit is browser TTS to read comic panels aloud |
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
| ✅ Done | Frameworks, Design system, Standard user management, OAuth, LLM interface, Prometheus + Grafana, Health/status/backups | 11 |
| ⚠️ Partial — low effort to complete | Public API, Notification system, Multi-language | 4 |
| ❌ Not started — medium effort | User activity analytics | 1 |
| 🚫 Dropped | Backend as microservices | — |
| ❌ Not started — low effort | Voice/speech | 1 |
| **Total proposed** | | **17** |

| Symbol | Meaning |
|--------|---------|
| ✅ | Already implemented — claimable now |
| ⚠️ | Partially implemented — needs specific work to claim |
| ❌ | Not started |
| 🚫 | Dropped or blocked by an incompatible/missing prerequisite |
