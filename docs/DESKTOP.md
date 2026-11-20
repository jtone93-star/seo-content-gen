# Desktop app (Windows)

Fully local **SEO Turtle Tool** install for Windows. The Electron shell starts embedded PostgreSQL + the Next.js app on your machine — no Vercel or Supabase required for day-to-day use.

Cloud hosting (Vercel + Supabase) remains supported separately; see [DEPLOY.md](./DEPLOY.md).

## What you get

- NSIS installer (`SEO Turtle Tool-Setup-*.exe` under `release/` after build)
- Local Postgres data under `%APPDATA%\SEO Turtle Tool\pg-data\`
- Encrypted BYO Claude key (same as web; one model for all engines)
- Google Analytics 4 + Search Console via loopback OAuth (your own Google Cloud client)
- Fixed app port **47821** and Postgres port **55432** (so OAuth redirect URIs stay stable)

## Build (developers)

Prereqs: Windows x64, Node 20+, npm.

```powershell
npm install
npm run desktop:dist
```

That runs:

1. `next build` (standalone output)
2. Electron main/preload bundle
3. Standalone asset prep
4. `electron-builder` → Windows NSIS installer in `release/`

Dev loop (Electron + `next dev` against embedded Postgres):

```powershell
npm run desktop:dev
```

## First run (operators)

1. Install from the NSIS setup exe.
2. Launch **SEO Turtle Tool**.
3. Open **AI models**:
   - Optional: save Anthropic API key, pick Live Claude + model (or Mock), Apply everywhere.
   - **Google Analytics & Search Console**: paste your Google Cloud OAuth **Web** client ID and secret.
4. In Google Cloud Console, add this authorized redirect URI (exact):

   `http://127.0.0.1:47821/api/google/oauth/callback`

5. Enable APIs: Google Analytics Data, Google Analytics Admin, Search Console.
6. On each client's **Overview**, use **Connect Google**, pick that client's GA4 property + Search Console site, then use **Sync Google** on an audit.

App password gate is **off** by default on desktop (single-user).

## Where data lives

| Path | Contents |
|------|----------|
| `%APPDATA%\SEO Turtle Tool\config.json` | Encryption key, DB password, Google client ID/secret |
| `%APPDATA%\SEO Turtle Tool\pg-data\` | Embedded Postgres cluster |
| `%APPDATA%\SEO Turtle Tool\logs\` | `migrate.log`, `next.log` |

Uninstalling the app does **not** always delete AppData. To wipe local data, quit the app and delete the folder above.

## Troubleshooting

- **Won’t start:** check `%APPDATA%\SEO Turtle Tool\logs\`.
- **Port in use:** close anything bound to `47821` / `55432`, or reboot.
- **Google redirect mismatch:** redirect URI must be exactly `http://127.0.0.1:47821/api/google/oauth/callback` (not `localhost`).
- **Prisma migrate errors:** ensure the installer included `prisma/migrations` (rebuild with `npm run desktop:dist`).
