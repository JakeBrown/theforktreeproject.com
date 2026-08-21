---
id: the-nqz0
status: closed
deps: []
links: [the-9ih1, the-vo78]
created: 2026-08-21T02:38:31Z
type: feature
priority: 2
assignee: Jake Brown
---
# Add monthly volunteer sign-in calendar

Make Calendar the default /admin/sign-ins view, with previous/next month navigation and volunteer counts by day. Clicking a populated day opens that day's volunteer list; selecting a volunteer opens the existing full-detail dialog. Retain a separate List view with name search only. Seed a few dozen clearly labelled DEMO sign-ins into the live production D1 database for the current month so the calendar can be reviewed, and track their later cleanup.

## Acceptance Criteria

- Calendar is the default Sign-ins view and initially shows the current Adelaide month.
- Previous/next controls navigate valid months and populated dates show accurate sign-in counts.
- Selecting a populated date opens its volunteer list; selecting a volunteer opens full details.
- List view supports name search only and clearly reports empty or limited results.
- Calendar, list, and dialogs are responsive and keyboard accessible.
- Production contains a few dozen clearly marked DEMO records with bounded cleanup tracked separately.
- Production build and focused browser checks pass.

## Notes

**2026-08-21T02:56:41Z**

Production seed applied with explicit approval: 36 insert-only rows prefixed 'DEMO —' across 9 dates from 2026-08-03 through 2026-08-21. Post-write verification confirmed 36 rows and 9 dates. D1 bookmark after import: 0000000c-00000006-000050ce-7f4783cefde9ef9f5a27c3c6689faa3d. Cleanup tracked in the-vo78.

**2026-08-21T02:57:22Z**

Implemented default Adelaide-month calendar with bound month queries, accurate daily counts, boundary-safe navigation, Calendar/List switch, name-only list search, accessible day volunteer lists, stacked full-detail dialogs, explicit result-limit states, and responsive DEMO badges. Production seed contains 36 verified DEMO records across 9 dates; cleanup ticket the-vo78 is linked.

Verification: npm run build passed; calendar helper assertions passed for Adelaide current month, parameter normalization, month shifts/bounds, and Monday-first six-week grid; git diff --check passed; local Wrangler D1 browser flow passed unauthenticated rejection, default calendar, daily counts, pointer day-to-list-to-detail dialogs, stacked close behavior, name-only List search, and 390px rendering; axe WCAG A/AA scan reported 0 violations; focused re-review reported no findings. Production D1 had no pending migrations before seeding.
