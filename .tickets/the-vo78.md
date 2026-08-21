---
id: the-vo78
status: open
deps: []
links: [the-nqz0]
created: 2026-08-21T02:56:41Z
type: chore
priority: 2
assignee: Jake Brown
---
# Remove calendar demo sign-ins

Remove the 36 clearly labelled production demo rows added for the monthly admin calendar after review is complete. Target only rows where full_name starts 'DEMO — ', phone_normalized starts 'demo-', and volunteer_date is between 2026-08-03 and 2026-08-21. Verify the count before deletion, obtain explicit production-mutation approval, delete only that bounded set from D1, and verify zero matching rows remain without affecting real sign-ins.

## Acceptance Criteria

A pre-delete query confirms exactly the intended DEMO rows; explicit approval is recorded; only those rows are deleted from production; post-delete count is zero; real sign-in counts are unchanged.
