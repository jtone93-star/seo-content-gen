# Deploy

Hosting target: **Vercel-only** for the app. Pipeline jobs run **inside** the Start / Approve / Regenerate API routes (no separate always-on worker required).

Access control for MVP: **app password gate** (`APP_PASSWORD`) — works on Hobby. Vercel’s paid Password Protection is optional and not required.

## Architecture (hosted)

```text
You → /login (APP_PASSWORD) → Next.js on Vercel
                                    │
                                    │ start / approve / regenerate
                                    │ (enqueue + run in same request)
                                    ▼
                               Supabase Postgres
                                    │
                               Anthropic API (BYO key)
```

`maxDuration` on those routes is **300s** (needs a Vercel plan that allows it). Step-by-step is the sweet spot. Full auto + Claude on all 9 steps may still hit timeouts — prefer step-by-step on Vercel, or enable Claude only on a few steps.

Optional: `npm run worker` still exists for local draining of leftover PENDING jobs; it is **not** required for normal Start/Approve/Regenerate.

## Current handoff (July 17, 2026)

Completed:

- GitHub: `https://github.com/jtone93-star/seo-content-gen` (`master`)
- Supabase project + migrations + seed applied
- Vercel project connected; `DATABASE_URL`, `DIRECT_URL`, `APP_ENCRYPTION_KEY` set
- App-level login gate shipped (`APP_PASSWORD` via `src/proxy.ts`)
- In-app **Documentation** at `/documentation` (footer link)

Resume / verify:

1. Set **`APP_PASSWORD`** on Vercel (Production) → Redeploy
2. Open the live URL in incognito → should hit `/login`
3. Sign in → run hosted smoke tests ([SMOKE_TESTS.md](./SMOKE_TESTS.md) § F + G)
4. Optionally connect Claude on hosted `/settings/models`

## Checklist

### 1. Supabase

- [x] Create project; copy Postgres connection string templates
- [x] Run `npx prisma migrate deploy` against cloud DB
- [x] Run `npx tsx prisma/seed.ts`

### 2. Env on Vercel

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Supabase transaction pooler (`6543`, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase session pooler (`5432`) for migrations |
| `APP_ENCRYPTION_KEY` | Encrypt/decrypt BYO Anthropic key + sign session cookie |
| `APP_PASSWORD` | Shared login password (gate **off** if unset) |

Local one-time DB setup (PowerShell — use **single quotes** if the DB password has `$` or `+`; URL-encode those chars):

```powershell
$env:DIRECT_URL='postgresql://...:ENCODED_PASSWORD@...pooler.supabase.com:5432/postgres'
$env:DATABASE_URL='postgresql://...:ENCODED_PASSWORD@...pooler.supabase.com:6543/postgres?pgbouncer=true'
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

Do not save real database passwords in tracked files.

### 3. Vercel

- [x] Import repo; Next.js build
- [x] Add `DATABASE_URL`, `DIRECT_URL`, `APP_ENCRYPTION_KEY`
- [ ] Add **`APP_PASSWORD`** and redeploy
- [ ] Confirm incognito requires `/login`
- [ ] Confirm Start pipeline completes without a separate worker

### 4. Smoke

Run the **Hosted** and **Login gate** sections in [SMOKE_TESTS.md](./SMOKE_TESTS.md).

## App password gate (details)

- Implemented with Next.js **`proxy.ts`** (middleware rename in Next 16).
- Public: `/login`, `/api/auth/login`, `/api/auth/logout`.
- Session: HTTP-only cookie (`cg_session`) = HMAC of password (keyed by `APP_ENCRYPTION_KEY`).
- Changing `APP_PASSWORD` invalidates old cookies after redeploy.
- Leave `APP_PASSWORD` empty locally to keep the app open during development.

**Note:** Hobby Vercel Authentication does **not** lock the production domain. Use `APP_PASSWORD` for real protection on free tier.
