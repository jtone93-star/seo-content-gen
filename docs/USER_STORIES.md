# User stories

Product: **Content Generator Tool** — SEO-grade content pipeline with client profiles, human review gates, BYO Claude (Anthropic API key), and inline pipeline jobs designed for **Vercel-only** hosting.

**Status legend:** ✅ Implemented · 🚧 Partial · 📋 Planned

---

## Epic 1: Client profiles

### US-1.1 Create a client profile ✅

**As a** content operator  
**I want to** create a client profile with voice and SEO preferences  
**So that** every piece of content matches that client’s brand and rules.

**Acceptance criteria**

- I can set name, industry, audience, tone, reading level, and point of view.
- I can list words to avoid (comma-separated).
- I can add required disclaimers and SEO notes.
- Saving redirects me to the client list.

---

### US-1.2 Edit a client profile ✅

**As a** content operator  
**I want to** update an existing client profile  
**So that** strategy changes apply to future content.

**Acceptance criteria**

- I can open any client from the list and edit all profile fields.
- Changes persist after save.

---

### US-1.3 List client profiles ✅

**As a** content operator  
**I want to** see all client profiles in one place  
**So that** I can pick the right client when starting content.

**Acceptance criteria**

- Dashboard shows client count.
- Clients page lists all profiles with name, industry, and tone hint.

---

## Epic 2: Content projects

### US-2.1 Start a new content piece ✅

**As a** content operator  
**I want to** create a project with topic, optional keyword, URLs, notes, length, and content type  
**So that** the pipeline has enough context to produce SEO-focused copy.

**Acceptance criteria**

- I must select a client and enter a topic.
- Optional: target keyword, source URLs (multi-line or comma-separated), pasted notes, target word count.
- Content type: blog post, landing page, or product description.
- Run mode: step-by-step (review each stage) or full auto (review at end).
- Submitting creates the project; starting the pipeline runs the first step in the API request.

---

### US-2.2 View project summary ✅

**As a** content operator  
**I want to** see project metadata on the project detail page  
**So that** I know which client, keyword, and mode I’m working in.

**Acceptance criteria**

- Shows topic, client name, content type, keyword, length, run mode, and URL count.
- Link back to dashboard.

---

### US-2.3 See recent projects on dashboard ✅

**As a** content operator  
**I want to** see my latest projects on the home page  
**So that** I can resume work quickly.

**Acceptance criteria**

- Lists up to 10 recent projects with topic, client, type, and status.
- Clicking opens the project detail page.

---

## Epic 3: SEO pipeline (9 steps)

### US-3.1 Run content brief step ✅

**As a** content operator  
**I want** the pipeline to produce a structured content brief first  
**So that** intent, keywords, and success metrics are defined before research and writing.

**Acceptance criteria**

- Output includes search intent, primary/secondary keywords, format, must-cover topics, CTA, success metrics, AI visibility goals, and primary entities.
- In step-by-step mode, I must approve before SERP research runs.

---

### US-3.2 Run SERP research step ✅

**As a** content operator  
**I want** a SERP-oriented research artifact from my URLs and notes  
**So that** the outline reflects competitor landscape and content gaps.

**Acceptance criteria**

- Output includes SERP snapshot (mock), People Also Ask, competitor angles, content gaps, recommended word range, and sources.
- Uses pasted URLs and notes (no live web fetch in MVP).
- Legacy research artifacts without new fields still display without errors.

---

### US-3.3 Run outline with internal links ✅

**As a** content operator  
**I want** an outline with FAQ plan and internal link suggestions  
**So that** structure supports SEO and site architecture.

**Acceptance criteria**

- Output includes H2/H3 sections, optional FAQ section, internal link plan (anchor, URL, placement, rationale), key takeaways, and formatting notes.
- Uses client-provided URLs when available; otherwise mock internal links.

---

### US-3.4 Run draft, edit, and QA steps ✅

**As a** content operator  
**I want** draft → edit → QA in sequence  
**So that** copy is written, polished, and checked against client rules before SEO optimization.

