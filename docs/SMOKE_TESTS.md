# Smoke tests

Manual checks before calling a milestone done. Run locally first; after hosting, run the **Hosted** and **Login gate** sections.

**Prereqs (local):** Postgres up (`npm run db:start` if needed), `npm run db:setup` once, `npm run dev`, `.env` has `DATABASE_URL` and `APP_ENCRYPTION_KEY`.  
Leave `APP_PASSWORD` empty locally unless testing the login gate.  
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

## E. Documentation in the app

| # | Steps | Pass if |
|---|--------|---------|
| E1 | Footer **Documentation** link | Opens `/documentation` with how-to guide |
| E2 | From Documentation, open User stories | `/stories` renders acceptance criteria |
| E3 | Skim how-to vs Epic 1–7 / 8 login | Matches current product behavior |

## F. Hosted (Vercel + Supabase)

| # | Steps | Pass if |
|---|--------|---------|
| F1 | Open production URL (after login if gated) | App loads against Supabase |
| F2 | Start a step-by-step project (mock) | Completes **without** any Railway/worker service |
| F3 | Save Anthropic key; enable one step; regenerate | Claude step works on Vercel alone |
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

*Keep this list in sync when behavior changes. Last updated: login gate, in-app Documentation, Vercel-only inline jobs.*
