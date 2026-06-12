# ADR-0005: Progress persistence behind a repository interface; local-first v1

**Status:** Accepted · 2026-06-11

## Context
Phase 1 ships without mandatory accounts (zero-friction trial is a growth lever);
Phase 2 adds Supabase sync. Engines must not care where state lives. Cloud writes
that affect rankings need server validation regardless.

## Decision
`features/progress` defines `ProgressRepository` (card states, XP events, streak
data, personal bests). Two implementations: `LocalProgressRepository`
(localStorage, versioned schema, ships now) and `SupabaseProgressRepository`
(Phase 2). React context provides the active one; a migration routine uploads local
state on first sign-in.

## Consequences
- The entire learning loop works offline and signed-out (also satisfies the PWA goal).
- Tests inject an in-memory fake — no storage mocks.
- Anti-cheat boundary stays clean: local data is *personal*; anything entering
  leaderboards goes through validated API routes (ADR-0006 territory).
