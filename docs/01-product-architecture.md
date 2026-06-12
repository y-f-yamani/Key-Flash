# 01 — Product Architecture

## Product

**KeyMaster** (working title) — the definitive platform for mastering keyboard shortcuts,
launching with **Windows 11** and architected to expand to Office, VS Code, Chrome,
Photoshop, AutoCAD, Linux and macOS with minimal changes.

Think: *the Chess.com of Windows productivity* — Duolingo's learning loop,
Brilliant's interactivity, Monkeytype's speed culture, Chess.com's competition.

## Architectural style

**Modular monolith** on Next.js with **Clean Architecture** layering and
**feature-based vertical slices**. We deliberately avoid microservices at this stage:
one deployable, strict internal boundaries, extraction possible later.

```
┌─────────────────────────────────────────────────────────────────┐
│  src/app — Next.js App Router (routes, layouts, locale shells)  │  thin
├─────────────────────────────────────────────────────────────────┤
│  src/features — vertical slices (practice, arena, simulator,    │  UI + hooks +
│  progress, multiplayer, billing, profile)                       │  feature services
├─────────────────────────────────────────────────────────────────┤
│  src/core — pure TypeScript domain logic                        │  ZERO framework
│  keyboard · srs · gamification · scoring · content contracts    │  dependencies
├─────────────────────────────────────────────────────────────────┤
│  src/content — versioned shortcut catalogs & lesson data        │  pure data
├─────────────────────────────────────────────────────────────────┤
│  src/lib — cross-cutting: i18n, config, persistence adapters,   │  infrastructure
│  supabase client, feature flags, analytics                      │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency rule

Dependencies point **inward only**: `app → features → core/content/lib`.
`src/core` imports nothing from React, Next.js, Supabase or the DOM.
This is enforced by ESLint import rules and is what makes the engines unit-testable
and reusable (e.g. in a future mobile app or worker).

### The platform abstraction (multi-domain expansion)

Everything that is "Windows 11" lives in **one content package** conforming to the
`ShortcutDomain` contract defined in `src/core/content`:

```ts
ShortcutDomain { slug, names, categories, shortcuts: ShortcutDefinition[] }
ShortcutDefinition { id, keys: KeyChord[], names, descriptions, difficulty, capturable }
```

The trainer, SRS engine, arena, scoring, XP and leaderboards operate **only on these
contracts** — never on Windows-specific data. Adding "VS Code" later means adding
`src/content/domains/vscode/` and registering it; no engine or UI changes.

### AI isolation

AI features (training-plan generation, adaptive difficulty, weakness analysis) sit
behind interfaces in `src/core/ai-contracts` with implementations in
`src/features/coach`. Every consumer takes the interface as an optional dependency
and has a non-AI default (e.g. rule-based difficulty ramp). Deleting the `coach`
feature folder leaves the platform fully functional. AI calls are server-side only,
behind a feature flag, never on the hot input path.

## Runtime topology

```
Browser (Next.js client, PWA)
  ├─ Key-capture engine (client-only, zero-latency, pure TS)
  ├─ TanStack Query → Next.js Route Handlers (/api/v1/*)        ← business writes
  ├─ Supabase JS (RLS-guarded reads: own progress, leaderboards) ← cheap reads
  └─ Supabase Realtime (WebSocket channels)                      ← multiplayer
Next.js (Vercel)
  ├─ Route handlers: XP awards, run submission, match lifecycle, Stripe webhooks
  └─ Server-side validation of all scores (anti-cheat: server recomputes/clamps)
Supabase
  ├─ Postgres (RLS on every user table)
  ├─ Auth (email, OAuth)
  ├─ Realtime (match channels, presence)
  └─ Edge functions (scheduled: leaderboard refresh, streak repair, season rollover)
Stripe — subscriptions, webhooks → subscriptions table
```

### Why latency-critical logic is client-side

Reaction-time measurement must be sub-millisecond-accurate; it runs entirely in the
browser with `performance.now()`. The server never trusts client scores blindly:
run submissions include per-event timelines that the server sanity-checks
(monotonic timestamps, human-possible reaction floors, rate limits).

## Scalability posture (designed-in, enabled when needed)

| Concern            | v1 mechanism                                   | Scale path                        |
|--------------------|------------------------------------------------|-----------------------------------|
| Caching            | TanStack Query + Next.js route caching         | Redis/Upstash for hot leaderboards|
| Rate limiting      | Per-route token bucket (middleware)            | Upstash Ratelimit                 |
| Feature flags      | `lib/flags` (env + DB table)                   | Vendor (e.g. PostHog) behind same interface |
| Background jobs    | Supabase scheduled edge functions              | Queue (pgmq / Inngest) behind `JobQueue` interface |
| Events             | `analytics_events` append-only table           | Event bus / warehouse export      |
| Realtime           | Supabase Realtime channels                     | Dedicated WS service if needed    |
| Horizontal scaling | Stateless Next.js on Vercel (free)             | —                                 |

## Observability

- **Structured logging**: `lib/logger` — JSON logs, request IDs, no `console.log` in app code.
- **Error handling**: typed `Result<T, E>` in core; error boundaries per feature; route handlers map domain errors → RFC 7807 problem responses.
- **Monitoring/tracing**: Vercel + Sentry (flagged); spans around route handlers.
- **Audit**: `xp_events` and `analytics_events` are append-only ledgers — XP and ratings are always recomputable.

## i18n & RTL

Locale is a routing segment (`/en/...`, `/ar/...`). Dictionaries are typed TS modules.
`<html dir>` flips for Arabic; Tailwind logical properties (`ms-*`, `pe-*`) are used
instead of left/right throughout. Shortcut *keys* are never translated; names and
descriptions are.
