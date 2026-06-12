# KeyMaster — Master Windows 11 Keyboard Shortcuts

The definitive platform for keyboard-shortcut mastery: interactive lessons,
spaced repetition, real keyboard detection, and a competitive speed arena.
Launching with **Windows 11**, architected to expand to Office, VS Code, Chrome,
Photoshop, AutoCAD, Linux and macOS.

> Duolingo's learning loop · Brilliant's interactivity · Monkeytype's speed culture ·
> Chess.com's competition.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /en
```

No environment variables are required — Phase 1 is local-first (progress lives
in localStorage behind a repository interface; see ADR-0005).

## Commands

| Command                 | Purpose                                  |
|-------------------------|------------------------------------------|
| `npm run dev`           | Dev server                               |
| `npm run build`         | Production build                         |
| `npm run lint`          | ESLint (includes architecture boundary)  |
| `npm run typecheck`     | `tsc --noEmit`                           |
| `npm run test`          | Vitest watch mode                        |
| `npm run test:run`      | Unit + component tests (CI mode)         |
| `npm run test:coverage` | Tests + coverage gate on `src/core`      |
| `npm run e2e`           | Playwright E2E (`npx playwright install` first) |

## What's implemented (Phase 1)

- **Windows 11 catalog** — 67 shortcuts across 8 categories, fully localized
  (English + Arabic), difficulty-tiered, with browser-capturability metadata.
- **Real keyboard detection** — physical-key (`event.code`) chord matching,
  multi-step sequences, sub-millisecond reaction timing, and a practice remap
  for the browser-reserved Win key (ADR-0004).
- **Learn** — category skill tree → derived lessons → live-capture drills
  (recall quizzes for non-capturable shortcuts).
- **Practice** — SM-2 spaced repetition with grades derived from measured
  performance, not self-reporting.
- **Speed Arena** — Shortcut Sprint: 60 seconds, combo-multiplied scoring,
  accuracy/reaction/consistency stats, personal records.
- **Gamification** — XP ledger, levels, daily streaks (timezone-correct).
- **i18n + RTL** — `/en` and `/ar` routes, full right-to-left layout.
- **Dark/light themes**, PWA manifest, desktop-first responsive UI.

## Phase 2 (cloud — ships dark until Supabase env vars are set)

- **Auth** — email magic link + Google/GitHub OAuth (`/sign-in`, `/auth/callback`).
- **Cloud sync** — signed-in progress mirrors to Supabase (`card_states`,
  `user_stats`, `daily_activity`) with diff-based upserts; local progress
  merges into the cloud on first sign-in (never loses XP, keeps stronger
  cards/streaks/records).
- **Run submission API** — `POST /api/v1/runs`: Zod-validated, server
  re-scores the timeline, quarantines implausible runs (reaction floor,
  overlapping events, tampered duration), awards XP via `award_xp()`.
- **Global leaderboard** — `/arena/leaderboard` via the security-definer
  `leaderboard()` function.

Without `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` every cloud
surface hides itself and the app stays fully local-first. To go live: create a
Supabase project, run `supabase db push`, set the env vars (see
`.env.example`), enable the OAuth providers in the Supabase dashboard.

## Architecture in one paragraph

A modular monolith: Next.js App Router routes are thin shells over
feature slices (`src/features/*`), which compose pure TypeScript engines
(`src/core/*` — keyboard, SRS, scoring, gamification, content contracts) and a
versioned content catalog (`src/content/*`). `src/core` imports nothing from
React/Next (ESLint-enforced), making every rule unit-testable and reusable.
Persistence hides behind `ProgressRepository` (localStorage today, Supabase in
Phase 2 — schema already in `supabase/migrations/`).

## Documentation

| Doc | Contents |
|---|---|
| [docs/01-product-architecture.md](docs/01-product-architecture.md) | Layers, runtime topology, scalability, observability |
| [docs/02-domain-model.md](docs/02-domain-model.md) | Bounded contexts, entities, invariants |
| [docs/03-database-schema.md](docs/03-database-schema.md) | ERD + design decisions (SQL in `supabase/migrations/`) |
| [docs/04-folder-structure.md](docs/04-folder-structure.md) | Layout + dependency rules |
| [docs/05-feature-breakdown.md](docs/05-feature-breakdown.md) | Phased roadmap to multiplayer, simulator, AI coach |
| [docs/06-api-design.md](docs/06-api-design.md) | REST surface, anti-cheat model, realtime lanes |
| [docs/07-testing-strategy.md](docs/07-testing-strategy.md) | Test pyramid, coverage gates, CI |
| [docs/08-deployment.md](docs/08-deployment.md) | Environments, pipeline, migrations, PWA |
| [docs/adr/](docs/adr/) | Architecture Decision Records |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: respect the
dependency rule, keep files under ~300 lines, every engine change ships with
tests, and content changes must pass the catalog validation suite.
