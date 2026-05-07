# ft_transcendence — Module Checklist

> Source: `docs/subject.md`
> Target: **14 points** (Major = 2 pts, Minor = 1 pt)
> Bonus: up to 5 extra points for modules beyond 14

---

## Proposed Modules to Implement

> **Total proposed: 17 pts** (14 required + 3 buffer — buffer protects against a module being rejected at evaluation)

| # | Category | Module | Type | Pts | Status | Risk | Notes |
|---|----------|--------|------|-----|--------|------|-------|
| 1 | Web | Use a framework for both frontend and backend | Major | 2 | ✅ Done | Low | React 19 + FastAPI |
| 2 | Web | Public API (secured API key, rate limiting, docs, 5 endpoints) | Major | 2 | ✅ Done | Low | `routers/public_stories.py` (5 endpoints), `X-API-Key` header auth (`public_api_auth.py`), per-key fixed-window limiter (`services/rate_limit.py`), JWT-protected key management at `/api/api-keys`, FastAPI auto-docs at `/docs` |
| 3 | Web | Complete notification system | Minor | 1 | ✅ Done | Low | `sonner` v2 wired across auth, profile, friends, gallery, story flows (34 toast calls across 7 files) |
| 4 | Web | Custom design system (10+ reusable components) | Minor | 1 | ✅ Done | Low | 12 reusable components across `components/design-system/`: 4 typography (`Typography`, `Heading`, `Text`, `Label`), 4 form/layout primitives (`SketchyButton`, `SketchyCard`, `SketchyInput`, `SketchyTextarea`), 4 archetype icons (`Explorer`, `Inventor`, `Guardian`, `Dreamer` — all typed `({className, color}) => JSX.Element` via shared `IconProps`) |
| 5 | Accessibility | Multiple languages — i18n (3 languages) | Minor | 1 | ✅ Done | Low | 6 languages: en/fr/es/zh/ja/ar, `i18next` + `LanguageSwitcher.tsx`, full translation files in `locales/` |
| 5b | Accessibility | Right-to-left (RTL) language support | Minor | 1 | ✅ Done | Low | Arabic fully translated (859 lines); ~130 logical-property class usages (`ms-/me-/ps-/pe-/start-/end-`) across `app/`, `components/`, `pages/`; ratcheting static audit `tests/i18n/rtlAudit.test.ts` bans new physical-side classes; `getDirectionalArrow()` flips arrows; `rtl:` Tailwind variants flip gradients (e.g. `HeroSection.tsx`); `StoryboardView`/`PreviewView` use direction-aware helpers; `i18n.on('languageChanged')` → updates `<html dir>` + `<html lang>` for seamless switching |
| 6 | User Management | Standard user management and authentication | Major | 2 | ✅ Done | Low | JWT signup/login, profile edit + avatar upload (`services/avatar_upload.py`), full friend request flow (`routers/friend.py`), online status tracking (`set_online_status` in `users_crud.py`) |
| 7 | User Management | OAuth 2.0 (Google) | Minor | 1 | ✅ Done | Low | Google OAuth: `services/oauth/` (client, account_linking, result_store), `GoogleOAuthCallbackPage.tsx`, `db/crud_oauth.py`, env wired in compose |
| 8 | AI | LLM system interface (Gemini story + image generation) | Major | 2 | ✅ Done | Low | Text + image generation with retry; story-script streaming via NDJSON (`POST /api/generate/story-script/stream`) drives the live title/foreword intro |
| 9 | AI | Voice / speech integration | Minor | 1 | ✅ Done | Low | Web Speech API: `components/speech/useSpeechSynthesis.ts`, `useSpeechRecognition.ts`, `StoryReadAloudControl.tsx` (with tests) |
| 10 | DevOps | Prometheus + Grafana monitoring | Major | 2 | ✅ Done | Low | Full stack in `docker-compose.yml`: prometheus, grafana, alertmanager, node_exporter; `/metrics` via `prometheus-fastapi-instrumentator`; custom metrics in `metrics.py`; provisioned dashboard at `backend/grafana/provisioning/dashboards/wondercomic.json`; alert rules + webhook receiver at `routers/monitoring.py` |
| 11 | DevOps | Health check + status page + automated backups | Minor | 1 | ✅ Done | Low | `GET /health` (`routers/health.py`), `StatusPage.tsx` UI shows health + backups + manual trigger, `db/backup.py` uses SQLite online-backup API with 7-day rotation, scheduled 24h task in `main.py` |

### Point Breakdown

| Category | Modules | Pts |
|----------|---------|-----|
| Web | Frameworks + Public API + Notification + Design system | 6 |
| Accessibility | Multi-language + RTL support | 2 |
| User Management | Standard auth + OAuth | 3 |
| AI | LLM interface + Voice/speech | 3 |
| DevOps | Prometheus/Grafana + Health check | 3 |
| **Total proposed** | | **17** |

| **Minimum required** | | **14** |
| **Buffer** | Protects against 1 Major + 1 Minor being rejected | **+3** |


---

## Summary

| Status | Proposed modules | Pts |
|--------|-----------------|-----|
| ✅ Done | Frameworks, Public API, Notifications, Design system, i18n, RTL support, Standard user mgmt, OAuth, LLM interface, Voice/speech, Prometheus + Grafana, Health check | 17 |
| 🚫 Dropped | Backend as microservices | — |
| **Total proposed** | | **17** |

| Symbol | Meaning |
|--------|---------|
| ✅ | Already implemented — claimable now |
| ⚠️ | Partially implemented — needs specific work to claim |
| ❌ | Not started |
| 🚫 | Blocked |
