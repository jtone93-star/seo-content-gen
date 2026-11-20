# Architecture

## Overview

SEO Turtle Tool is a **Next.js** application with a **PostgreSQL** database (Prisma), a **sequential SEO content pipeline**, **site audits**, a **strategy** module, and a **Postgres-backed job record** that is processed **inline in the API request** (Vercel-friendly). An optional local `npm run worker` can still drain leftover PENDING jobs.

```text
┌─────────────┐   enqueue + run    ┌──────────────┐
│  Web UI     │ ─────────────────► │ PipelineJob  │
│  (Next.js)  │   (same request)   │  (Postgres)  │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │ read/write                       │ orchestrator (inline)
       ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│  ClientProfile · Audit · AuditDataSource · AuditArtifact     │
│  Strategy · StrategyKpi · StrategyRecommendation · Cycle     │
│  CycleItem · StrategyJob · StrategyModelSlot                 │
│  ContentProject · StepArtifact · ModelSlot · AuditModelSlot  │
│  AppCredential · OAuthAccount                                │
└──────────────────────────────────────────────────────────────┘
```

Locally: usually just `npm run dev` (jobs run in the API).  
Production: **Vercel** (web + inline jobs) + **Supabase** (Postgres) + **Deployment Protection**. No separate worker host required.  
**Windows desktop:** Electron shell + **embedded Postgres** in AppData (`DESKTOP_MODE`, port `47821`) — see [DESKTOP.md](./DESKTOP.md). Same Prisma schema as cloud.

## Core entities

| Model | Purpose |
|-------|---------|
| `ClientProfile` | Brand voice, audience, SEO notes, billing day, words to avoid |
| `ContentProject` | One content piece: topic, keyword, URLs, notes, run mode, status |
| `StepArtifact` | Versioned JSON output per pipeline step |
| `PipelineJob` | Async queue: START, APPROVE, REGENERATE |
| `ModelSlot` | Per-step AI provider/model (`anthropic` or `gemini` + model id, or mock when disabled) |
| `AppCredential` | One encrypted BYO API key per provider (`anthropic`, `gemini`; AES-256-GCM via `APP_ENCRYPTION_KEY`) |
| `Audit` | Diagnostic pipeline; findings pack feeds strategy |
| `Strategy` | One current plan per client (`LIVING` / `PAST`); restorable history |
| `StrategyKpi` | Catalog metric with baseline, target, current |
| `StrategyRecommendation` | Typed play: proposed → backlog → scheduled → done |
| `Cycle` / `CycleItem` | Manual monthly windows from billing day; start content or tech |
| `StrategyModelSlot` | Claude / mock configuration for strategy synthesis (set via global AI defaults) |
| `OAuthAccount` | One Google connection per client (`clientId` unique): encrypted OAuth tokens, signed-in account email, and that client's GA4 property / GSC site |

## Strategy flow

1. A client has at most one `Strategy` with `lifecycle = LIVING`. Creating another archives the current row to Past Strategies (`PAST`); restore swaps them.
2. Structured KPIs are chosen from a fixed catalog (`src/lib/strategy/kpi-catalog.ts`). Currents sync from linked audit GA4/GSC summaries and from completed cycle items.
3. `src/lib/strategy/executor-registry.ts` synthesizes recommendations from the audit findings pack + KPI targets (Claude or Mock; Gemini executors remain in code but are not exposed in operator settings).
4. Approved recommendations sit in **Backlog**. Operators create monthly `Cycle`s from `ClientProfile.billingDay` and assign items.
5. **Start cycle work**: content items create a prefilled `ContentProject` and run START; tech items are marked in progress and exported as an Excel work package for a human to execute.

## Pipeline steps (order)

1. **BRIEF** — intent, keywords, entities, AI visibility goals  
2. **RESEARCH** — SERP snapshot, PAA, gaps (mock SERP in MVP)  
3. **OUTLINE** — answer-first structure, FAQ, internal links, takeaways  
4. **DRAFT** — TL;DR, answer-first H2s, FAQ, entity-clear markdown  
5. **EDIT** — tone/POV + GEO formatting pass  
6. **QA** — readability, factual misspeaks, compliance; auto-rewinds up to 3 passes  
7. **SEO** — meta, headers, keyword map, answer blocks  
8. **TECHNICAL_SEO** — slug, Article+FAQPage JSON-LD, agent summary  
9. **SHIP_CHECK** — publish-readiness gate; auto-rewinds up to 3 passes  
10. **FINAL** — export bundle with schema + agent summary  

Copy is structured for **classic SEO** and **AI visibility** (answer-first sections, extractable takeaways, FAQPage schema, explicit entities, agent-readable summary). Rules live in `src/lib/pipeline/ai-visibility.ts`.  

QA and ship check use `src/lib/pipeline/quality-loop.ts`: a failed gate regenerates the named earlier stage (with feedback) and runs forward again. After 3 failed passes the project pauses for human review.  

