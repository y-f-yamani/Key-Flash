<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KeyMaster project rules

- Read `docs/04-folder-structure.md` first. Dependency rule: `app → features →
  core/content/lib`; `src/core` is pure TypeScript and must never import React,
  Next.js, or outer layers (ESLint enforces this).
- Routes (`src/app`) are thin shells; business logic lives in `src/features/*`
  and `src/core/*`.
- Shortcut catalog changes: append at category end, localize en + ar, ids are
  permanent. `npm run test:run` validates the catalog.
- Engine changes require tests; `src/core` has a 90% coverage gate.
- This Next.js version uses `src/proxy.ts` (not `middleware.ts`) and
  `params` as a Promise in pages/layouts.
- Verify with: `npm run typecheck && npm run lint && npm run test:run && npm run build`.
