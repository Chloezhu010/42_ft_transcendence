# Architecture

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend framework | React 19 + Vite 6 + TypeScript 5.8 | Fast HMR, component ecosystem, strong typing |
| Routing | React Router v7 | SPA client-side routing |
| Styling | Tailwind CSS | Utility-first, rapid iteration, CDN for dev |
| Animation | Framer Motion | Page transitions, loading states |
| Backend framework | FastAPI (Python 3.13+) | Async-native, Pydantic validation, auto OpenAPI docs |
| Database | SQLite via aiosqlite | Zero-setup, WAL mode for concurrent reads |
| Auth | JWT (PyJWT) + bcrypt (passlib) | Stateless tokens, industry-standard password hashing |
| AI | Google Gemini API | Story scripts + panel image generation |
| HTTPS | nginx (reverse proxy + TLS) | Mandatory per subject; terminates TLS in front of both services |
| Containerization | Docker Compose | Single-command startup as required by subject |

### Justifications

- **FastAPI over Django/Flask:** Native async, Pydantic v2 built-in for request validation, automatic OpenAPI docs, Python 3.13 compatible.
- **SQLite:** Zero setup overhead; WAL mode enables concurrent reads. Sufficient for the project scope — no distributed deployment needed.
- **JWT over server sessions:** Stateless, works across Docker services without shared session storage.
- **Gemini API:** Supports both text (story scripts) and image generation in a single SDK; rate limiting handled with exponential backoff.

## Database Schema

```
users
├── id            INTEGER PRIMARY KEY AUTOINCREMENT
├── email         TEXT UNIQUE NOT NULL
├── username      TEXT UNIQUE NOT NULL
├── password_hash TEXT NOT NULL          ← bcrypt via passlib
├── avatar_path   TEXT                   ← stored in backend/images/avatars/
├── is_online     BOOLEAN DEFAULT 0
├── created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
└── updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP

friendships
├── id            INTEGER PRIMARY KEY AUTOINCREMENT
├── requester_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── addressee_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── status        TEXT CHECK(status IN ('pending','accepted', 'rejected', 'blocked'))
└── created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP

kid_profiles
├── id            INTEGER PRIMARY KEY AUTOINCREMENT
├── user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── name          TEXT NOT NULL
├── gender        TEXT NOT NULL CHECK(gender IN ('boy','girl','neutral'))
├── skin_tone     TEXT NOT NULL
├── hair_color    TEXT NOT NULL
├── eye_color     TEXT NOT NULL
├── favorite_color TEXT NOT NULL
├── dream         TEXT
├── archetype     TEXT
├── art_style     TEXT
└── created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP

stories
├── id                   INTEGER PRIMARY KEY AUTOINCREMENT
├── user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
├── kid_profile_id       INTEGER NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE
├── title                TEXT
├── foreword             TEXT
├── character_description TEXT
├── cover_image_prompt   TEXT
├── cover_image_path     TEXT
├── created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
└── updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP

panels
├── id           INTEGER PRIMARY KEY AUTOINCREMENT
├── story_id     INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE
├── panel_order  INTEGER NOT NULL
├── text         TEXT NOT NULL
├── image_prompt TEXT
├── image_path   TEXT
└── created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       UNIQUE(story_id, panel_order)
```

**Key changes from scaffold:** `user_id` in `kid_profiles` and `stories` changed from `TEXT DEFAULT 'local-user'` to `INTEGER NOT NULL REFERENCES users(id)`. All story/profile data is now user-scoped.
