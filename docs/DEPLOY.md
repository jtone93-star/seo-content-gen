# Deploy

Hosting target: **Vercel-only** for the app. Pipeline jobs run **inside** the Start / Approve / Regenerate API routes (no separate always-on worker required).

Access control for MVP: **Vercel Deployment Protection** (app has no login yet).

## Architecture (hosted)

```text
You → Vercel Protection → Next.js on Vercel
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

## Current handoff (July 16, 2026)

Completed:

- GitHub repository created and pushed: `https://github.com/jtone93-star/seo-content-gen`
- Current branch: `master`
- Supabase account/project created and connected to the repository
- Supabase connection formats identified:
  - Runtime transaction pooler: port `6543` with `?pgbouncer=true`
  - Migration session pooler: port `5432`
- Prisma config updated to prefer `DIRECT_URL` for migrations

Resume here:

1. Replace `[YOUR-PASSWORD]` locally/Vercel with the Supabase database password. Never commit or paste the completed URLs into docs/chat.
2. Create/import the GitHub repository as a Vercel project.
3. Add these Vercel environment variables for Production (and Preview if desired):
   - `DATABASE_URL` — Supabase transaction pooler, port `6543`, ending in `?pgbouncer=true`
   - `DIRECT_URL` — Supabase session pooler, port `5432`
   - `APP_ENCRYPTION_KEY` — a generated base64 32-byte key
4. Apply migrations and seed Supabase from a local PowerShell session.
5. Enable Vercel Deployment Protection, deploy, and run hosted smoke tests.

## Checklist

### 1. Supabase

- [x] Create project; copy Postgres connection string templates
- [ ] Run `npx prisma migrate deploy` against cloud DB

### 2. Env on Vercel

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Supabase transaction pooler (`6543`, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase session pooler (`5432`) for migrations |
| `APP_ENCRYPTION_KEY` | Encrypt/decrypt BYO Anthropic key |

Run the one-time database setup from the project folder:

```powershell
$env:DIRECT_URL="<Supabase session-pooler URL>"
$env:DATABASE_URL="<Supabase transaction-pooler URL>"
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

Do not save real database passwords in tracked files.

### 3. Vercel

- [ ] Import repo; Next.js build
- [ ] Add env vars above
- [ ] Enable **Deployment Protection**
- [ ] Deploy
- [ ] Confirm Start pipeline completes without a separate worker

### 4. Smoke

Run the **Hosted** section in [SMOKE_TESTS.md](./SMOKE_TESTS.md).
