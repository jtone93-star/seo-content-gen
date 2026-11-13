# SEO Turtle Tool

SEO-grade content production with a **10-step pipeline**, **client profiles**, **site audits**, **living strategy**, **human review gates**, **Claude-first BYO Anthropic keys**, and **inline pipeline jobs** (Vercel-friendly — no separate worker host required).

Built for local development first (Next.js + Prisma + PostgreSQL). Hosting: **Vercel** + **Supabase** + **`APP_PASSWORD`** login gate.

*(Repo / package folder may still say “Content Generator Tool”; the product name in the app is **SEO Turtle Tool**.)*

## Documentation

| Doc | Location |
|-----|----------|
| Setup & operations | This file |
| How to use (operators) | [docs/HOW_TO_USE.md](docs/HOW_TO_USE.md) · in-app: [/documentation](http://localhost:3000/documentation) |
| User stories | [docs/USER_STORIES.md](docs/USER_STORIES.md) · in-app: [/stories](http://localhost:3000/stories) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Deploy (Vercel) | [docs/DEPLOY.md](docs/DEPLOY.md) |
| Desktop (Windows) | [docs/DESKTOP.md](docs/DESKTOP.md) |
| Smoke tests | [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md) |
| Operator flow review | [docs/OPERATOR_FLOW_REVIEW.md](docs/OPERATOR_FLOW_REVIEW.md) |
| Client portal (planned) | [docs/CLIENT_PORTAL.md](docs/CLIENT_PORTAL.md) |
| Doc index | [docs/README.md](docs/README.md) |

## Features (current)

- **Client hubs** — Overview / Audits / Strategy / Content tabs per client
- **Site audits** — diagnostic pipeline → findings pack (CSV/Excel export)
- **Living strategy** — one active plan per client; KPIs, backlog, cycles, Excel tech work packages
- **Content projects** — topic, keyword, URLs, pasted notes, target length, content type (from client Content tab or cycle Start)
- **10-step pipeline** — Brief → SERP research → Outline → Draft → Edit → QA & compliance → SEO copy → Technical SEO → Ship check → Final
- **Quality loops** — QA and ship check auto-rewind up to 3 passes each
- **Run modes** — step-by-step (approve each stage) or full auto
- **Review UX** — stepper, stage descriptions, reopen any stage, regenerate with feedback
- **Engine badges** — per stage shows **Using: Claude · model** or **Using: Mock**
- **Job execution** — Start / Approve / Regenerate run in the API request (works on Vercel without a worker)
- **Claude-first AI** — save one Anthropic API key; pick Mock or a Claude model and apply to strategy, audits, and content on `/settings/models`
- **Dashboard** — workspace KPI tiles (clients, audits, living strategies, content projects)
- **Windows desktop** — optional fully local Electron install (`npm run desktop:dist`; see [docs/DESKTOP.md](docs/DESKTOP.md))
- **App password** — set `APP_PASSWORD` on Vercel to require `/login` (Hobby-friendly)
- **In-app Documentation** — footer link to how-to guide + user stories

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (local install — no Supabase account required for local)

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Copy `.env.example` → `.env` (or edit `.env`) and set:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/content_generator"
APP_ENCRYPTION_KEY="<base64 32-byte key>"
```

Generate a key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`APP_ENCRYPTION_KEY` is required to save the BYO Anthropic API key.

### 3. Install PostgreSQL (Windows)

**Option A — automated script (recommended)**

1. Open **PowerShell as Administrator**.
2. Run:

```powershell
cd "C:\Users\JTonin\Documents\Cursor Projects\Content Generator Tool"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\install-postgres.ps1
```

Use password `postgres` for local dev.

**Option B — manual install**

See [PostgreSQL for Windows](https://www.postgresql.org/download/windows/). Create database `content_generator` and set `DATABASE_URL` accordingly.

### 4. Apply schema and seed

```bash
npm run db:setup
```

### 5. Start PostgreSQL (after each reboot)

```bash
npm run db:start
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Pipeline jobs run inside the API when you Start / Approve / Regenerate — no second terminal required.

Optional: `npm run worker` can still drain leftover PENDING jobs if you ever need it.

Connect Claude at [http://localhost:3000/settings/models](http://localhost:3000/settings/models) when you want live generations (otherwise steps stay on mock).

## Job execution

| Component | Role |
|-----------|------|
| API (`start`, `approve`, `regenerate`) | Enqueues a job **and runs it** in the same request |
| `PipelineJob` table | Job history / status |
| `npm run worker` | Optional local drain of PENDING jobs |

Buttons wait until the step finishes (Claude can take a while). Routes allow up to **300s** on Vercel.

**Production:** Vercel + Supabase only — see [docs/DEPLOY.md](docs/DEPLOY.md).

## Pipeline steps

| Step | Output |
|------|--------|
| Content brief | Intent, keywords, entities, AI visibility goals, CTA |
| SERP research | SERP snapshot, PAA, competitor angles, gaps |
| Outline | Answer-first structure, FAQ, internal links, key takeaways |
| Draft | Markdown with TL;DR, answer-first H2s, FAQ, entity naming |
| Edit | Polished copy + GEO/AI-visibility formatting |
| QA | Compliance + takeaways/FAQ/entity checks |
| SEO copy | Meta, headers, keyword map, answer blocks |
| Technical SEO | Slug, Article+FAQPage schema, agent summary, speakable |
| Final | Export markdown + JSON-LD + agent summary |

Research uses **your URLs and pasted notes** in MVP (no live web APIs yet).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run worker` | Optional: drain leftover PENDING jobs |
| `npm run build` | Production build |
| `npm run db:setup` | Migrate + seed |
| `npm run db:seed` | Seed only |

## Project structure

```
docs/                    # USER_STORIES, ARCHITECTURE, DEPLOY, DESKTOP, SMOKE_TESTS
desktop/                 # Electron main/preload + embedded Postgres bootstrap
prisma/                  # Schema and migrations
src/lib/pipeline/        # Orchestrator and executors (mock + Anthropic + Gemini)
src/lib/jobs/            # Enqueue and process jobs
src/lib/credentials.ts   # Encrypted BYO API keys
src/lib/desktop-config.ts # Desktop AppData config helpers
src/worker/              # Worker entrypoint
src/app/                 # Pages and API routes
src/components/          # UI components
```

## Desktop (Windows)

```powershell
npm run desktop:dev     # Electron + next dev + embedded Postgres
npm run desktop:dist    # Build NSIS installer → release/
```

See [docs/DESKTOP.md](docs/DESKTOP.md).

## Hosting

1. Supabase transaction-pooler `DATABASE_URL` and migration `DIRECT_URL`.
2. Set `DATABASE_URL`, `DIRECT_URL`, `APP_ENCRYPTION_KEY`, and **`APP_PASSWORD`** on Vercel.
3. Run `npx prisma migrate deploy` and seed Supabase.
4. Deploy Next.js to **Vercel** (jobs run inline — no separate worker).
5. Confirm incognito hits `/login` when `APP_PASSWORD` is set.

Current deployment handoff: [docs/DEPLOY.md](docs/DEPLOY.md).  
Operator guide: [docs/HOW_TO_USE.md](docs/HOW_TO_USE.md).  
Verify: [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md).
