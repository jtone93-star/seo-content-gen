# How to use SEO Turtle Tool

Operator guide for audits, living strategy, and the SEO content pipeline. Use this page in the app at **Documentation**, or read `docs/HOW_TO_USE.md` in the repo.

---

## Quick start

1. **Sign in** (hosted only) — If the app asks for a password, enter the shared app password. Locally the gate is off unless `APP_PASSWORD` is set.
2. **Create a client** — Clients → add name, tone, audience, words to avoid, SEO notes, billing day.
3. **(Optional) Connect Claude** — AI models → paste your Anthropic API key → Test → Save. Choose **Live Claude** + a model (Sonnet recommended; Opus for harder jobs) or **Mock**, then Apply everywhere.
4. **Run a site audit** — Open a client → Audits tab → New audit.
5. **Build a living strategy** — Strategy tab → create plan, pick KPIs, generate recommendations, approve to Backlog, create cycles, start work.
6. **Start a project** — Client **Content** tab → New content (or cycle **Start** on a content play). Choose topic, optional keyword/URLs/notes/length, content type, and run mode.
7. **Run the pipeline** — Open the project → Start pipeline. In step-by-step mode, review and Approve each stage. In full auto, wait for Final (QA/ship check may still rewind).
8. **Export** — Open Final → copy export markdown / meta / schema as needed. Tech plays export as Excel from the cycle.

---

## Sign in and access

