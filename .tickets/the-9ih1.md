---
id: the-9ih1
status: closed
deps: []
links: [the-bgzr, the-nqz0]
created: 2026-08-20T08:15:44Z
type: feature
priority: 2
assignee: Jake Brown
---
# Add staff review UI for volunteer registrations

Build a protected, view-only staff dashboard for volunteer sign-ins and registrations stored in D1. Keep the two record types on separate pages. Staff can search by volunteer name, filter by one exact date, and open a record to review its full details.

## Acceptance Criteria

- HTTP Basic Auth protects every `/admin` route and sensitive values are not embedded in credentials or logs.
- `/admin/sign-ins` and `/admin/registrations` provide separate, responsive record views.
- Each page supports name search and one exact-date filter, with a clear reset action.
- Selecting a row opens an accessible modal with all stored details for that record.
- Newest records appear first and empty, filtered-empty, and error states are clear.
- The production build passes.

## Notes

**2026-08-21T02:00:47Z**

Scope refined with Jake: separate Sign-ins and Volunteer registrations pages; view-only tables; search by volunteer name; exact-date filter; click a row to open full details modal; clean light dashboard; HTTP Basic Auth. Export, edit, delete, audit workflows, and broader filters are out of scope.

**2026-08-21T02:22:38Z**

Implemented the protected view-only admin dashboard at /admin/sign-ins and /admin/registrations with separate navigation, bound name/exact-date filters, newest-first tables, responsive record cards, and full-details dialogs. Rotated the temporary Basic Auth credentials; only the combined SHA-256 digest is committed. Admin responses are no-store/noindex and admin URLs are excluded from analytics to prevent filter-name/referrer leakage. Registration date filters use Adelaide calendar-day UTC bounds including DST.

Verification: npm run build passed; admin helper checks passed for valid/invalid filters, LIKE escaping, standard/daylight/DST-transition Adelaide bounds; git diff --check passed; local Wrangler D1 browser tests passed for auth rejection, name/date filtering, Adelaide UTC-boundary behavior, mouse/keyboard modal access, full registration details, desktop/mobile rendering; axe WCAG A/AA scan reported 0 violations; focused re-review reported no findings. Production D1 migration status checked against the resolved database ID with the complete migrations directory: no migrations to apply.
