---
id: the-fxp4
status: open
deps: [the-on4f]
links: []
created: 2026-08-04T09:32:07Z
type: task
priority: 1
assignee: Jake Brown
---
# Backfill historical volunteer attendance

After calendar import storage is available, backfill Liz's retrospective volunteer attendance from 31 Oct 2025 through 23 Jan 2026 and import all available V-labelled Outlook calendar events from 1 Feb 2026 onward. Normalize obvious capitalization only; preserve names as supplied and record provenance. Before finalizing, reconcile the source gap: the shared feed inspected on 4 Aug 2026 exposes events only from 3 Jul 2026 and currently has three V-labelled entries (Ralph on 7 Jul, 9 Jul and 1 Aug), so obtain or document the missing Feb-Jun export rather than silently claiming completeness. Acceptance: import is idempotent, row counts/date range are verified in D1, and any unresolved missing dates are reported.

