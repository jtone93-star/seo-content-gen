# Architecture

## Overview

Content Generator Tool is a **Next.js** application with a **PostgreSQL** database (Prisma), a **sequential SEO content pipeline**, and a **Postgres-backed job record** that is processed **inline in the API request** (Vercel-friendly). An optional local `npm run worker` can still drain leftover PENDING jobs.

```text
┌─────────────┐   enqueue + run    ┌──────────────┐
│  Web UI     │ ─────────────────► │ PipelineJob  │
│  (Next.js)  │   (same request)   │  (Postgres)  │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ read/write                       │ orchestrator (inline)
       ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│  ClientProfile · ContentProject · StepArtifact · ModelSlot   │
│  AppCredential                                               │
└──────────────────────────────────────────────────────────────┘
```

Locally: usually just `npm run dev` (jobs run in the API).  
Production: **Vercel** (web + inline jobs) + **Supabase** (Postgres) + **Deployment Protection**. No separate worker host required.

## Core entities

| Model | Purpose |
|-------|---------|
| `ClientProfile` | Brand voice, audience, SEO notes, words to avoid |
| `ContentProject` | One content piece: topic, keyword, URLs, notes, run mode, status |
| `StepArtifact` | Versioned JSON output per pipeline step |
| `PipelineJob` | Async queue: START, APPROVE, REGENERATE |
| `ModelSlot` | Per-step AI provider/model (`anthropic` + model id, or mock when disabled) |
| `AppCredential` | Single-user encrypted Anthropic API key (AES-256-GCM via `APP_ENCRYPTION_KEY`) |

## Pipeline steps (order)

1. **BRIEF** — intent, keywords, entities, AI visibility goals  
2. **RESEARCH** — SERP snapshot, PAA, gaps (mock SERP in MVP)  
3. **OUTLINE** — answer-first structure, FAQ, internal links, takeaways  
4. **DRAFT** — TL;DR, answer-first H2s, FAQ, entity-clear markdown  
5. **EDIT** — tone/POV + GEO formatting pass  
6. **QA** — compliance + AI-visibility checklist  
7. **SEO** — meta, headers, keyword map, answer blocks  
8. **TECHNICAL_SEO** — slug, Article+FAQPage JSON-LD, agent summary  
9. **FINAL** — export bundle with schema + agent summary  

Copy is structured for **classic SEO** and **AI visibility** (answer-first sections, extractable takeaways, FAQPage schema, explicit entities, agent-readable summary). Rules live in `src/lib/pipeline/ai-visibility.ts`.  

Step labels and operator-facing descriptions live in `STEP_LABELS` / `STEP_DESCRIPTIONS` (`src/lib/pipeline/types.ts`).

## Run modes

| Mode | Behavior |
|------|----------|
| `STEP_BY_STEP` | Pause after **every** step (including Final) until approved |
| `FULL_AUTO` | Run all steps in one job; no gates between steps |

## Orchestration & AI executors

- `src/lib/pipeline/orchestrator.ts` — `executeStep`, `startPipeline`, `approveStep`, `regenerateStep`
- `src/lib/pipeline/mock-executors.ts` — placeholder outputs when a slot is disabled
- `src/lib/pipeline/anthropic-executor.ts` — Claude JSON-shaped step outputs (BYO key)
- `src/lib/pipeline/executor-registry.ts` — if `ModelSlot.enabled` + `provider === "anthropic"` + key present → Claude; else mock

Regenerating a step **supersedes** all downstream artifacts.

**BYO Claude note:** Anthropic does not allow third-party apps to bill a user’s Claude.ai chat subscription. Users connect an **Anthropic API key** from console.anthropic.com; usage is billed to their API account.

## Job queue / inline execution

| Status | Meaning |
|--------|---------|
| Project `QUEUED` | Job created; about to run (or briefly waiting) |
| Job `PENDING` | Created, not yet claimed |
| Job `PROCESSING` | Orchestrator executing |
| Project `RUNNING` | Step in progress |

API routes call `enqueueAndRun` (`src/lib/jobs/run-inline.ts`): create a `PipelineJob`, then `runEnqueuedJob` in the **same request**. Routes set `maxDuration = 300` for Vercel.

Optional `npm run worker` still claims PENDING jobs (local leftover drain / future scale-out). It is not required for normal operation.

## API routes

| Method | Path | Action |
|--------|------|--------|
| GET/POST | `/api/clients` | List / create clients |
| GET/PATCH/DELETE | `/api/clients/[id]` | Client CRUD |
| GET/POST | `/api/projects` | List / create projects |
| GET | `/api/projects/[id]` | Project + artifacts + active job |
| POST | `/api/projects/[id]/start` | Enqueue + run START (inline) |
| POST | `/api/projects/[id]/steps/[step]/approve` | Enqueue + run APPROVE (inline) |
| POST | `/api/projects/[id]/steps/[step]/regenerate` | Enqueue + run REGENERATE (inline) |
| GET/PATCH | `/api/settings/model-slots/[step]` | Update per-step model slot |
| GET/POST/DELETE | `/api/settings/credentials` | Anthropic API key status / save / remove |
| POST | `/api/settings/credentials/test` | Validate API key |
| GET | `/api/settings/anthropic-models` | List models available to the connected key |
| POST | `/api/auth/login` | App password login (sets session cookie) |
| POST | `/api/auth/logout` | Clear session cookie |

## Auth (MVP)

- `APP_PASSWORD` unset → open app (local default).
- `APP_PASSWORD` set → `src/proxy.ts` requires a valid `cg_session` cookie for all routes except `/login` and auth APIs.
- Session token is an HMAC of the password (signed with `APP_ENCRYPTION_KEY`).

## UI routes

| Path | Nav | Purpose |
|------|-----|---------|
| `/` | Yes | Dashboard |
| `/clients` | Yes | Client list |
| `/clients/new` | No | Create client |
| `/clients/[id]/edit` | No | Edit client |
| `/projects/new` | Yes | New content |
| `/projects/[id]` | No | Pipeline stepper + review (engine badge + step descriptions) |
| `/settings/models` | Yes | BYO Anthropic key + per-step Claude models |
| `/login` | No | App password sign-in |
| `/documentation` | Footer | Operator how-to (`docs/HOW_TO_USE.md`) |
| `/stories` | Via Documentation | User stories reader |

## Deployment path (Vercel-only)

| Piece | Host | Notes |
|-------|------|--------|
| Web UI + API + job execution | **Vercel** | Inline `enqueueAndRun`; gate with `APP_PASSWORD` |
| Database | **Supabase** Postgres | Shared by the app |

```text
You → /login (APP_PASSWORD) → Next.js (Vercel)
                                    │ enqueue + run (same request)
                                    ▼
                               Supabase Postgres
                                    │
                               Anthropic API (BYO key)
```

Required env on Vercel:

- `DATABASE_URL` (pooler `6543` + `pgbouncer=true`)
- `DIRECT_URL` (session `5432`, for migrate tooling)
- `APP_ENCRYPTION_KEY` (32-byte base64)
- `APP_PASSWORD` (shared login; required for production protection)

See [DEPLOY.md](./DEPLOY.md), [HOW_TO_USE.md](./HOW_TO_USE.md), and [SMOKE_TESTS.md](./SMOKE_TESTS.md).

**Note:** Full auto with many Claude-enabled steps may exceed Vercel time limits; prefer step-by-step for hosted Claude runs.

## Business direction (context)

- **Platform:** customers bring their own Anthropic API key and pick a Claude model per step.  
- **Managed tier (future):** MCP or API with curated defaults for users who don’t want to choose models.
