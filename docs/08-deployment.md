# 08 — Deployment Strategy

## Topology

| Component | Service | Notes |
|---|---|---|
| Web app + API routes | **Vercel** | Stateless, scales horizontally for free; PWA assets on CDN |
| DB / Auth / Realtime / Storage | **Supabase** | One project per environment |
| Payments | **Stripe** | Webhooks → Vercel route handler |
| Errors / monitoring | Sentry + Vercel Analytics | Flag-gated |

## Environments

```
local      → supabase start (Docker) + next dev          .env.local
preview    → Vercel preview per PR + supabase branch DB  ephemeral
staging    → staging.<domain>   + dedicated Supabase     mirrors prod config
production → app.<domain>       + production Supabase
```

Secrets live in Vercel env vars / Supabase config — never in the repo.
`.env.example` documents every variable.

## Pipeline (GitHub Actions)

```
PR:    typecheck → lint → unit+coverage → build → e2e → preview deploy
main:  all of the above → migrate staging → deploy staging → smoke e2e
tag:   migrate production (supabase db push) → deploy production → smoke
```

Rules:
- **Migrations are forward-only** and expand/contract: additive change → deploy code
  → contracting cleanup in a later release. Never break the running version.
- Deploys are instant-rollback (Vercel immutable deployments). DB rollbacks are
  *new* forward migrations.
- Risky features ship dark behind flags in `feature_flags`; release = flip flag,
  rollback = flip back. No redeploy.

## Release cadence

Trunk-based: short-lived branches → squash to `main` (auto-staging) → tagged release
to production. Conventional Commits drive the changelog.

## PWA

`manifest.webmanifest` + service worker (next-pwa or hand-rolled at Phase 2):
app-shell caching, offline practice with the bundled catalog, background sync of
queued sessions when connectivity returns (offline queue already implied by the
repository interface).

## Capacity & cost guardrails

Leaderboard queries paginate via keyset cursors (no OFFSET) · weekly boards served
from a materialized view refreshed by a scheduled function · rate limits on all
write endpoints · `analytics_events` exported and truncated monthly.
