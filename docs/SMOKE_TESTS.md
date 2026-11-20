# Smoke tests

Manual checks before calling a milestone done. Run locally first; after hosting, run the **Hosted** and **Login gate** sections.

**Prereqs (local):** Postgres up (`npm run db:start` if needed), `npm run db:setup` once, `npm run dev`, `.env` has `DATABASE_URL` and `APP_ENCRYPTION_KEY`.  
Leave `APP_PASSWORD` empty locally unless testing the login gate.  
No separate worker required for normal Start / Approve / Regenerate.

---

## A. Core app

| # | Steps | Pass if |
|---|--------|---------|
| A1 | Open `/` | Dashboard loads with KPI tiles (Clients, Audits, Strategies, Content projects) — or DB unavailable message if Postgres is down |
| A2 | Create a client with tone + words to avoid | Client appears on `/clients` |
| A3 | Edit that client | Changes persist |
| A4 | Client → Content → New content: topic, keyword, URL, notes, step-by-step | Project opens; Start pipeline available |
| A5 | Check main nav | Dashboard, Clients, AI models, Documentation — **no** global Content / New content item |

## B. Inline job execution

| # | Steps | Pass if |
|---|--------|---------|
| B1 | Start pipeline with **only** `npm run dev` (no worker) | Brief artifact appears when the request finishes |
| B2 | Approve Brief | Next step runs and sidebar advances |
| B3 | Open an earlier step | History banner; can return to current step |
| B4 | Regenerate a step with feedback | New version badge; downstream superseded as designed |
| B5 | Full-auto project (mock slots) | All 10 steps complete in one Start request (including ship check → Final) |
| B6 | (Optional) Full-auto with several Claude/Gemini slots | Completes **or** fails clearly if over time limit — prefer step-by-step on Vercel |

## C. Pipeline UX

| # | Steps | Pass if |
|---|--------|---------|
| C1 | Open any stage on a project | Short **description** of what the stage does is visible |
| C2 | Check sidebar + header | **Using: Mock** (or **Using: Claude · model** / **Gemini · model**) matches Settings |
| C3 | Approve SEO only (step-by-step) | Next stage is **Ship check**, not Final; Final is **not** auto-approved |
| C4 | Complete Final, then reopen Outline | Can view Outline without losing project |
| C5 | Force a failing QA (mock or live) that rewinds | Pipeline rewinds to earlier stage with feedback; at most 3 QA passes then pauses |
| C6 | Force a failing ship check that rewinds | Rewinds to outline/draft/edit/SEO/technical SEO; at most 3 passes then pauses |

## D. Claude-first AI defaults (`/settings/models`)

| # | Steps | Pass if |
|---|--------|---------|
| D1 | Page loads without API key | Claude shows “Not connected”; Gemini UI is not shown; live mode disabled |
| D2 | Paste invalid Anthropic key → Test connection | Clear failure message |
| D3 | Paste valid Anthropic API key → Save → Test | Connected ····last4; test OK |
| D4 | Live Claude + Sonnet (or listed model) → Apply everywhere | Strategy/audit/content use that Claude model |
| D5 | Run/regenerate a content or audit step | Artifact is real Claude JSON (not mock); billed to your API account |
| D6 | Switch to Mock → Apply → regenerate | Mock output again |
| D7 | Disconnect Anthropic key | Connected badge clears; live apply requires reconnecting |

## E. Documentation in the app

| # | Steps | Pass if |
|---|--------|---------|
| E1 | Footer **Documentation** link | Opens `/documentation` with how-to guide (SEO Turtle Tool) |
| E2 | From Documentation, open User stories | `/stories` renders acceptance criteria |
| E3 | Skim how-to vs user stories | Matches current product: 10 stages, Claude-first AI, strategy, dashboard tiles |

## F. Hosted (Vercel + Supabase)

| # | Steps | Pass if |
|---|--------|---------|
| F1 | Open production URL (after login if gated) | App loads against Supabase |
| F2 | Start a step-by-step project (mock) | Completes **without** any Railway/worker service |
| F3 | Save Anthropic key; Apply live Claude model; regenerate a step | Live step works on Vercel alone |
| F4 | Confirm Vercel has `DATABASE_URL`, `DIRECT_URL`, `APP_ENCRYPTION_KEY` | App + encrypted keys work |

## G. Login gate (`APP_PASSWORD`)

| # | Steps | Pass if |
|---|--------|---------|
| G1 | Local with `APP_PASSWORD` unset | No login; full app open |
| G2 | Hosted with `APP_PASSWORD` set; open site in **incognito** | Redirected to `/login` |
| G3 | Wrong password | Error message; still gated |
| G4 | Correct password | Lands on dashboard (or `from` path); nav shows Log out |
| G5 | Call an API without cookie (e.g. curl) | `401 Unauthorized` |
| G6 | Log out | Cookie cleared; redirected to login |

---

## H. Strategy

| # | Steps | Pass if |
|---|--------|---------|
| H1 | Client page tabs | Overview / Audits / Strategy / Content switch without losing the client |
| H2 | Set billing day 1–28 | Saved; cycles use that window |
| H3 | Create strategy + KPIs | Strategy dashboard cards show targets |
| H4 | Generate recommendations (mock) | Proposed plays appear; approve → Backlog |
| H5 | Create a cycle; assign a backlog item | Item shows on the cycle |
| H6 | Start selected content item | Content project is created and linked |
| H7 | Download cycle Excel | Workbook has How to execute + Tech/Content sheets |
| H8 | Create a second strategy | First appears under Past Strategies; Restore swaps them |

---

## I. Desktop (Windows)

Prereqs: built installer from `npm run desktop:dist`, or `npm run desktop:dev` for developers.

| # | Steps | Pass if |
|---|--------|---------|
| I1 | Install NSIS exe (or launch `desktop:dev`) | App window opens to the dashboard without a separate Postgres install |
| I2 | Create a client; start a mock content project | Pipeline stages complete locally |
| I3 | AI models → save Claude key → Apply live model → regenerate a step | Live artifact; key shows Connected ····last4 |
| I4 | AI models → paste Google client ID/secret → Save | “Configured”; redirect URI shown as `http://127.0.0.1:47821/api/google/oauth/callback` |
| I5 | Client Overview → Connect Google; pick GA4 + GSC; then Sync Google on an audit | Card shows the connected account; audit sources update without using Vercel |
| I5b | On a second client, connect Google and pick the first client's GA4 property | Save is refused and names the client that already uses it |
| I6 | Quit and relaunch | Data persists (clients/projects still present) |
| I7 | Confirm data folder | `%APPDATA%\SEO Turtle Tool\` contains `config.json` and `pg-data\` |

---

*Keep this list in sync when behavior changes. Last updated: Windows desktop (Electron + embedded Postgres), SEO Turtle naming, dashboard KPI tiles, 10-step pipeline + QA/ship-check rewinds, Claude-first AI defaults, strategy.*
