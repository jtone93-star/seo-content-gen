# Client portal (planned)

Thin **read-mostly** dashboard for SMB clients. Operator app stays the system of record; the portal shows outcomes, not AI settings or pipeline controls.

**Status:** Design only — not implemented yet.

## Goals

- Let a client see **performance**, the **latest audit summary**, **this month’s work**, and **what is lined up next month**.
- Support the monthly call: you review results and agree the next scope in person. The page is the shared plan, not the meeting.
- Avoid teaching clients how to run SEO software.

## Non-goals (v1)

- Detailed audit evidence and the backlog on the client page
- Client approve / deny of content or tech items (you decide scope on the monthly call)
- Starting audits, regenerating AI, approving pipeline steps
- Model / API key settings
- Stripe / self-serve signup (billing can stay offline)
- Editing strategy recommendations
- Full multi-tenant SaaS accounts

## Auth sketch (v1 recommendation)

**Per-client share link + optional PIN** (magic token on `ClientProfile`).

| Approach | Pros | Cons |
|----------|------|------|
| **Signed URL / opaque token** (recommended v1) | Fast to ship; no email stack | Link leak = access; rotate token if needed |
| Magic link email | Familiar | Needs email provider + more ops |
| Per-client password | Simple mentally | Password reset friction |
| Full user accounts | Proper SaaS | Overkill before product-market fit |

**Decision for v1:** opaque `portalToken` on the client (or related table) + optional 4–6 digit PIN. Operator can “Copy portal link” / “Rotate link” from the hub.

Operator auth remains `APP_PASSWORD` (or desktop open). Portal routes are separate and **must not** expose operator APIs.

## v1 information architecture

```text
Client portal home
  ├── Performance    (goal current vs target)
  ├── Latest audit   (findings summary + a few highlights)
  ├── This month     (current cycle items: title, content or tech, status)
  └── Next month     (next cycle items: title, content or tech)
```

No backlog, no approval buttons, and no pipeline controls. Backlog and the working audit stay in the operator app.

## Data mapping (existing → portal)

| Portal block | Source models / fields | Notes |
|--------------|------------------------|-------|
| Business name | `ClientProfile.name` | Header only; hide voice, CRM notes, and SEO internals |
| This month | Current billing `Cycle` | Label, date range, items |
| Next month | Following billing `Cycle` | Same shape as this month |
| Items | `CycleItem` + `StrategyRecommendation` | Title, content vs tech, status. No instructions dump, no pipeline steps |

## Suggested routes (future)

| Route | Audience | Behavior |
|-------|----------|----------|
| `/portal/[token]` | Client | Read-only dashboard |
| `/portal/[token]/pin` | Client | Optional PIN gate |
| `/clients/[id]` (existing) | Operator | Full hub unchanged |
| `POST /api/clients/[id]/portal-token` | Operator | Create/rotate token |

## Permissions matrix

| Action | Operator | Client portal |
|--------|----------|---------------|
| View this month, next month, performance, and latest audit summary | Yes | Yes |
| View backlog and the full audit | Yes | No |
| Approve or deny work | On the call, not in the app | No |
| Run / approve AI steps | Yes | No |
| Edit profile / billing day | Yes | No |
| Change Claude model | Yes | No |

## UX principles

- Plain language (“What we’re working on this month”), not “CycleItem / FINDINGS_ROLLUP”.
- One primary message: **results, the latest audit, this month, and next month**.
- No cards of model names, mock engines, or regenerate buttons.
- Mobile-friendly; clients will open it on phones.

## Implementation order (when building)

1. Token field + operator “Copy portal link”
2. Read-only page: this month and next month. Operator preview is `/clients/[id]/dashboard` (“Client dashboard” on Overview). A public share link can reuse that same view later.
3. Optional PIN + rotate token
4. Polish / branding

## Relationship to operator P0

Until the portal exists, use a **monthly package export** ([OPERATOR_FLOW_REVIEW.md](./OPERATOR_FLOW_REVIEW.md) P1) as the client deliverable. Portal replaces that email attachment with a live link.
