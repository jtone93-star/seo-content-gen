<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Content Generator Tool / SEO Turtle Tool

- **Product name (UI):** SEO Turtle Tool
- **Docs:** `docs/HOW_TO_USE.md`, `docs/USER_STORIES.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`, `docs/SMOKE_TESTS.md`, `docs/README.md`, `docs/OPERATOR_FLOW_REVIEW.md`, `docs/CLIENT_PORTAL.md`, `docs/BACKLOG.md` (feature backlog)
- **In-app docs:** `/documentation` (footer link); user stories at `/stories`
- **Pipeline:** 10 steps in `src/lib/pipeline/` (QA and ship check can rewind; max 3 passes each); start at `BRIEF`
- **Jobs:** API `enqueueAndRun` processes jobs inline (Vercel-friendly); optional `npm run worker` for leftover PENDING
- **AI (Claude-first):** BYO Anthropic API key + one global model applied to strategy/audit/content via `/settings/models` (`PATCH /api/settings/ai-defaults`). Mock for dry runs; switch Sonnet/Opus/etc. as needed. Gemini code paths remain but are hidden from operator UI.
- **Strategy:** one plan per client (`src/lib/strategy/`); backlog → cycles → content projects or Excel tech work packages
- **Auth:** `APP_PASSWORD` + `src/proxy.ts` (gate off when unset)
- **DB:** Prisma + PostgreSQL; run `npm run db:setup` after schema changes
- **Hosting:** Vercel + Supabase + `APP_PASSWORD` (no separate worker host)
- **Desktop (Windows):** Electron + embedded Postgres — `npm run desktop:dist` / `docs/DESKTOP.md`