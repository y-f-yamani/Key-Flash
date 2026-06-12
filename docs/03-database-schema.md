# 03 — Database Schema

Postgres on Supabase. **User data only** — the shortcut catalog ships as versioned
code (see ADR-0002); the DB references shortcuts by stable string id.

The canonical, executable definition lives in
[`supabase/migrations/0001_initial.sql`](../supabase/migrations/0001_initial.sql).

## ERD

```
auth.users (Supabase)
   │ 1:1
   ▼
profiles ──────────────┐
   │ 1:1               │ 1:N
   ▼                   ▼
user_stats        xp_events (append-only ledger)
   │
   │ 1:N (user_id, shortcut_id)
   ▼
card_states ── shortcut_id ──► [catalog in code: src/content]
   │
   │ 1:N
   ▼
drill_results (sampled / aggregated)

profiles 1:N arena_runs ──► leaderboard views
profiles 1:N user_achievements   (criteria live in code)
profiles 1:N daily_activity      (streak + daily goal projection)
profiles 1:1 subscriptions       (Stripe mirror)
profiles 1:N match_players N:1 matches
profiles 1:1 ratings (per domain)
analytics_events (append-only, partitioned by month at scale)
```

## Tables

| Table               | Purpose | Key columns |
|---------------------|---------|-------------|
| `profiles`          | Public identity, 1:1 with `auth.users` | `id (uuid PK→auth.users)`, `username citext UNIQUE`, `display_name`, `locale`, `country`, `created_at` |
| `user_stats`        | Projection: level, totals, streaks | `user_id PK`, `total_xp`, `level`, `current_streak`, `longest_streak`, `last_active_date`, `timezone` |
| `xp_events`         | Append-only XP ledger (audit, recompute) | `id`, `user_id`, `amount > 0`, `source`, `source_id`, `created_at` |
| `card_states`       | SRS state per (user, shortcut) | `user_id`, `shortcut_id text`, `ease`, `interval_days`, `due_at`, `reps`, `lapses`, `attempts`, `correct`, `best_ms`, `avg_ms` — PK `(user_id, shortcut_id)` |
| `practice_sessions` | Session summaries for analytics | `id`, `user_id`, `domain_slug`, `kind`, `drills`, `correct`, `xp_earned`, `duration_ms`, `started_at` |
| `arena_runs`        | Immutable scored runs | `id`, `user_id`, `domain_slug`, `mode`, `score`, `accuracy`, `avg_reaction_ms`, `consistency`, `max_combo`, `duration_ms`, `timeline jsonb`, `client_version`, `created_at` |
| `daily_activity`    | One row per active day (streak source of truth) | `(user_id, activity_date) PK`, `xp_earned`, `goal_xp`, `goal_met` |
| `user_achievements` | Unlock records | `(user_id, achievement_code) PK`, `unlocked_at` |
| `ratings`           | Glicko-2 per domain | `(user_id, domain_slug) PK`, `rating`, `rd`, `volatility`, `tier`, `season` |
| `matches`           | 1v1 duels | `id`, `domain_slug`, `mode`, `seed`, `status`, `started_at`, `finished_at` |
| `match_players`     | Per-player match outcome | `(match_id, user_id) PK`, `score`, `accuracy`, `placement`, `rating_before`, `rating_after` |
| `subscriptions`     | Stripe mirror (webhook-written) | `user_id PK`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end` |
| `feature_flags`     | Runtime flags | `key PK`, `enabled`, `audience jsonb` |
| `analytics_events`  | Append-only product events | `id`, `user_id NULL`, `name`, `props jsonb`, `created_at` |

## Design decisions

1. **Ledgers over mutable counters.** `xp_events` is the source of truth; `user_stats`
   is a projection updated transactionally (`award_xp()` function) and always
   recomputable. Same philosophy for `daily_activity` → streaks.
2. **Stable string shortcut ids** (`win11.win-e`) decouple user data from catalog
   storage and survive catalog refactors.
3. **Immutable runs/matches.** No UPDATE policies on `arena_runs`; anti-cheat
   re-validation happens before insert (server-side), `timeline` retained for audit.
4. **RLS everywhere.** Default deny. Users `SELECT/INSERT` own rows;
   leaderboards exposed via `SECURITY DEFINER` functions / views that return only
   public columns; writes that affect rankings go through route handlers using the
   service role after validation.
5. **Timezone-correct streaks.** `daily_activity.activity_date` is computed in the
   user's IANA timezone (stored on `user_stats`), not UTC.
6. **Partition-ready.** `analytics_events` and `xp_events` keyed by `created_at`,
   ready for monthly partitioning when volume demands.

## Indexes (high-traffic paths)

- `card_states (user_id, due_at)` — review queue.
- `arena_runs (domain_slug, mode, score DESC)` — leaderboards;
  `(user_id, mode, created_at DESC)` — personal history/records.
- `xp_events (user_id, created_at)` — profile history.
- `ratings (domain_slug, rating DESC)` — ranked ladder.
