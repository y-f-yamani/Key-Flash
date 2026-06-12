# 02 — Domain Model

## Bounded contexts

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  Content   │  │  Learning  │  │Competition │  │  Identity  │
│ (catalog)  │→ │ (practice, │→ │ (arena,    │← │ (profile,  │
│            │  │  SRS, XP)  │  │  ranked)   │  │  billing)  │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
        ↘             ↓               ↓              ↙
                 ┌──────────────────────────┐
                 │   Engagement (streaks,   │
                 │ achievements, leaderboard)│
                 └──────────────────────────┘
```

## Content context (read-only, versioned, shipped as code)

| Concept              | Description |
|----------------------|-------------|
| `ShortcutDomain`     | A platform/app whose shortcuts are taught (windows-11, later vscode…). Aggregate root of the catalog. |
| `ShortcutCategory`   | Grouping inside a domain (Window Management, File Explorer, …). Ordered → forms the skill tree. |
| `ShortcutDefinition` | One shortcut: stable string id (`win11.win-e`), key chords, localized name/description, difficulty 1–5, `capturable` flag (can a browser intercept it?). |
| `KeyChord`           | Value object: set of modifiers + one physical key (`event.code`). A shortcut is 1..n chords (sequences like `Win+X → U`). |
| `Lesson`             | Ordered subset of shortcuts in a category with intro copy; the unit of the learning path. |

Invariants: shortcut ids are globally unique and **never recycled** (analytics and
user progress reference them forever). Difficulty ∈ [1,5]. Every domain has ≥1 category.

## Learning context

| Concept           | Description |
|-------------------|-------------|
| `CardState`       | SRS state per (user, shortcut): ease factor, interval, due date, reps, lapses. Pure data; transitions only via `review()`. |
| `ReviewGrade`     | `again / hard / good / easy` — derived automatically from correctness + reaction time, not self-reported. |
| `PracticeSession` | A run of the trainer: drills attempted, per-drill `DrillResult` (correct?, reactionMs, expected vs pressed). |
| `DrillResult`     | Value object; the atomic measurement. Feeds SRS grade, XP, and stats. |
| `DailyGoal`       | XP target per calendar day (user-timezone day boundary). |

Invariants: `review()` is a pure function `(CardState, Grade, now) → CardState`;
ease never drops below 1.3; intervals grow only on success.

## Engagement context

| Concept       | Description |
|---------------|-------------|
| `XpEvent`     | Append-only ledger entry (amount, source, sourceId). Level/total XP are **projections** of this ledger — never stored as the source of truth. |
| `Level`       | Derived: deterministic curve `totalXpForLevel(n)`. |
| `Streak`      | Consecutive active days (user timezone). One grace "freeze" per week for premium. |
| `Achievement` | Code-defined criteria evaluated on events (`first-win`, `sub-200ms`, `7-day-streak`). Unlocks are stored, criteria live in code. |

## Competition context

| Concept          | Description |
|------------------|-------------|
| `ArenaRun`       | Single-player scored run: mode, score, accuracy, avgReactionMs, consistency, event timeline. Immutable once submitted. |
| `ArenaMode`      | `sprint / time-attack / survival / boss-rush / combo-rush / reaction` — each a strategy implementing `ArenaModeRules`. |
| `Match`          | 1v1 realtime duel: lifecycle `pending → active → finished/abandoned`. Both players answer identical prompt sequences (seeded RNG). |
| `Rating`         | Glicko-2 per user per domain. Tiers map rating bands: Bronze … Windows Legend. |
| `Season`         | Time-boxed competitive period; ratings soft-reset, rewards issued. |
| `LeaderboardEntry` | Projection over runs/ratings: global, weekly, per-mode, per-domain. |

Invariants: match prompts are generated server-side from a seed so both players get
identical sequences; a finished match is immutable; rating updates are transactional
with match completion.

## Identity context

| Concept        | Description |
|----------------|-------------|
| `Profile`      | Public identity: username, display name, locale, avatar, country. |
| `Subscription` | Stripe-backed plan state: `free / monthly / yearly`; entitlements derived from plan, checked via `can(user, feature)` gate. |

## Ubiquitous language rules

- A **shortcut** is the thing being learned; a **chord** is one simultaneous key press;
  a **drill** is one attempt; a **session** is a series of drills.
- "Score" alone is ambiguous — always qualify: *run score*, *match score*, *rating*.
- XP is earned, never deducted. Ratings go up and down. Levels never go down.
