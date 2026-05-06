# Resources

> The README.md "Resources" section is the canonical list. This file keeps a more detailed reference, grouped by module, for contributors who want to dig deeper.

## Backend & framework

- [FastAPI](https://fastapi.tiangolo.com/)
- [FastAPI security / OAuth2 with JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [Pydantic v2](https://docs.pydantic.dev/latest/)
- [aiosqlite](https://aiosqlite.omnilib.dev/)
- [SQLite WAL mode](https://www.sqlite.org/wal.html)
- [SQLite online backup API](https://www.sqlite.org/backup.html)

## Auth

- [PyJWT](https://pyjwt.readthedocs.io/)
- [passlib bcrypt](https://passlib.readthedocs.io/en/stable/lib/passlib.hash.bcrypt.html)
- [Authlib (OAuth client)](https://docs.authlib.org/en/latest/client/index.html)
- [Google OAuth 2.0 — Web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)

## Frontend

- [React 19 docs](https://react.dev/)
- [Vite docs](https://vitejs.dev/)
- [React Router v7](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Tailwind logical properties + RTL](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)
- [Framer Motion](https://www.framer.com/motion/)
- [sonner (toast notifications)](https://sonner.emilkowal.ski/)

## Accessibility (i18n + RTL)

- [i18next](https://www.i18next.com/)
- [react-i18next](https://react.i18next.com/)
- [MDN — `dir` attribute and bidirectional text](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir)

## AI

- [Google Gemini API (`google-genai`)](https://ai.google.dev/gemini-api/docs)
- [Gemini text generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [NDJSON specification](https://github.com/ndjson/ndjson-spec)

## Voice / speech

- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

## DevOps

- [Docker Compose reference](https://docs.docker.com/compose/compose-file/)
- [nginx HTTPS](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Prometheus](https://prometheus.io/docs/)
- [prometheus-fastapi-instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator)
- [Grafana provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [node_exporter](https://github.com/prometheus/node_exporter)

## AI usage during development

- **Claude Code (Anthropic)** — used by the team for: scaffold analysis against the subject, gap analysis on module requirements, README and `CLAUDE.md` drafting, architecture diagram drafting, exploratory refactor proposals, and pair-style debugging on tricky integration points (Gemini streaming JSON parser, RTL logical-property migration). Every AI-suggested change was read, understood, and edited by the responsible team member before being committed; no generated code was merged unreviewed.
- **GitHub Copilot** — occasional inline completion during routine boilerplate (TypeScript types, test scaffolds). Not used for design or architectural decisions.