**Acceptance criteria**

- Draft: markdown body, word count, and structure notes (answer-first / GEO-friendly).
- Edit: revised body and change summary aligned to client tone/POV.
- QA: checklist, banned words scan, disclaimer check, claims to verify, pass/fail summary.

---

### US-3.5 Run SEO copy and technical SEO steps ✅

**As a** content operator  
**I want** on-page SEO and technical SEO as separate reviewable stages  
**So that** copy, meta tags, and publish-ready technical fields are all explicit.

**Acceptance criteria**

- SEO copy: meta title/description, headers, keyword map, optimized body, answer blocks, AI-visibility notes.
- Technical SEO: slug, OG fields, schema JSON-LD, canonical, index recommendation, publishing checklist, agent summary, speakable selectors.

---

### US-3.6 Receive final packaged output ✅

**As a** content operator  
**I want** a final artifact that bundles everything for export  
**So that** I can copy or publish the finished piece.

**Acceptance criteria**

- Final includes meta, headers, slug, schema type, export markdown with frontmatter, agent summary, and answer blocks.
- In step-by-step mode, final requires its own approval (not auto-approved when SEO is approved).

---

### US-3.7 Full-auto run mode ✅

**As a** content operator  
**I want** the pipeline to run all steps without pausing  
**So that** I only review the completed piece when I’m in a hurry.

**Acceptance criteria**

- Full auto runs Brief through Final without approval gates between steps.
- I can still open any completed step in the stepper after the run finishes.

---

### US-3.8 Understand what each stage does ✅

**As a** content operator  
**I want** clear copy explaining each pipeline stage  
**So that** I know what I’m approving.

**Acceptance criteria**

- Active stage on the project page shows a short description (`STEP_DESCRIPTIONS`).
- Settings → AI models shows the same description under each slot.

---

## Epic 4: Review and approval

### US-4.1 Review one step at a time ✅

**As a** content operator  
**I want** step-by-step mode to pause after each stage  
**So that** I can correct direction before expensive downstream steps.

**Acceptance criteria**

- Each step shows `awaiting review` until I approve.
- Approve & continue runs the next step in the API request.
- UI advances to the next step in the sidebar after approval.

---

### US-4.2 View step artifacts in a stepper ✅

**As a** content operator  
**I want** a sidebar listing all pipeline stages with status badges  
**So that** I know where the project is and what’s done.

**Acceptance criteria**

- Nine steps labeled clearly (Brief → … → Final).
- Steps without output are disabled (“Not started”).
- Clicking a completed step shows that step’s artifact.
- Sidebar shows whether each step is configured for Claude or Mock.

---

## Epic 5: Reopen, regenerate, and history

### US-5.1 Reopen a completed stage ✅

**As a** content operator  
**I want to** click any completed step after the project is done  
**So that** I can read earlier artifacts without losing my place.

**Acceptance criteria**

- Viewing an older step does not snap me back to the current step.
- Banner offers “return to [current step]” when viewing history.
- Completed projects default to Final but allow navigation to any step with an artifact.

---

### US-5.2 Regenerate a step with feedback ✅

**As a** content operator  
**I want to** regenerate a step with optional notes  
**So that** I can fix one stage without starting over.

**Acceptance criteria**

- Regenerate runs in the API request.
- Downstream artifacts are superseded when an earlier step is regenerated.
- New version appears in the stepper (version badge when > 1).

---

### US-5.3 Retry a failed project ✅

**As a** content operator  
**I want to** restart a failed pipeline  
**So that** transient errors don’t force a new project.

**Acceptance criteria**

- Failed projects show an error message.
- “Retry pipeline” starts a new START job when status is FAILED.

---

## Epic 6: Pipeline job execution

### US-6.1 Run pipeline work from the web app ✅

**As a** content operator  
**I want** start/approve/regenerate to run the step without a separate worker process  
**So that** the app works on Vercel and locally with only `npm run dev`.

