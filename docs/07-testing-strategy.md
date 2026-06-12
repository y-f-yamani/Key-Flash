# 07 — Testing Strategy

## Pyramid

```
        E2E (Playwright)        — few, critical journeys
      Component (RTL + Vitest)  — interactive surfaces
   Unit (Vitest)                — every core engine, exhaustive
```

The architecture makes this cheap: all difficult logic (matching, SRS, scoring,
XP, streaks, mode rules) is **pure functions in `src/core`** — no mocks, no DOM,
no network. Test effort concentrates where bugs are expensive.

## Unit tests (`src/core/**/*.test.ts`)

- **keyboard**: event→chord normalization, modifier-order independence, sequence
  matching (`Win+X` then `U`), wrong-key/extra-modifier rejection, Meta remapping,
  repeat suppression. Table-driven.
- **srs**: interval growth, lapse handling, ease floor (1.3), due-date math,
  grade derivation from (correct, reactionMs, difficulty).
- **gamification**: XP curve monotonicity, level boundaries, streak day-boundary
  cases (timezones, DST, gap day, same-day repeat), achievement criteria.
- **scoring**: accuracy, mean/median reaction, consistency (CV→0..1), combo
  multipliers, sprint score determinism (same timeline ⇒ same score — the
  anti-cheat invariant).
- **content**: catalog validation — unique ids, valid key codes, every shortcut
  localized in en+ar, lessons reference existing shortcuts. *This turns content
  mistakes into CI failures.*

Coverage gate for `src/core`: **90% lines/branches** (V8 provider).

## Component tests (`src/features/**/*.test.tsx`)

React Testing Library + jsdom. Real keyboard events via `fireEvent.keyDown` /
`userEvent.keyboard` against the trainer: correct chord advances, wrong chord shows
feedback, timer behavior faked with `vi.useFakeTimers()`. Repository injected as
in-memory fake (interfaces make this trivial).

## E2E (`e2e/*.spec.ts`)

Playwright, Chromium-first (desktop-first product). Critical journeys:
landing → learn → complete a drill with real key presses (`page.keyboard`),
sprint run end-to-end, locale switch en↔ar (asserts `dir="rtl"`), dark-mode toggle.
Runs against `next build && next start` in CI.

## What we deliberately don't test

Styling, third-party internals, Next.js routing mechanics. Snapshot tests are
banned (they rot); assert behavior.

## CI gates (every PR)

`typecheck → lint → unit+component (coverage) → build → e2e`. Merge blocked on any
failure. Migrations checked by applying to a disposable Supabase shadow DB.

## Commands

```bash
npm run test          # vitest watch
npm run test:run      # vitest CI mode
npm run test:coverage # + coverage gate
npm run e2e           # playwright
npm run typecheck     # tsc --noEmit
```
