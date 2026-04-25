# Frontend Rules

Frontend code in this repo follows a strict readability-first structure.

For the current layer map and data flow, see `../documentation/architecture.md`.

## Architecture

- `app/` declares the top-level route tree and shared layout.
- `pages/` coordinate routing, page state, async flows, and user intent.
- `components/` are UI-only. They render props and emit events upward.
- `client-api/` owns browser-to-backend communication and transport details.
- `utils/` contains pure helpers and mappers.
- `types/` contains shared frontend domain types.

## Boundaries

- Do not put raw fetch logic or backend wiring inside `components/`.
- Prefer page hooks and adjacent workflow files for orchestration.
- Keep data flowing downward into UI and user intent flowing upward through callbacks.
- Keep transport concerns in `client-api/`, not in pages or components.
- Keep pure data shaping in `utils/`, not in JSX.

## Readability Standard

- Optimize for fast understanding. A new reader should quickly answer what the file owns, where data comes from, and where behavior should be changed.
- Prefer explicit, slightly verbose code over dense or clever code when readability is in tension.
- If a file needs a header comment, use it to explain responsibility or boundary. Only describe `flow` when the file truly coordinates a multi-step process.
- Split files when one file starts mixing orchestration, rendering, and boundary mapping.

## TypeScript Style

- Prefer explicit interfaces, named types, and straightforward functions over heavy generic abstractions.
- Avoid advanced type gymnastics unless they remove real duplication without hurting comprehension.
- Prefer explicit return types on exported functions, page hooks, and boundary functions.
- Prefer named intermediate variables and early returns over long chains or packed expressions.
- Use TypeScript to prevent boundary mistakes, not to compress code into the fewest lines possible.

## React Component Standard

- Prefer named function components such as `function StoryPage(props: StoryPageProps): JSX.Element`.
- Use `: JSX.Element | null` only when the component can intentionally render nothing.
- Do not use `React.FC` for ordinary components. It adds little value here and makes props and `children` ownership less explicit.
- Do not mix component declaration styles in the same area. Prefer one consistent pattern: named functions with explicit props and return types.
- Name props types explicitly, such as `StoryIntroStreamProps`, instead of vague names like `Props`.
- Type renderable slots and explicit `children` props as `ReactNode`.
- In this repo's `jsx: "react-jsx"` setup, do not add a default `React` import unless the file truly needs a runtime React API.
- Prefer small named helper functions over nested ternaries when deriving labels, element tags, or display-only branching for JSX.

## TSX / JSX Style

- JSX should mainly describe structure, not perform reasoning.
- Move non-trivial decisions out of JSX and into clearly named variables or helper functions before `return`.
- Keep business logic, data shaping, and backend-specific decisions out of JSX.
- Avoid nested ternaries and repeated deep property access inside JSX. Compute values once and give them names.
- Keep inline event handlers simple. If a handler does more than directly forward an event or toggle local UI state, extract a named function.
- Split large components by visual block when one component starts rendering multiple distinct regions, pages, or states.
- Prefer JSX that reads like composition of named sections rather than a large tree with many embedded conditions.

## Verification

- Run `npm test` from `frontend/`
- Run `npm run build` from `frontend/`
- Run `npm run lint` from `frontend/` when touching linted source, configuration, or imports
