# ADR-0002: Shortcut catalogs ship as versioned code, not DB rows

**Status:** Accepted · 2026-06-11

## Context
The catalog (~80 shortcuts for Windows 11, more domains later) changes rarely, needs
review, localization, and type safety. User progress must reference shortcuts forever.

## Decision
Catalogs are typed TS modules in `src/content/domains/<slug>/` conforming to
`core/content` contracts, validated by unit tests in CI. The DB stores only **stable
string ids** (`win11.win-e`). Ids are never recycled.

## Consequences
- Content changes are PRs: diffable, reviewable, instantly rolled back, bundled
  offline (PWA practice works without network).
- No CMS/admin UI to build or secure; catalog bugs fail CI instead of production.
- Trade-off: publishing content requires a deploy — acceptable at our change rate.
  If non-engineers must edit content later, we can generate these modules from a CMS
  without touching consumers.
