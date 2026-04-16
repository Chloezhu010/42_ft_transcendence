# Engineering Rules — Best Practices

This repo uses **React + Vite + TypeScript** on the frontend and **FastAPI + Pydantic** on the backend. These rules are for AI coding agents.

## 1) General

- Keep changes small, reviewable, and reversible.
- Prefer simple, explicit code over clever abstractions.
- Ship a stable, demoable vertical slice before expanding scope.
- Do not introduce new dependencies unless they unlock a clear capability.
- Do not propose or start a framework migration unless the user explicitly asks for it.

## 2) Separation of Concerns

- Keep UI, client orchestration, API calls, and backend side effects clearly separated.
- Frontend view components should not contain raw fetch logic or backend-specific wiring.
- Frontend must never import backend code.
- FastAPI routers should stay thin: validate input, call lower layers, return typed responses.
- Put reusable business logic in plain functions, not inside route handlers or large components.

## 3) Frontend Best Practices

- Prefer focused components. If a component grows because of async flow or state orchestration, extract that logic.
- Keep route structure explicit and easy to follow.
- Start independent async work early and await late. Use `Promise.all()` when work is independent.
- Avoid heavy work in render paths; shape data before setting state when practical.
- Use code splitting only for genuinely heavy or non-critical UI.
- Do not add global state libraries unless props, local state, and hooks are clearly insufficient.
- Preserve existing UX quality: loading, success, and failure states must be visible.

### Frontend Readability Standard

- Optimize for fast understanding. A new reader should quickly answer what this file owns, where data comes from, and where to change behavior.
- Prefer explicit, slightly verbose code over dense or clever code when readability is in tension.
- Keep page/container files responsible for orchestration. Keep UI components responsible for rendering and local visual interaction only.
- If a file needs a header comment, use it to explain responsibility or boundary. Only describe `flow` when the file truly coordinates a multi-step process.

### TypeScript Style

- Prefer explicit interfaces, named types, and straightforward functions over heavy generic abstractions.
- Avoid advanced type gymnastics unless they remove real duplication without hurting comprehension.
- Prefer explicit return types on exported functions, page hooks, and boundary functions.
- Prefer named intermediate variables and early returns over long chains or packed expressions.
- Use TypeScript to prevent boundary mistakes, not to compress code into the fewest lines possible.

### TSX / JSX Style

- JSX should mainly describe structure, not perform reasoning.
- Move non-trivial decisions out of JSX and into clearly named variables or helper functions before `return`.
- Keep business logic, data shaping, and backend-specific decisions out of JSX.
- Avoid nested ternaries and repeated deep property access inside JSX. Compute values once and give them names.
- Keep inline event handlers simple. If a handler does more than directly forward an event or toggle local UI state, extract a named function.
- Split large components by visual block when one component starts rendering multiple distinct regions, pages, or states.
- Prefer JSX that reads like composition of named sections rather than a large tree with many embedded conditions.

## 4) Backend and API Best Practices

- Keep API contracts stable unless the task explicitly requires a change.
- Validate request and response shapes with Pydantic.
- Return safe error messages. Do not expose stack traces, secrets, or provider internals.
- Keep blocking or side-effect-heavy logic out of routers once it becomes non-trivial.
- Handle long-running AI and I/O flows explicitly, including timeout or failure paths where practical.

## 5) Type Safety and Code Hygiene

- TypeScript only on the frontend. Avoid `any` unless there is no reasonable alternative.
- Keep Python type hints on public functions and response-shaping code where practical.
- Prefer explicit mapping at boundaries, especially between frontend camelCase and backend snake_case.
- Keep files focused. Split by responsibility when a file becomes hard to reason about.
- Follow idiomatic naming: `PascalCase` for components and types, `camelCase` in TypeScript, `snake_case` in Python.

## 6) Testing and Verification

- Verify both a happy path and a basic failure path for each meaningful change.
- Keep frontend changes compatible with `vitest`.
- Keep backend changes compatible with `pytest` when tests exist or are added.
- Prefer targeted tests for new behavior over broad, low-signal tests.
- Before pushing, run the relevant checks for the code you changed.
- Backend changes should pass `ruff format --check .`, `ruff check .` and `uv run pytest` from `backend/`.
- Frontend changes should pass `npm test` and `npm run build` from `frontend/`.
- If a change spans frontend and backend, run both sides before pushing.

## 7) Git and Delivery

- Make atomic commits: one logical change per commit.
- Use conventional prefixes such as `feat:`, `fix:`, `chore:`, `docs:`.
- Do not mix refactors, framework changes, and feature work in one patch unless unavoidable.

## 8) Secrets and Logging

- Never commit secrets. Document required env vars in `.env.example`.
- Do not log API keys, raw base64 payloads, or large user/generated content unless strictly necessary.
- Store only the minimum artifacts needed for the project or demo.

## 9) Definition of Done

- Works end-to-end for at least one happy path.
- Handles at least one basic error path.
- Touched code remains typed and coherent.
- Relevant pre-push checks have been run locally for the touched area.
- Relevant build/tests pass if configured.
- The result is demo-ready, not just internally correct.