**Acceptance criteria**

- API enqueues a `PipelineJob` and processes it in the same request (`enqueueAndRun`).
- UI waits for the request to finish, then refreshes with the new artifact.
- Routes allow long runs (`maxDuration` 300s) for Claude steps.

---

### US-6.2 Keep a job record for status and retries ✅

**As a** developer / operator  
**I want** each start/approve/regenerate recorded as a `PipelineJob`  
**So that** failures are visible and I can retry from the UI.

**Acceptance criteria**

- Jobs move PENDING → PROCESSING → COMPLETED or FAILED.
- Inline failures mark the project FAILED (no silent re-queue).
- Optional `npm run worker` can still drain leftover PENDING jobs locally.

---

### US-6.3 See progress while a step runs ✅

**As a** content operator  
**I want** clear feedback that a step is running  
**So that** I know Claude/mock work is in progress.

**Acceptance criteria**

- Project page shows a running/starting message while the request is in flight / status is busy.
- No instruction to start a separate worker for normal operation.

---

## Epic 7: BYO Claude (Anthropic API)

### US-7.1 See and configure model slots per pipeline step ✅

**As a** platform owner  
**I want** a settings page listing each step’s Claude model  
**So that** I can choose the best model per job without using shared API credits.

**Acceptance criteria**

- All nine pipeline steps have a slot on `/settings/models`.
- Disabled slots use mock executors.
- Enabled slots with provider `anthropic` call Claude with my saved key.

---

### US-7.2 Connect my Anthropic API key ✅

**As a** solo operator  
**I want to** save my Anthropic API key in the app  
**So that** generations are billed to my account, not the product’s.

**Acceptance criteria**

- I can paste a key, save it (encrypted at rest), test connection, and disconnect.
- UI shows connected state with last 4 characters only (full key never returned).
- Requires `APP_ENCRYPTION_KEY` in the environment.
- Note: Claude.ai chat subscriptions cannot be used; API keys from console.anthropic.com are required.

---

### US-7.3 Pick a preferred Claude model per stage ✅

**As a** content operator  
**I want to** choose which Claude model runs each stage  
**So that** I can use cheaper models for lighter steps and stronger ones for draft/edit.

**Acceptance criteria**

- After connecting a key, I can pick/type a model id per step and enable “Run this step on Claude”.
- Model list can load from Anthropic when connected.
- Global defaults apply to all projects (single-user MVP).

---

### US-7.4 See which engine a stage will use ✅

**As a** content operator  
**I want** a clear “Using: Claude / Mock” indicator on the project pipeline  
**So that** I know whether a stage will spend API credits.

**Acceptance criteria**

- Active step shows an engine badge (Claude + model id, or Mock).
- Sidebar lists Claude/Mock under each step name.

---

## Epic 8: Single-user MVP access

### US-8.1 Use the app without auth locally ✅

**As a** solo operator  
**I want** no login for local MVP when `APP_PASSWORD` is unset  
**So that** I can iterate quickly.

**Acceptance criteria**

- With `APP_PASSWORD` empty/unset, pages and APIs are open.
- Multi-tenant / per-user accounts remain future work.

---

### US-8.2 Protect the hosted app with a shared password ✅

**As a** solo operator  
**I want** a simple app password gate on Vercel (Hobby-friendly)  
**So that** strangers cannot use my APIs or saved Anthropic key.

**Acceptance criteria**

- Setting `APP_PASSWORD` enables the gate via Next.js `proxy.ts`.
- Unauthenticated users are redirected to `/login` (APIs return 401).
- Correct password sets an HTTP-only session cookie; Log out clears it.
- Session is invalidated when `APP_PASSWORD` changes (HMAC includes the password).

---

## Epic 9: Documentation and product clarity

### US-9.1 Read user stories in the app ✅

**As a** product owner  
**I want** an internal page listing all user stories  
**So that** I can align development and QA with intended behavior.

**Acceptance criteria**

