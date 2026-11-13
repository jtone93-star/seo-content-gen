# Documentation

| Document | Description |
|----------|-------------|
| [HOW_TO_USE.md](./HOW_TO_USE.md) | Operator how-to for SEO Turtle Tool (also at `/documentation`) |
| [USER_STORIES.md](./USER_STORIES.md) | User stories and acceptance criteria / journey (also at `/stories`) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data model, Claude-first AI, and pipeline flow |
| [OPERATOR_FLOW_REVIEW.md](./OPERATOR_FLOW_REVIEW.md) | Internal delivery path review + P0/P1 UX punch list |
| [CLIENT_PORTAL.md](./CLIENT_PORTAL.md) | Planned client dashboard scope, auth, and data mapping |
| [DESKTOP.md](./DESKTOP.md) | Windows desktop install (Electron + embedded Postgres) |
| [DEPLOY.md](./DEPLOY.md) | Hosting handoff: Vercel + Supabase + `APP_PASSWORD` |
| [SMOKE_TESTS.md](./SMOKE_TESTS.md) | Manual smoke-test checklist (local + hosted) |
| [../README.md](../README.md) | Setup, local dev, and operations |

## Quick links

- **App (local web):** http://localhost:3000
- **Desktop docs:** [DESKTOP.md](./DESKTOP.md)
- **Documentation (in-app):** http://localhost:3000/documentation
- **AI models (Claude defaults):** http://localhost:3000/settings/models
- **User stories:** http://localhost:3000/stories
- **Worker:** optional `npm run worker` (not required; jobs run inline in the API)
