# Feature backlog

Features we have agreed we want but have not built. Add new ideas at the bottom; move an item out when it ships.

| # | Feature | Status |
|---|---------|--------|
| 1 | Google data on the client dashboard | Not started |
| 2 | Google Business Profile section | Not started |

---

## 1. Google data on the client dashboard

**What:** The client dashboard (`/clients/[id]/dashboard`) shows numbers from the client's own Google connection: Analytics and Search Console.

**Why:** The client's Google account is now connected on their Overview, but the dashboard does not use it. Its performance numbers come from goals that are synced from the last audit, so they only move when a new audit is run and synced.

**Notes:**

- The connection, account, GA4 property, and Search Console site are already stored per client (`OAuthAccount`, set on Overview → Google data).
- Today Google data is only fetched when **Sync Google** is pressed on an audit (`/api/audits/[id]/sources/google`). This feature needs a way to pull the same data for a client without an audit.
- Decide what the client sees: which numbers, over what period, and whether they refresh on page load or on a schedule.
- The Performance tab could use the same direct pull so the operator and client views stay in step.

## 2. Google Business Profile section

**What:** A section for the client's Google Business Profile (the local listing shown in Search and Maps).

**Why:** Local visibility matters for small-business clients, and it is not covered by Analytics or Search Console.

**Notes:**

- Scope is open: where the section lives (client hub tab, Overview card, or client dashboard) and what it shows (for example views, calls, direction requests, reviews).
- It would use the client's existing Google connection, but needs an extra Google permission for Business Profile, so each client would sign in again once.
- Google requires approval to use the Business Profile API; apply for access before building.
