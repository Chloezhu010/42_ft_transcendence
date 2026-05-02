# Backend Rules

Backend code in this repo uses FastAPI, Pydantic, SQLite, and Gemini-facing service layers.

For the current system topology and API flow, see `../documentation/architecture.md`.

## Architecture

- Keep FastAPI routers thin: validate input, call lower layers, and return typed responses.
- Put reusable business logic in plain functions or services, not inside route handlers.
- Keep database access, storage access, and LLM integration behind clear backend boundaries.
- Validate request and response shapes with Pydantic.

## Boundaries

- Do not leak provider internals, stack traces, or secrets in API responses.
- Keep API contracts stable unless the task explicitly requires a change.
- Handle long-running AI and I/O flows explicitly, including failure paths where practical.
- Keep side-effect-heavy code out of routers once it becomes non-trivial.

## Python Style

- Prefer explicit, readable Python over compact or clever code.
- Keep public functions typed where practical, especially at API and response-shaping boundaries.
- Prefer small named helper functions over large route handlers.
- Keep mapping between backend snake_case and frontend-facing data explicit.

## Verification

- Run `ruff format --check .` from `backend/`
- Run `ruff check .` from `backend/`
- Run `uv run pytest` from `backend/`
