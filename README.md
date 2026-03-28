*This project has been created as part of the 42 curriculum by \<login1>, \<login2>, \<login3>, \<login4>.*

---

# ft_transcendence — AI Comic Book Generator

A multi-user web application where users create personalized AI-powered comic book stories for children using Google's Gemini API. Users sign up, build character profiles, and receive a fully illustrated comic book — complete with cover art, narrative panels, and a gallery to revisit past stories.

## Team

| Login | Role(s) | Responsibilities |
|-------|---------|-----------------|
| \<login1> | Product Owner + Developer | Product backlog, feature prioritization |
| \<login2> | Project Manager + Developer | Sprint planning, blocker removal |
| \<login3> | Tech Lead + Developer | Architecture, code reviews, auth, HTTPS |
| \<login4> | Developer | _[TBD]_ |

## Project Management

- **Task tracking:** _[GitHub Issues / Trello — TBD]_
- **Communication:** _[Discord / Slack — TBD]_

## Quick Start

```bash
cp .env.example .env    # fill in GEMINI_API_KEY
docker compose up --build
```

Open **https://localhost** in Google Chrome.

## Environment Variables

Copy `.env.example` to `.env` and fill in required values:

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | **Yes** |
| `VITE_API_BASE_URL` | Backend URL seen by browser (default: `http://localhost:8000`) | No |
| `FRONTEND_URL` | CORS allowed origin (default: `http://localhost:3000`) | No |
| `DB_PATH` | SQLite database file path (default: `wondercomic.db`) | No |

> Never commit `.env` — it is git-ignored. Only `.env.example` is tracked.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript, Tailwind CSS, Framer Motion |
| Backend | FastAPI (Python 3.13+), SQLite via aiosqlite |
| Auth | JWT (PyJWT) + bcrypt |
| AI | Google Gemini API |
| Infra | Docker Compose, nginx (HTTPS) |

## Docs

- [Development Guide](documentation/development.md) — local dev, docker commands, pre-push checks
- [Architecture](documentation/architecture.md) — tech stack details, database schema
- [Roadmap](documentation/roadmap.md) — features, modules, implementation phases, contributions
- [Resources](documentation/resources.md) — documentation links, AI usage