| Environment | Behavior |
|-------------|----------|
| Local web (`APP_PASSWORD` empty) | Open — no login |
| **Windows desktop app** | Open — password gate off by default; data in `%APPDATA%\SEO Turtle Tool\` (see `docs/DESKTOP.md`) |
| Hosted with `APP_PASSWORD` set | Password required at `/login`; session cookie lasts ~30 days |
| Log out | Use **Log out** in the top nav (hosted / gated web only) |

This is a **single shared password** for the hosted MVP (not per-user accounts). Changing `APP_PASSWORD` on Vercel invalidates existing sessions after redeploy.

---

## Dashboard

Home shows workspace **KPI tiles** (not a project list):

- Clients
- Audits
- Living strategies
- Content projects (with failed / in-review hints when relevant)

Tiles link into **Clients**. Start audits, strategy, and content from a client hub — there is no global “New content” nav item.

While a pipeline step runs: “Running pipeline step…” (Claude/Gemini can take a minute). Failed projects show an error and **Retry pipeline**.

---

## Client profiles

Clients hold brand voice for every piece:

- Name, industry, audience, tone, reading level, point of view
- Words to avoid (comma-separated)
- Required disclaimers and SEO notes
- **Billing day of month (1–28)** — recurring anchor for strategy cycles

Create or edit from **Clients**. The client page is split into **Overview**, **Audits**, **Strategy**, **Content**, and **Performance** tabs.

---

## Site audits

Open **Clients**, choose a client, then select **New audit**.

Audits diagnose what’s wrong or underused with the data you have. They are **not** the growth plan — that lives on the **Strategy** tab.

1. Name the audit, optionally add a seed URL and scope notes.
2. Attach crawl CSV/XLSX uploads and notes; connect GA4 / Search Console and sync.
3. Start the audit pipeline (prefer step-by-step).
4. Review each stage:
   - Crawl & technical health
   - Indexation & coverage
   - Visibility & demand
   - Internal linking & architecture
   - Page shortlist (approve which URLs to deep-dive)
   - Page deep-dive
   - Keyword & relevance health
   - AI crawlability & agent access
   - Answer extractability
   - Findings report (export CSV/Excel of all findings)
5. At the page shortlist gate, edit the URL list before approving.
6. On the findings report stage, download CSV or Excel of every issue and associated URL across stages.

Google setup requires a Google Cloud Web OAuth client with the Analytics Data, Analytics Admin, and Search Console APIs enabled. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.

---

## Living strategy

Open a client → **Strategy** tab.

Each client has **one living strategy**. Creating a new one automatically moves the previous plan to **Past Strategies**. Restore any past strategy to make it living again.

1. Set **billing day** on Overview (or Edit profile). Cycles run from that day of the month to the day before next month’s billing day.
2. Create the living strategy: name, source audit, notes, and **catalog KPIs** (organic sessions, conversions, GSC clicks/impressions, average position, indexed pages, content shipped, tech items closed).
3. **Generate recommendations** (Claude if live AI is enabled on AI models, otherwise Mock). Review, approve into **Backlog**, or reject.
4. This month and next month are created from the billing day. Approved plays sit in the **Backlog**, most important first. **Add to this month** to execute, or **Add to next month** to line them up.
5. On **This month**:
   - **Start content** opens a content project and starts the brief.
   - Tech plays can be marked in progress. Download the month’s **tech package** (Excel). A human executes the fixes.
6. Mark cycle items done so content shipped / tech closed can update. On **Performance**, **Sync from audit / app** pulls GA4/GSC totals from the linked audit when those summaries exist.

---

## Content projects

Create from the client **Content** tab (**New content**) or by starting a content play in a strategy cycle.

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

## The 10 pipeline stages

Each stage shows a short description and whether it uses **Claude** or **Mock**.

| Stage | What it does |
|-------|----------------|
| Content brief | Intent, keywords, audience, must-cover topics, AI-visibility goals |
| SERP research | Landscape from your URLs/notes, PAA, gaps (no live SERP API yet) |
| Outline | H2/H3 structure, FAQ plan, internal links, takeaways |
| Draft | Full Markdown draft (answer-first sections) |
| Edit | Tone/clarity polish |
| QA & compliance | How it reads, factual misspeaks, banned words, disclaimers; auto-rewind up to 3 passes |
| SEO copy | Meta title/description, headers, keyword map, answer blocks |
| Technical SEO | Slug, OG, JSON-LD, agent summary |
| Ship check | Publish-readiness gate; auto-rewind up to 3 passes before Final |
| Final output | Publish-ready bundle (export markdown + schema) |

### Reviewing stages

- **Step-by-step:** Approve & continue after each stage (including Final). QA and ship check still auto-rewind on failure (max 3 passes) before they wait for you.
- **Full auto:** Stages run in one Start; QA/ship check pause for you only after 3 failed passes.
- Click any completed stage in the sidebar to reopen it.
- **Regenerate** with optional feedback; later stages are superseded when an earlier one is regenerated.
- Approving SEO does **not** skip ship check or auto-approve Final. Order is … → Technical SEO → Ship check → Final.

---

## AI models (Claude-first)

Path: **AI models** (`/settings/models`)

1. Create an Anthropic API key at [console.anthropic.com](https://console.anthropic.com/settings/keys) (Claude.ai chat plans are **not** usable here).
2. Save the key (encrypted at rest with `APP_ENCRYPTION_KEY`).
3. Under **Claude for all engines**, pick **Mock** or **Live Claude**, choose a model (Sonnet default; switch to a higher tier such as Opus when needed), then **Apply to strategy, audits, and content**.
4. Audit and project pages show **Claude · model** or **Mock** for the engine used.

Usage is billed to **your** Anthropic account.

**Desktop:** On the Windows app, the same page also lets you paste Google Cloud OAuth client ID/secret for Analytics + Search Console. Redirect URI is fixed at `http://127.0.0.1:47821/api/google/oauth/callback` — details in `docs/DESKTOP.md`.

**Hosted tip:** Prefer step-by-step when several stages use live models — Vercel has a time limit per request.

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
# .env: DATABASE_URL, APP_ENCRYPTION_KEY (APP_PASSWORD and Google OAuth optional)
npm run db:setup
npm run dev
```

Hosted setup: see `docs/DEPLOY.md` (Supabase + Vercel + `APP_PASSWORD`).

Windows desktop install: see `docs/DESKTOP.md` (`npm run desktop:dist`).

Smoke checklist: `docs/SMOKE_TESTS.md`.
