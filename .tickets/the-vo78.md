---
id: the-vo78
status: closed
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

## Notes

**2026-11-23T22:23:14Z**

Approved by Jake 2026-11-24 (expanded scope: matching attendance rows and the 12 demo volunteer profiles created by the profile backfill). Time Travel bookmark before delete: 0000006f-00000004-0000512c-2ab86f4db8989aa62d704b3770398a95. Pre: 36 demo sign-ins, 36 demo attendance, 12 demo volunteers (none with registration, real sign-ins, notes, photos or visits); totals 47/47/31, registrations 15. Deleted 36 attendance, 12 volunteers, 36 sign-ins. Post: 0 demo sign-ins/volunteers, 0 orphan attendance; totals 11 sign-ins, 11 attendance, 19 volunteers, 15 registrations.
