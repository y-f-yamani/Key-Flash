# ADR-0004: Browser-reserved shortcuts — capturability flags + Meta remap

**Status:** Accepted · 2026-06-11

## Context
Most Windows shortcuts use the **Win (Meta) key**. Browsers receive `keydown` for
many Win-combos, but the OS still acts on them (Win+E really opens Explorer;
Win+L locks the machine before JS sees anything). `preventDefault()` cannot stop the
OS. A trainer that triggers real OS actions on every drill is unusable.

## Decision
1. Every `ShortcutDefinition` carries `capturable: 'full' | 'partial' | 'none'`.
2. The capture engine supports a **practice modifier remap**: during drills, users
   hold a configurable stand-in for Win (default `Ctrl+Alt`). The UI renders the real
   keys but instructs "use the practice key for ⊞". Muscle-memory transfer is
   imperfect but the chord *shape* and recall are trained; quiz/recall modes use the
   real combo knowledge.
3. `none`-rated shortcuts (Win+L, Ctrl+Alt+Del) are taught via recall/quiz drills only.
4. The Phase-4 simulator uses the same remap, so missions are fully playable in-browser.

## Consequences
- No surprise OS side effects mid-drill; consistent cross-browser behavior.
- Honest UX: we surface *why* the stand-in exists ("browsers can't intercept ⊞").
- The Keyboard Lock API (fullscreen-only, Chromium) can upgrade `partial` shortcuts
  to real capture later behind a flag — engine already abstracts this.
