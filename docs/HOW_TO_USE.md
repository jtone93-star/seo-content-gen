# How to use Content Generator

Operator guide for the SEO content pipeline. Use this page in the app at **Documentation**, or read `docs/HOW_TO_USE.md` in the repo.

---

## Quick start

1. **Sign in** (hosted only) — If the app asks for a password, enter the shared app password. Locally the gate is off unless `APP_PASSWORD` is set.
2. **Create a client** — Clients → add name, tone, audience, words to avoid, SEO notes.
3. **(Optional) Connect Claude** — AI models → paste your Anthropic API key → Test → Save. Pick a Claude model per stage, or leave stages on Mock.
4. **Start a project** — New content → choose client, topic, optional keyword/URLs/notes/length, content type, and run mode.
5. **Run the pipeline** — Open the project → Start pipeline. In step-by-step mode, review and Approve each stage. In full auto, wait for Final.
6. **Export** — Open Final → copy export markdown / meta / schema as needed.

---

## Sign in and access

| Environment | Behavior |
|-------------|----------|
| Local (`APP_PASSWORD` empty) | Open — no login |
| Hosted with `APP_PASSWORD` set | Password required at `/login`; session cookie lasts ~30 days |
| Log out | Use **Log out** in the top nav |

This is a **single shared password** for MVP (not per-user accounts). Changing `APP_PASSWORD` on Vercel invalidates existing sessions after redeploy.

---

## Client profiles

Clients hold brand voice for every piece:

- Name, industry, audience, tone, reading level, point of view
- Words to avoid (comma-separated)
- Required disclaimers and SEO notes

Create or edit from **Clients**. Every new project must pick a client.

---

## Content projects

**New content** fields:

| Field | Required | Notes |
|-------|----------|--------|
| Client | Yes | Voice and rules for the pipeline |
| Topic | Yes | What the piece is about |
| Target keyword | No | Primary SEO keyword |
| Source URLs | No | Competitor/internal links for research |
| Pasted notes | No | Research notes the pipeline can use |
| Target length | No | Approximate word count |
| Content type | Yes | Blog, landing page, or product description |
| Run mode | Yes | Step-by-step or full auto |

After create, open the project and click **Start pipeline**.

---

## The 9 pipeline stages

Each stage shows a short description and whether it uses **Claude** or **Mock**.

| Stage | What it does |
|-------|----------------|
| Content brief | Intent, keywords, audience, must-cover topics, AI-visibility goals |
| SERP research | Landscape from your URLs/notes, PAA, gaps (no live SERP API yet) |
| Outline | H2/H3 structure, FAQ plan, internal links, takeaways |
| Draft | Full Markdown draft (answer-first sections) |
| Edit | Tone/clarity polish |
| QA & compliance | Banned words, disclaimers, claim checks |
| SEO copy | Meta title/description, headers, keyword map, answer blocks |
| Technical SEO | Slug, OG, JSON-LD, agent summary |
| Final output | Publish-ready bundle (export markdown + schema) |

### Reviewing stages

- **Step-by-step:** Approve & continue after each stage (including Final).
- **Full auto:** All stages run in one Start; review when done.
- Click any completed stage in the sidebar to reopen it.
- **Regenerate** with optional feedback; later stages are superseded when an earlier one is regenerated.
- Approving SEO does **not** auto-approve Final.

---

## AI models (BYO Claude)

Path: **AI models** (`/settings/models`)

1. Create an API key at [console.anthropic.com](https://console.anthropic.com/settings/keys) (Claude.ai chat plans are **not** usable here).
2. Save the key (encrypted at rest with `APP_ENCRYPTION_KEY`).
3. Enable a stage and choose a Claude model — or leave disabled for free Mock output.
4. Project pages show **Using: Claude · model** or **Using: Mock** per stage.

Usage is billed to **your** Anthropic account.

**Hosted tip:** Prefer step-by-step when several stages use Claude — Vercel has a time limit per request.

---

## Dashboard and status

- Home shows recent projects and client count.
- While a step runs: “Running pipeline step…” (Claude can take a minute).
- Failed projects show an error and **Retry pipeline**.

---

## Documentation in the app

| Page | Purpose |
|------|---------|
| **Documentation** (`/documentation`) | This how-to guide |
| **User stories** (`/stories`) | Full acceptance criteria for builders/QA (linked from Documentation) |

---

## Local developer notes

```bash
npm install
# .env: DATABASE_URL, APP_ENCRYPTION_KEY  (APP_PASSWORD optional)
npm run db:setup
npm run dev
```

Hosted setup: see `docs/DEPLOY.md` (Supabase + Vercel + `APP_PASSWORD`).

Smoke checklist: `docs/SMOKE_TESTS.md`.
