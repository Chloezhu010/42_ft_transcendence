# ft_transcendence — Module Checklist

> Source: `docs/subject.md` Chapter IV
> Target: **14 points** (Major = 2 pts, Minor = 1 pt)
> Bonus: up to 5 extra points for modules beyond 14

---

## Proposed Modules to Implement

> **Total proposed: 19 pts** (14 required + 5 buffer — buffer protects against a module being rejected at evaluation)

| # | Category | Module | Type | Pts | Status | Risk | Notes |
|---|----------|--------|------|-----|--------|------|-------|
| 1 | Web | Use a framework for both frontend and backend | Major | 2 | ✅ Done | Low | React 19 + FastAPI — claimable immediately |
| 2 | Web | Public API (secured API key, rate limiting, docs, 5 endpoints) | Major | 2 | ⚠️ Partial | Low | FastAPI auto-docs + 7 endpoints exist; add API key header + rate limiter |
| 3 | Web | Complete notification system | Minor | 1 | ⚠️ Partial | Low | `sonner` already installed; wire to all create/update/delete actions |
| 4 | Web | Custom design system (10+ reusable components) | Minor | 1 | ⚠️ Partial | Low | 9/10 components exist; add 1 more (e.g. `Card` or `Badge`) |
| 5 | Accessibility | Multiple languages — i18n (3 languages) | Minor | 1 | ❌ Not started | Low | `i18next` + language switcher + 3 full translations |
| 6 | User Management | Standard user management and authentication | Major | 2 | ❌ Not started | Medium | Profile update, avatar upload, friends + online status — **requires mandatory auth blocker to be resolved first** |
| 7 | User Management | OAuth 2.0 (42 School / GitHub / Google) | Minor | 1 | ❌ Not started | Low | **Depends on #6** — OAuth extends the auth system; 42 OAuth fits naturally for a 42 project |
| 7b | User Management | User activity analytics and insights dashboard | Minor | 1 | ❌ Not started | Low | **Depends on #6** — per-user stats: stories generated, panels created, favourite art styles, generation history; simple charts on profile page |
| 8 | AI | LLM system interface (Gemini story + image generation) | Major | 2 | ⚠️ Partial | Low | Core generation works; **add streaming responses** — subject explicitly requires it |
| 9 | AI | Voice / speech integration | Minor | 1 | ❌ Not started | Low | TTS reading comic panels aloud fits naturally for a children's app; Web Speech API is built into Chrome (no extra library) |
| 10 | DevOps | Prometheus + Grafana monitoring | Major | 2 | ❌ Not started | Medium | `prometheus-fastapi-instrumentator` gives FastAPI metrics in ~5 lines; add Prometheus + Grafana to Docker Compose |
| 11 | DevOps | Backend as microservices | Major | 2 | ❌ Not started | ⚠️ High | Full architectural rewrite — split monolith into auth-service / story-service / ai-service; significant inter-service communication work |
| 12 | DevOps | Health check + status page + automated backups | Minor | 1 | ⚠️ Partial | Low | `GET /health` exists; add status UI page + SQLite backup cron + recovery docs |

### Point Breakdown

| Category | Modules | Pts |
|----------|---------|-----|
| Web | Frameworks + Public API + Notification + Design system | 6 |
| Accessibility | Multi-language | 1 |
| User Management | Standard auth + OAuth + User activity analytics | 4 |
| AI | LLM interface + Voice/speech | 3 |
| DevOps | Prometheus/Grafana + Microservices + Health check | 5 |
| **Total proposed** | | **19** |

| **Minimum required** | | **14** |
| **Buffer** | Protects against 1 Major + 1 Minor, or 5 Minors being rejected | **+5** |

### Dependencies & Implementation Order

```
Mandatory auth (blocker) ──► Standard user management (#6) ──► OAuth 2.0 (#7)
                         ──► Public API (#2)  ← benefits from user-scoped API keys
LLM interface (#8)       ──► add streaming before claiming
Microservices (#11)      ──► do last — highest risk, can drop if time is short
```

### Risk Note — Backend as Microservices (#11)
This is the only high-risk module in the list. It requires splitting the entire FastAPI backend into separate services (auth, story/panel, AI/Gemini), each with its own Docker container and inter-service HTTP communication. If the team runs short on time, **drop this module** — the 4pt buffer means you still reach 16pts without it, comfortably above the 14pt minimum.

