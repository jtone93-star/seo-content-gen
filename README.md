# Content Generator Tool

SEO-grade content production with a **9-step pipeline**, **client profiles**, **human review gates**, **BYO Claude** (your Anthropic API key), and **inline pipeline jobs** (Vercel-friendly — no separate worker host required).

Built for local development first (Next.js + Prisma + PostgreSQL). Hosting plan: **Vercel** (app + Deployment Protection + inline jobs) + **Supabase** (DB).

## Documentation

| Doc | Location |
|-----|----------|
| Setup & operations | This file |
| User stories | [docs/USER_STORIES.md](docs/USER_STORIES.md) · in-app: [/stories](http://localhost:3000/stories) (orphan page) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Deploy (planned) | [docs/DEPLOY.md](docs/DEPLOY.md) |
| Smoke tests | [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md) |
| Doc index | [docs/README.md](docs/README.md) |

## Features (current)

- **Client profiles** — tone, audience, POV, words to avoid, SEO notes
- **Content projects** — topic, keyword, URLs, pasted notes, target length, content type
- **9-step pipeline** — Brief → SERP research → Outline → Draft → Edit → QA → SEO copy → Technical SEO → Final
- **Run modes** — step-by-step (approve each stage) or full auto
- **Review UX** — stepper, stage descriptions, reopen any stage, regenerate with feedback
- **Engine badges** — per stage shows **Using: Claude** or **Using: Mock**
- **Job execution** — Start / Approve / Regenerate run in the API request (works on Vercel without a worker)
- **BYO Claude** — save an encrypted Anthropic API key; pick a model per step on `/settings/models`

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

`APP_ENCRYPTION_KEY` is required to save a BYO Anthropic API key.

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
docs/                    # USER_STORIES, ARCHITECTURE, DEPLOY, SMOKE_TESTS
prisma/                  # Schema and migrations
src/lib/pipeline/        # Orchestrator and executors (mock + Anthropic)
src/lib/jobs/            # Enqueue and process jobs
src/lib/credentials.ts   # Encrypted BYO API key
src/worker/              # Worker entrypoint
src/app/                 # Pages and API routes
src/components/          # UI components
```

## Hosting

1. Supabase cloud Postgres + `DATABASE_URL` on Vercel.
2. Same `APP_ENCRYPTION_KEY` on Vercel.
3. `npx prisma migrate deploy` on production.
4. Deploy Next.js to **Vercel** + enable **Deployment Protection**.
5. No separate worker host — jobs run inline in Start / Approve / Regenerate.

Details: [docs/DEPLOY.md](docs/DEPLOY.md).  
Verify: [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md).
