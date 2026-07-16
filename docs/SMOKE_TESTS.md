# Smoke tests

Manual checks before calling a milestone done. Run locally first; after hosting, run the **Hosted** section.

**Prereqs (local):** Postgres up (`npm run db:start` if needed), `npm run db:setup` once, `npm run dev`, `.env` has `DATABASE_URL` and `APP_ENCRYPTION_KEY`.  
No separate worker required for normal Start / Approve / Regenerate.

---

## A. Core app

| # | Steps | Pass if |
|---|--------|---------|
| A1 | Open `/` | Dashboard loads (or DB unavailable message if Postgres is down) |
| A2 | Create a client with tone + words to avoid | Client appears on `/clients` |
| A3 | Edit that client | Changes persist |
| A4 | New project: topic, keyword, URL, notes, step-by-step | Project opens; Start pipeline available |

## B. Inline job execution

| # | Steps | Pass if |
|---|--------|---------|
| B1 | Start pipeline with **only** `npm run dev` (no worker) | Brief artifact appears when the request finishes |
| B2 | Approve Brief | Next step runs and sidebar advances |
| B3 | Open an earlier step | History banner; can return to current step |
| B4 | Regenerate a step with feedback | New version badge; downstream superseded as designed |
| B5 | Full-auto project (mock slots) | All 9 steps complete in one Start request |
| B6 | (Optional) Full-auto with several Claude slots | Completes **or** fails clearly if over time limit — prefer step-by-step on Vercel |

## C. Pipeline UX

| # | Steps | Pass if |
|---|--------|---------|
| C1 | Open any stage on a project | Short **description** of what the stage does is visible |
| C2 | Check sidebar + header | **Using: Mock** (or **Using: Claude · model**) matches Settings |
| C3 | Approve SEO only (step-by-step) | Final is **not** auto-approved |
| C4 | Complete Final, then reopen Outline | Can view Outline without losing project |

## D. BYO Claude (`/settings/models`)

| # | Steps | Pass if |
|---|--------|---------|
| D1 | Page loads without API key | “Not connected”; step toggles disabled or warn to connect |
| D2 | Paste invalid key → Test connection | Clear failure message |
| D3 | Paste valid Anthropic API key → Save → Test | Connected ····last4; test OK |
| D4 | Enable Draft (or Brief) with a Claude model → Save | Badge shows Claude · model id |
| D5 | Run/regenerate that step on a project | Artifact is real Claude JSON (not mock copy); billed to your API account |
| D6 | Disable the slot → Save → regenerate | Mock output again |
| D7 | Disconnect key | Connected badge clears; enabled steps fail clearly if run without a key |

## E. Docs / orphan page

| # | Steps | Pass if |
|---|--------|---------|
| E1 | Open `/stories` | User stories render (not in main nav) |
| E2 | Skim Epic 6 & 11 | Match inline jobs + Vercel-only hosting |

## F. Hosted (when deploy is done)

| # | Steps | Pass if |
|---|--------|---------|
| F1 | Hit Vercel URL | Blocked by **Deployment Protection** until authorized |
| F2 | After unlock, open `/` | App loads against Supabase |
| F3 | Start a step-by-step project (mock) | Completes **without** any Railway/worker service |
| F4 | Save Anthropic key; enable one step; regenerate | Claude step works on Vercel alone |
| F5 | Confirm only Vercel has `DATABASE_URL` + `APP_ENCRYPTION_KEY` | No second host required |

---

*Keep this list in sync when behavior changes. Last updated for Vercel-only inline execution.*
