---
id: the-62go
status: open
deps: []
links: [the-3wd3]
created: 2026-08-25T02:53:36Z
type: chore
priority: 3
assignee: Jake Brown
---
# Fix standalone TypeScript check

Running npx tsc --noEmit currently fails in src/worker.ts because the standard Request type is not assignable to Cloudflare's Request type (missing fetcher). npm run build still passes. Align the worker request typing so standalone type checking can be used as a quality gate.

