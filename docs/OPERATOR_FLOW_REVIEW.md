# Operator flow review (internal delivery)

Review of the **current** SEO Turtle operator path for delivering SMB SEO work. Implement P0 items only after agreement; P1 can wait.

## Intended job

You run diagnostics and planning, then execute content/tech work. Clients later see a simplified portal (see [CLIENT_PORTAL.md](./CLIENT_PORTAL.md)). This app stays the **cockpit**.

## Current path (as built)

```text
Clients → create/edit profile (voice, SEO notes, billing day)
   → Client hub Overview (this month, next month, backlog)
   → Audits: new audit → connect Google (optional) → run stages → export findings
   → Strategy: create living plan → KPIs → generate recs → approve to Backlog
   → This month / Next month (auto from billing day) → add backlog items
   → This month: start content or export tech package
   → Content project: pipeline approve/regenerate → Final export
```

Primary surfaces: [`src/components/clients/client-hub.tsx`](../src/components/clients/client-hub.tsx), audit pipeline, [`src/components/strategy/strategy-panel.tsx`](../src/components/strategy/strategy-panel.tsx), project pipeline.

## Friction found

| # | Friction | Why it hurts delivery |
|---|----------|------------------------|
| F1 | Overview is mostly counts, not “what to do this month” | Extra clicks into Strategy/Audits to find the real next action |
| F2 | Many hops from approved recommendation → started work | Approve → find cycle → assign → Start |
| F3 | AI settings historically multi-stage (now simplified) | Setup tax; Claude-first defaults address this |
| F4 | Operator and future client share the same dense hub language | Risk of showing clients pipeline guts if you share the URL |
| F5 | “Client-ready” vs “internal draft” not labeled on findings/content | Harder to know what is safe to send or publish |
| F6 | Full-auto + many live Claude steps can timeout on Vercel | Prefer step-by-step for hosted live runs |

## Punch list

### P0 — addressed by the three-lane cockpit

1. **Operator Overview home** — Overview shows this month, next month, and backlog.
2. **Faster start from backlog** — Add to this month, then Start content or mark tech in progress.
3. **Keep AI settings as setup-only** — `/settings/models` is Claude key + one model.

### P1 — later

4. **Client-ready flag** — Mark audit findings pack / Final content / cycle summary as “ready to share” vs internal.
5. **Separate client route** — Read-only `/portal/[token]` or `/clients/[id]/share` (see portal doc); do not soften the full hub into dual-mode without a dedicated surface.
6. **Desktop default for heavy runs** — Prefer desktop/local for long live Claude batches when Vercel timeouts bite.
7. **Template monthly package** — One export that bundles: KPI snapshot + top priorities + content status + tech list for email/PDF to the client until the portal exists.

## Non-goals (this review)

- SMB self-serve signup / Stripe
- Deleting Gemini executor code
- Replacing the audit or content engines

## Suggested validation

Run one dry client end-to-end with Mock, then one live Claude Sonnet pass on a real (or sandbox) site. Note every time you leave Overview to “figure out what’s next” — those become Overview widgets.