- Page available at `/stories` (not in main nav).
- Renders `docs/USER_STORIES.md`.
- Linked from Documentation.

---

### US-9.2 Onboard via README and docs ✅

**As a** developer  
**I want** up-to-date setup and architecture docs  
**So that** I can run Postgres, migrations, and the app reliably.

**Acceptance criteria**

- README covers install, local dev, pipeline, BYO Claude, and hosting.
- `docs/` includes architecture, user stories, how-to, deploy, and smoke tests.

---

### US-9.3 Run smoke tests before shipping a milestone ✅

**As a** developer / operator  
**I want** a written smoke-test checklist  
**So that** I can verify local and hosted behavior quickly.

**Acceptance criteria**

- `docs/SMOKE_TESTS.md` covers core app, inline jobs, pipeline UX, BYO Claude, documentation, login gate, and hosted checks.

---

### US-9.4 Read how-to documentation in the app ✅

**As a** content operator  
**I want** an in-app Documentation section based on how the product is meant to be used  
**So that** I can operate the pipeline without reading the repo.

**Acceptance criteria**

- Footer link **Documentation** opens `/documentation`.
- Page renders `docs/HOW_TO_USE.md` (quick start, clients, projects, stages, Claude, login).
- Links to user stories for full acceptance criteria.

---

## Epic 10: Planned product features

### US-10.1 Live SERP and web research 📋

**As a** content operator  
**I want** real SERP/competitor data  
**So that** research reflects current rankings.

---

### US-10.2 Managed MCP / hosted API tier 📋

**As a** customer who doesn’t want to pick models  
**I want** a managed pipeline via MCP or API with default models  
**So that** I get quality output without BYO AI setup.

---

### US-10.3 Batch content and priority queue 📋

**As an** agency  
**I want** to queue many pieces with fair scheduling and concurrency limits  
**So that** throughput scales without sacrificing quality.

---

### US-10.4 Export to CMS and Word 📋

**As a** content operator  
**I want** one-click export to Word, Google Docs, or CMS  
**So that** publishing is faster than copying markdown.

---

## Epic 11: Hosting (Vercel-only)

### US-11.1 Deploy web app to Vercel ✅

**As a** solo operator  
**I want** the Next.js app on Vercel with Supabase  
**So that** I can use the tool without running it only on my laptop.

**Acceptance criteria**

- App deploys with `DATABASE_URL`, `DIRECT_URL`, and `APP_ENCRYPTION_KEY`.
- Start / Approve / Regenerate work **without** a separate worker service.
- Production access is gated by `APP_PASSWORD` (US-8.2), not paid Vercel Password Protection.

---

### US-11.2 Use Supabase Postgres in production ✅

**As a** developer  
**I want** cloud Postgres for the Vercel app  
**So that** jobs and artifacts persist outside my laptop.

**Acceptance criteria**

- Migrations applied with `prisma migrate deploy`.
- Seed applied for model slots / demo client.
- Vercel uses pooled `DATABASE_URL` (+ `DIRECT_URL` for migrate tooling).

---

### US-11.3 Prefer step-by-step for hosted Claude runs ✅ (guidance)

**As a** content operator  
**I want** step-by-step mode when using Claude on Vercel  
**So that** each request stays within function time limits.

**Acceptance criteria**

- Docs warn that full auto + many Claude-enabled steps may timeout on Vercel.
- Step-by-step (one stage per request) is the recommended hosted path.

---

## Story map (implementation overview)

```text
Login (if APP_PASSWORD) ──► Clients ──► New project ──► Start/Approve (inline)
                                                              │
                    ◄── Approve (step-by-step) ◄── Brief … Final
                                                              │
BYO: Anthropic API key ──► Model slots ──► Claude or Mock

Hosted: Vercel + Supabase + APP_PASSWORD + inline jobs
Docs: /documentation (how-to) · /stories (acceptance criteria)
```

---

*Last updated: APP_PASSWORD login gate; in-app Documentation; Vercel + Supabase handoff; how-to guide.*