Step labels and operator-facing descriptions live in `STEP_LABELS` / `STEP_DESCRIPTIONS` (`src/lib/pipeline/types.ts`).

## Run modes

| Mode | Behavior |
|------|----------|
| `STEP_BY_STEP` | Pause after **every** step (including Final) until approved. QA and ship check still auto-rewind on failure until the 3-pass cap. |
| `FULL_AUTO` | Run steps in one job, except failed QA/ship check after 3 passes pauses for review |

## Orchestration & AI executors

- `src/lib/pipeline/orchestrator.ts` — `executeStep`, `startPipeline`, `approveStep`, `regenerateStep`
- `src/lib/pipeline/mock-executors.ts` — placeholder outputs when a slot is disabled
- `src/lib/pipeline/anthropic-executor.ts` — Claude JSON-shaped step outputs (BYO key)
- `src/lib/pipeline/gemini-executor.ts` — Gemini JSON-shaped step outputs (BYO key)
- `src/lib/pipeline/executor-registry.ts` — if `ModelSlot.enabled` + provider `anthropic`/`gemini` + matching key → live model; else mock

Regenerating a step **supersedes** all downstream artifacts.

**BYO Claude (operator default):** Anthropic does not allow third-party apps to bill a user’s Claude.ai chat subscription. Connect an **Anthropic API key** from console.anthropic.com; usage is billed to that account. One model is applied to strategy, audit, and content via `PATCH /api/settings/ai-defaults`.

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
| GET/POST/DELETE | `/api/settings/credentials` | Anthropic (and legacy Gemini) API key status / save / remove |
| POST | `/api/settings/credentials/test` | Validate a BYO API key |
| GET | `/api/settings/anthropic-models` | List Claude models available to the connected key |
| GET/PATCH | `/api/settings/ai-defaults` | Claude-first global model — applies to strategy, audit, and content slots |
| GET | `/api/settings/gemini-models` | Legacy: list Gemini models (hidden from operator UI) |
| POST | `/api/strategies` | Create strategy (archives previous) |
| GET/PATCH | `/api/strategies/[id]` | Load / update current or past strategy |
| POST | `/api/strategies/[id]/analyze` | Generate recommendations inline |
| POST | `/api/strategies/[id]/restore` | Restore a past strategy as current |
| POST | `/api/strategies/[id]/recommendations` | Approve/reject into backlog |
| POST | `/api/strategies/[id]/cycles` | Create one month or next N cycles |
| POST | `/api/strategies/[id]/cycles/[cycleId]/assign` | Schedule backlog items |
| POST | `/api/strategies/[id]/cycles/[cycleId]/start` | Start all or selected work |
| GET | `/api/strategies/[id]/cycles/[cycleId]/export` | Excel work package |
| PATCH | `/api/settings/strategy-model` | Claude / Gemini / mock for strategy synthesis |
| GET | `/api/google/oauth/start?clientId=` | Start Google OAuth for one client (client id travels in the signed state) |
| GET | `/api/google/oauth/callback` | Store encrypted Google OAuth tokens on that client |
| GET/POST/DELETE | `/api/clients/[id]/google` | That client's connection: status + available GA4/GSC resources, save selection, disconnect |
| POST | `/api/audits/[id]/sources/google` | Sync GA4/GSC summaries from the audit's own client connection |
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
| `/clients/[id]` | No | Client hub (Overview / Audits / Strategy / Content) |
| `/clients/[id]/audits/new` | No | Create audit |
| `/projects/new` | Yes | New content (from client Content tab / cycle Start; not in main nav) |
| `/projects/[id]` | No | Pipeline stepper + review (engine badge + step descriptions) |
| `/settings/models` | Yes | BYO Claude key + one global model (Mock or Live) |
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
                               Anthropic API (BYO Claude key)
```

Required env on Vercel:

- `DATABASE_URL` (pooler `6543` + `pgbouncer=true`)
- `DIRECT_URL` (session `5432`, for migrate tooling)
- `APP_ENCRYPTION_KEY` (32-byte base64)
- `APP_PASSWORD` (shared login; required for production protection)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (strategy Google data)

See [DEPLOY.md](./DEPLOY.md), [DESKTOP.md](./DESKTOP.md), [HOW_TO_USE.md](./HOW_TO_USE.md), [OPERATOR_FLOW_REVIEW.md](./OPERATOR_FLOW_REVIEW.md), [CLIENT_PORTAL.md](./CLIENT_PORTAL.md), and [SMOKE_TESTS.md](./SMOKE_TESTS.md).

**Note:** Full auto with many live-model steps may exceed Vercel time limits; prefer step-by-step for hosted Claude runs.

## Business direction (context)

- **Operator app:** internal delivery cockpit; Claude-first BYO key + one selectable model for all engines.
- **Client portal (planned):** read-mostly findings / priorities dashboard — see [CLIENT_PORTAL.md](./CLIENT_PORTAL.md).
