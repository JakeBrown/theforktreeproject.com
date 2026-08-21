---
id: the-5kl5
status: open
deps: [the-on4f]
links: []
created: 2026-08-04T09:32:15Z
type: feature
priority: 2
assignee: Jake Brown
---
# Export volunteer attendance register as CSV

Add a protected CSV export of the unified volunteer attendance register (web sign-ins, Outlook calendar imports and historical manual records). Include attendance date, volunteer name, source and available contact/consent fields; sort by date and name; use spreadsheet-safe UTF-8 CSV escaping and prevent formula injection. Allow an optional date range. Acceptance: export opens cleanly in spreadsheet software, includes imported rows with blank unavailable contact fields, remains behind admin authentication, and has tests for commas, quotes, Unicode and formula-like names.

