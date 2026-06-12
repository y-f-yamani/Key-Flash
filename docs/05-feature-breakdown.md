# 05 — Feature Breakdown & Roadmap

Phases ship independently; each leaves the product releasable.

## Phase 1 — Learning core (THIS REPO, current slice ✅)

| Feature | Detail |
|---|---|
| Windows 11 catalog | ~80 shortcuts, 8 categories, localized en/ar, difficulty-tiered, sequence support (`Win+X → U`), capturability flags |
| Real keyboard detection | `event.code`-based chord matching, modifier-order independence, Meta-key remap option for browser-reserved combos, sub-ms timing |
| Learn | Skill tree by category → lessons (intro → drills) |
| Practice | SRS review queue (auto-graded from correctness + speed), flashcards |
| Gamification v1 | XP ledger, levels, daily streaks, daily goal |
| Speed Arena v1 | Shortcut Sprint (60s), live combo meter, results: score/accuracy/avg reaction/consistency, local personal bests |
| Progress | Stats dashboard data (per-category mastery), local persistence behind `ProgressRepository` |
| i18n + RTL | en/ar route segments, full RTL layout, dark/light themes |
| PWA-ready | Desktop-first responsive shell |

## Phase 2 — Accounts & cloud

Supabase auth (email + OAuth) · `SupabaseProgressRepository` swap-in · cross-device
sync · global + weekly leaderboards · achievements service · profile pages ·
statistics dashboard UI · analytics events.

## Phase 3 — Competition

Remaining arena modes (Time Attack, Survival, Boss Rush, Combo Rush, Reaction Test) ·
1v1 realtime matches over Supabase Realtime (seeded identical prompts) · Glicko-2
ratings · tiers Bronze→Windows Legend · friend invites · random matchmaking ·
weekly tournaments · seasons.

## Phase 3.5 — Touch typing (SHIPPED ✅)

Monkeytype-style typing trainer — the platform trains *keyboard mastery*, not
only shortcuts. Pure `core/typing` engine (WPM net/raw, accuracy that survives
corrections, rhythm consistency, streaks), seeded en/ar word corpora, 30s/60s
timed tests, per-duration personal bests + XP through the shared progress
pipeline. Seeded generation is the basis for future head-to-head typing races.

## Phase 4 — Windows 11 Simulator (NEXT)

Browser-based Windows 11 visual simulation (taskbar, windows, Explorer, Task Manager,
clipboard history, virtual desktops as React components). Missions: "open File
Explorer" → user presses Win+E → simulated window opens. Mission engine consumes the
same `ShortcutMatcher`; UI reacts like real Windows. Pure front-end; no OS calls.

## Phase 5 — Monetization & AI coach

Stripe subscriptions (free/monthly/yearly) · entitlement gates (`can(user, feature)`) ·
premium analytics, exclusive tournaments, advanced missions, streak freezes ·
**AI coach behind `CoachService` interface**: weakness analysis from `drill_results`,
personalized training plans, adaptive difficulty, dynamic challenges, productivity
score. Rule-based fallback ships first; platform is fully functional with coach removed.

## Phase 6 — New domains

Office, VS Code, Chrome, Photoshop, AutoCAD, Linux, macOS — each is one folder in
`src/content/domains/` + a registry entry. Engines, arena, SRS, leaderboards pick the
new domain up automatically (leaderboards are already keyed by `domain_slug`).

## Cross-cutting (every phase)

Structured logging · error boundaries · rate limiting on write endpoints ·
feature flags for risky surfaces · WCAG AA · keyboard-first UX (obviously).
