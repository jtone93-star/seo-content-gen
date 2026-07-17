<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Content Generator Tool

- **Docs:** `docs/HOW_TO_USE.md`, `docs/USER_STORIES.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`, `docs/SMOKE_TESTS.md`, `docs/README.md`
- **In-app docs:** `/documentation` (footer link); user stories at `/stories`
- **Pipeline:** 9 steps in `src/lib/pipeline/`; start at `BRIEF`
- **Jobs:** API `enqueueAndRun` processes jobs inline (Vercel-friendly); optional `npm run worker` for leftover PENDING
- **BYO Claude:** encrypted Anthropic API key + per-step model slots at `/settings/models`
- **Auth:** `APP_PASSWORD` + `src/proxy.ts` (gate off when unset)
- **DB:** Prisma + PostgreSQL; run `npm run db:setup` after schema changes
- **Hosting:** Vercel + Supabase + `APP_PASSWORD` (no separate worker host)