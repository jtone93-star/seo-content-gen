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

## Checklist

### 1. Supabase

- [ ] Create project; copy Postgres connection string
- [ ] Run `npx prisma migrate deploy` against cloud DB

### 2. Env on Vercel

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Supabase Postgres |
| `APP_ENCRYPTION_KEY` | Encrypt/decrypt BYO Anthropic key |

### 3. Vercel

- [ ] Import repo; Next.js build
- [ ] Add env vars above
- [ ] Enable **Deployment Protection**
- [ ] Deploy
- [ ] Confirm Start pipeline completes without a separate worker

### 4. Smoke

Run the **Hosted** section in [SMOKE_TESTS.md](./SMOKE_TESTS.md).
