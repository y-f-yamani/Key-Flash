# Contributing

## Ground rules

1. **Respect the dependency rule** (ADR-0001): `app → features → core/content/lib`.
   `src/core` never imports React, Next.js, or outer layers — ESLint enforces this.
2. **No monolithic files.** One component per file; split anything approaching
   ~300 lines.
3. **Engines change with tests.** Any change to `src/core` must keep the 90%
   coverage gate green (`npm run test:coverage`).
4. **Content is code** (ADR-0002): new shortcuts go in
   `src/content/domains/<domain>/shortcuts/`, localized in *all* supported
   languages, appended at the end of their category (lesson derivation depends
   on order). The catalog test suite is the gatekeeper.
5. **Shortcut ids are forever.** Never rename or recycle an id; user progress
   references them.

## Adding a new domain (e.g. VS Code)

1. Create `src/content/domains/vscode/` with `categories.ts` and `shortcuts/`.
2. Register it in `src/content/index.ts` (one line).
3. Add a catalog test mirroring `src/content/catalog.test.ts`.
   Nothing else changes — trainer, SRS, arena and stats pick it up.

## Workflow

- Trunk-based: short-lived branches off `main`, squash-merge.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
- Before pushing: `npm run typecheck && npm run lint && npm run test:run && npm run build`.
- E2E for UI-affecting changes: `npx playwright install && npm run e2e`.

## Translations

Every user-facing string lives in `src/lib/i18n/dictionaries/`. `en.ts` defines
the shape; other locales must satisfy the `Dictionary` type, so a missing key
is a compile error. Arabic copy should read naturally in MSA — when in doubt,
shorter is better.