## Coverage Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Already implemented — can claim now |
| ⚠️ | Partially implemented — needs specific work to claim |
| ❌ | Not started |
| 🚫 | Cannot claim (requires a game module, which we don't have) |

---

## IV.1 Web

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Use a framework for **both** frontend and backend | Major | 2 | ✅ | React 19 (frontend) + FastAPI (backend) | Nothing — fully claimable |
| Use a frontend framework only | Minor | 1 | — | — | Cannot claim alongside the Major above |
| Use a backend framework only | Minor | 1 | — | — | Cannot claim alongside the Major above |
| Real-time features (WebSockets) | Major | 2 | ❌ | Nothing | WebSocket endpoint in FastAPI; client-side connection; real-time generation progress broadcast |
| User interaction (chat + profile + friends) | Major | 2 | ❌ | Nothing | Chat system, profile pages, friends + online status (also required for Standard User Mgmt module) |
| Public API (API key, rate limiting, docs, 5 endpoints) | Major | 2 | ⚠️ | FastAPI auto-docs at `/docs`; GET + POST + PATCH + DELETE endpoints exist (7 total) | Secured API key header; rate limiting middleware; subject requires `PUT` but only `PATCH` exists |
| ORM for the database | Minor | 1 | ❌ | Raw SQL via aiosqlite | SQLAlchemy or Tortoise ORM replacing raw queries |
| Notification system | Minor | 1 | ⚠️ | `sonner` toast library already installed | Wire toasts to all create/update/delete actions; currently only used ad-hoc |
| Real-time collaborative features | Minor | 1 | ❌ | Nothing | Shared workspaces, live editing, or collaborative drawing |
| Server-Side Rendering (SSR) | Minor | 1 | ❌ | Vite SPA (client-side only) | Would require migrating to Next.js or similar |
| Progressive Web App (PWA) | Minor | 1 | ⚠️ | `frontend/metadata.json` exists (app manifest) | Link manifest in `index.html` (`<link rel="manifest">`); add service worker; add offline fallback page |
| Custom design system (10+ reusable components) | Minor | 1 | ⚠️ | **9 components**: `SketchyButton`, `SketchyInput`, `SketchyTextarea`, `Typography`, `Heading`, `Text`, `Label`, `MagicLoader`, `StorageImage` + 12 custom SVG icons + 7 brand color tokens + full typography scale | Add **1 more component** (e.g. `Card`, `Badge`, `Avatar`) to reach the 10-component minimum |
| Advanced search (filters, sorting, pagination) | Minor | 1 | ❌ | Nothing | Search UI + backend query filtering |
| File upload and management system | Minor | 1 | ⚠️ | `KidWizard.tsx` accepts a photo converted to base64 | Client-side type/size/format validation; server-side validation; progress indicator; ability to delete files; proper multipart upload (not base64) |

---

## IV.2 Accessibility and Internationalization

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Complete accessibility (WCAG 2.1 AA) | Major | 2 | ❌ | Nothing audited | Screen reader support, keyboard navigation, ARIA labels, contrast ratios |
| Multiple languages (i18n, 3 languages) | Minor | 1 | ❌ | Nothing | i18n library (e.g. `i18next`), 3 full translations, language switcher |
| RTL language support | Minor | 1 | ❌ | Nothing | RTL layout mirroring, at least 1 RTL language |
| Additional browser support (2+ browsers) | Minor | 1 | ❌ | Nothing tested | Test + fix in Firefox, Safari, or Edge |

---

## IV.3 User Management

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| Standard user management and authentication | Major | 2 | ❌ | No auth at all — `user_id = 'local-user'` hardcoded | Profile update, avatar upload, friends + online status, profile page — **requires auth (blocker #13) to be done first** |
| Game statistics and match history | Minor | 1 | 🚫 | — | Requires a game module |
| OAuth 2.0 (Google, GitHub, 42, etc.) | Minor | 1 | ❌ | Nothing | OAuth provider integration |
| Advanced permissions system (roles, CRUD) | Major | 2 | ❌ | Nothing | Admin/user/guest roles, role-based views |
| Organization system | Major | 2 | ❌ | Nothing | Create/manage organizations, add/remove users |
| 2FA | Minor | 1 | ❌ | Nothing | TOTP or SMS 2FA |
| User activity analytics dashboard | Minor | 1 | ❌ | Nothing | Per-user activity tracking dashboard |

---

## IV.4 Artificial Intelligence

| Module | Type | Pts | Status | What exists | What's missing to claim |
|--------|------|-----|--------|-------------|------------------------|
| AI Opponent for games | Major | 2 | 🚫 | — | Requires a game module |
| RAG system | Major | 2 | ❌ | Nothing | Vector store, retrieval pipeline, LLM response generation |
| **LLM system interface** | Major | 2 | ⚠️ | `gemini_service.py`: text generation (story scripts) + image generation (panels); exponential backoff on 429; error handling | **Add streaming responses** — currently all Gemini calls are blocking; subject explicitly requires "handle streaming responses properly" |
| Recommendation system (ML) | Major | 2 | ❌ | Nothing | Collaborative/content-based filtering model |
| Content moderation AI | Minor | 1 | ❌ | Nothing | Auto-moderation on user content |
| Voice/speech integration | Minor | 1 | ❌ | Nothing | Speech-to-text or TTS |
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
| Prometheus + Grafana monitoring | Major | 2 | ❌ | Nothing | Prometheus exporters + Grafana dashboards |
| Backend as microservices | Major | 2 | ❌ | Single FastAPI monolith | Split into separate services with API/queue communication |
| Health check + status page + automated backups | Minor | 1 | ⚠️ | `GET /health` endpoint in `main.py` (checks DB) | Add a visible status page in the UI; add automated backup script; add disaster recovery docs |

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
| ✅ Done | Frameworks (Web) | 2 |
| ⚠️ Partial — low effort to complete | Public API, Notification system, Design system, LLM interface, Health check | 7 |
| ❌ Not started — medium effort | Standard user management, OAuth, User activity analytics, Multi-language, Prometheus + Grafana | 7 |
| ❌ Not started — high effort | Backend as microservices | 2 |
| ❌ Not started — low effort | Voice/speech | 1 |
| **Total proposed** | | **18** |

| Symbol | Meaning |
|--------|---------|
| ✅ | Already implemented — claimable now |
| ⚠️ | Partially implemented — needs specific work to claim |
| ❌ | Not started |
| 🚫 | Blocked — requires a game module (we have none) |

