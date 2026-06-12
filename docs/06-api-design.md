# 06 — API Design

## Access strategy

Three lanes, by trust level:

1. **Direct Supabase reads (RLS-guarded)** — own progress, own stats, public
   leaderboard views. Cheap, cached by TanStack Query.
2. **Route handlers `/api/v1/*`** — anything that *awards* or *ranks*: XP, run
   submission, match lifecycle, billing. Server validates, then writes with service
   role inside Postgres functions (transactional).
3. **Supabase Realtime** — match channels (`match:{id}`) and presence. Not REST.

## Conventions

- Versioned base path `/api/v1`. JSON bodies validated with Zod schemas shared
  between client and server (`features/*/schemas.ts`).
- Errors: RFC 7807 `application/problem+json` — `{ type, title, status, detail }`.
- Auth: Supabase JWT in cookies; handlers resolve the user via `@supabase/ssr`.
- Idempotency: run/match submissions accept a client-generated UUID primary key;
  retries are upserts that no-op.
- Rate limits (token bucket, per user): submissions 30/min, reads 300/min.

## Endpoints

### Learning
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/sessions` | Submit a practice session: drill results → server grades, updates `card_states`, awards XP via `award_xp()` |
| `GET`  | `/api/v1/reviews?domain=win11&limit=20` | Due review queue (server-computed) |

### Arena
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/runs` | Submit run with event timeline. Server re-scores the timeline, rejects impossible inputs (reaction < 80ms floor, non-monotonic timestamps), inserts immutable row, awards XP |
| `GET`  | `/api/v1/leaderboards/{domain}/{mode}?period=weekly\|alltime&cursor=` | Public leaderboard page |
| `GET`  | `/api/v1/me/records?domain=win11` | Personal bests per mode |

### Multiplayer (Phase 3)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/matches` | Create/join queue → returns `match` with seed + Realtime channel name |
| `POST` | `/api/v1/matches/{id}/result` | Each client reports; server reconciles both timelines, finalizes, updates Glicko-2 transactionally |

### Billing (Phase 5)
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/billing/checkout` | Create Stripe Checkout session |
| `POST` | `/api/v1/billing/portal` | Customer portal link |
| `POST` | `/api/v1/webhooks/stripe` | Webhook → mirror into `subscriptions` (signature-verified, idempotent by event id) |

### Coach (Phase 5, optional — feature-flagged)
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/coach/plan` | Personalized training plan (falls back to rule-based when AI flag off) |
| `GET` | `/api/v1/coach/insights` | Strengths/weaknesses analysis |

## Anti-cheat model (summary)

Client measures, server judges. Every scored submission carries the full event
timeline; the server recomputes score from the timeline and uses *its* number.
Heuristics (reaction floor, inter-event gaps, duration vs wall clock) flag runs into
a quarantine state excluded from leaderboards pending review. Ranked matches
additionally compare both players' timelines against the shared seed.

## Example

```http
POST /api/v1/runs
Content-Type: application/json

{
  "id": "9b2f…",                     // client UUID (idempotency)
  "domain": "win11", "mode": "sprint",
  "startedAt": 1760000000000, "durationMs": 60000,
  "events": [
    { "shortcutId": "win11.win-e", "promptAt": 0,    "answeredAt": 412,  "correct": true  },
    { "shortcutId": "win11.win-i", "promptAt": 1612, "answeredAt": 2230, "correct": false }
  ]
}

201 → { "runId": "9b2f…", "score": 8420, "accuracy": 0.94,
        "avgReactionMs": 488, "consistency": 0.81, "xpAwarded": 120,
        "personalBest": true }
```
