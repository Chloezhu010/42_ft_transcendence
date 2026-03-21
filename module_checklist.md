# ft_transcendence — Module Checklist

> Source: `docs/subject.md` Chapter IV
> Target: **14 points** (Major = 2 pts, Minor = 1 pt)
> Bonus: up to 5 extra points for modules beyond 14

---
## Proposed modules to implement
- web: 6
    - frontend + backend frametwork: 2
    - Public API (API key, rate limiting, docs, 5 endpoints): 2
    - complete notification: 1
    - Custom-made design system with reusable components, including a proper color palette, typography, and icons (minimum: 10 reusable components): 1
- accessiblity: 1
    - multi-language: 1
- user management: 3
    - Standard user management and authentication: 2
    - Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.): 1
- AI: 3
    - Implement a complete LLM system interface: 2
    - voice/ speech interaction: 1
- DevOps: 5
    - Prometheus + Grafana monitoring： 2
    - backend as microservices: 2
    - Health check and status page system with automated backups and disaster recovery procedures: 1

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

| Status | Modules | Max pts available |
|--------|---------|------------------|
| ✅ Fully covered | Use frameworks (Major) | **2 pts** |
| ⚠️ Partially covered | LLM interface (Major), Public API (Major), Custom design system (Minor), PWA (Minor), File upload (Minor), Notification system (Minor), Health check (Minor) | up to **9 pts** |
| ❌ Not started | Everything else | — |
| 🚫 Blocked (need a game) | 10 modules across Gaming, Game stats, AI Opponent, Blockchain tournament | 0 pts available |

**Confirmed points: 2 / 14**
**Maximum reachable with partial work only: 11 / 14** ← still 3 pts short

---

## Recommended Path to 14 Points

Based on what already exists in the codebase, this combination reaches exactly 14 with the least new work:

| # | Module | Type | Pts | Effort | Notes |
|---|--------|------|-----|--------|-------|
| 1 | Use frameworks (frontend + backend) | Major | 2 | ✅ done | React + FastAPI |
| 2 | LLM system interface | Major | 2 | Low | Add streaming to Gemini calls |
| 3 | Standard user management | Major | 2 | Medium | Needs auth first (mandatory anyway) |
| 4 | Public API | Major | 2 | Low | Add API key header + rate limiting middleware |
| 5 | Custom design system | Minor | 1 | Minimal | Add 1 more component (currently 9/10) |
| 6 | PWA | Minor | 1 | Low | Link manifest + add service worker |
| 7 | File upload | Minor | 1 | Medium | Upgrade base64 → proper multipart upload with validation |
| 8 | Notification system | Minor | 1 | Low | `sonner` already installed — wire to all CRUD actions |
| **Total** | | | **14** | | |

> **Note:** Modules 3 and 4 (Standard user management, Public API) require the mandatory auth system (blocker #13 in `checklist.md`) to be completed first. Do mandatory blockers before module work.

