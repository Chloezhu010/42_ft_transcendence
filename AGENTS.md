# Repo Agent Instructions

This repository has separate instructions for frontend and backend work.

- For frontend changes, read `frontend/AGENTS.md`.
- For backend changes, read `backend/AGENTS.md`.
- For cross-cutting architecture context, read `documentation/architecture.md`.

## Tooling

- Backend commands must use `uv` from `backend/`, for example `uv run pytest` and `uv run ruff check .`.
- Frontend commands must use `npm` from `frontend/`, for example `npm test` and `npm run build`.

## Global Rules

- Keep changes small, reviewable, and reversible.
- Prefer simple, explicit code over clever abstractions.
- Optimize for high readability. A new reader should quickly understand what each touched file owns, where data comes from, and where behavior should be changed.
- Keep frontend and backend boundaries separate. Frontend must not import backend code.
- Do not introduce new dependencies unless they unlock a clear capability.
- Do not start framework migrations unless explicitly requested.
- Never commit secrets or log sensitive data.
- Run the relevant checks for the area you changed before pushing.
- Use conventional commit prefixes such as `feat:`, `fix:`, `chore:`, and `docs:`.
