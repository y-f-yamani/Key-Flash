# ADR-0001: Modular monolith with a framework-free core

**Status:** Accepted · 2026-06-11

## Context
We need 10-year maintainability, multi-domain expansion (Office, VS Code…), and
eventually realtime multiplayer at scale — but we are pre-launch.

## Decision
One Next.js deployable, organized as feature-based vertical slices over a pure
TypeScript `src/core` with an enforced inward dependency rule
(`app → features → core/content/lib`). No microservices.

## Consequences
- Engines (keyboard, SRS, scoring, gamification) are unit-testable without mocks and
  reusable in workers/mobile later.
- Any slice (e.g. multiplayer) can be extracted to a service later because it only
  talks to `core` contracts.
- Cost: discipline required; ESLint `no-restricted-imports` guards the boundary.
