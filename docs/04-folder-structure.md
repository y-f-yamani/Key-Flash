# 04 — Folder Structure

Feature-based vertical slices over a framework-free core. The dependency rule
(`app → features → core/content/lib`, never the reverse) is the contract that keeps
this maintainable for a decade.

```
shortcut-keyboard/
├── docs/                         # Architecture docs + ADRs (this folder)
│   └── adr/
├── supabase/
│   └── migrations/               # SQL migrations (canonical schema)
├── e2e/                          # Playwright end-to-end tests
├── public/
└── src/
    ├── app/                      # Next.js App Router — THIN. Routing/layout only.
    │   ├── [locale]/             # en | ar (RTL) — every page lives under a locale
    │   │   ├── layout.tsx        #   html dir/lang, theme, providers, nav
    │   │   ├── page.tsx          #   landing
    │   │   ├── learn/            #   skill tree + lessons
    │   │   ├── practice/         #   SRS review + flashcards
    │   │   └── arena/            #   speed modes
    │   └── api/v1/               # Route handlers (REST surface, versioned)
    │
    ├── core/                     # ★ Pure TypeScript. No React. No Next. No IO.
    │   ├── keyboard/             # KeyChord model, event normalization, matcher
    │   ├── srs/                  # Spaced repetition scheduler (SM-2 variant)
    │   ├── gamification/         # XP curve, levels, streaks, achievements
    │   ├── scoring/              # Accuracy, reaction, consistency, combo, grading
    │   ├── arena/                # Mode rules (sprint, survival, …) as strategies
    │   ├── content/              # ShortcutDomain contracts + registry + validation
    │   └── result.ts             # Result<T, E> shared error type
    │
    ├── content/                  # Pure data conforming to core/content contracts
    │   └── domains/
    │       └── windows-11/       # catalog.ts (categories + shortcuts + lessons)
    │                             # ← add vscode/, office/, chrome/ here later
    │
    ├── features/                 # Vertical slices: components + hooks + services
    │   ├── learn/                # Lesson browser, skill tree
    │   ├── practice/             # Trainer UI, flashcards, review queue
    │   ├── arena/                # Sprint UI, results, personal bests
    │   ├── progress/             # Repositories (local + supabase), XP/streak hooks
    │   ├── profile/              # (later) public profiles
    │   ├── multiplayer/          # (later) match client over Realtime
    │   ├── billing/              # (later) Stripe checkout + entitlements
    │   └── coach/                # (later, optional) AI modules behind interfaces
    │
    ├── components/
    │   ├── ui/                   # Primitives (button, card, badge…) shadcn-style
    │   └── shared/               # Cross-feature composites (KeyCap, StatTile…)
    │
    └── lib/                      # Cross-cutting infrastructure
        ├── i18n/                 # Typed dictionaries en/ar, locale helpers
        ├── supabase/             # Client factories (browser/server)
        ├── flags.ts              # Feature flags
        ├── logger.ts             # Structured logging
        └── utils.ts              # cn() etc.
```

## Rules

1. **`src/core` imports nothing** from `react`, `next`, `src/features`, `src/lib`,
   or the DOM. It must run in Node, browser, or a worker unchanged.
2. **Features don't import each other's internals.** Cross-feature needs go through
   `core` contracts or explicit public `index.ts` exports.
3. **Routes are shells.** A `page.tsx` resolves locale + params and renders a feature
   component. No business logic in `src/app`.
4. **Content is data.** `src/content` contains zero logic — only typed catalogs.
   A new domain = new folder + one registry line.
5. **One component per file; no file over ~300 lines.** Split before it hurts.
