---
id: the-wtbq
status: closed
deps: []
links: []
created: 2026-07-30T02:43:23Z
type: feature
priority: 1
assignee: Jake Brown
---
# Add volunteer sign-in D1 storage

Declare a new automatically provisioned D1 binding in wrangler.toml and add a migration for volunteer sign-in records. Store name, email, phone, the volunteer-selected day, and a separate server-generated sign-in timestamp. Acceptance: local D1 migration applies cleanly and schema preserves both dates.


## Notes

**2026-07-30T03:22:34Z**

Interview decisions: all fields required; one full-name field; volunteer date restricted to Adelaide's current day and shown locked; retain records indefinitely; store optional future-communications consent; duplicate email or phone on the same day must be blocked.

**2026-07-30T03:44:56Z**

Implemented draft D1 binding, idempotent migration/runtime schema initialization, unique per-day email/phone indexes, retention fields, and D1-backed rate limiting. Fresh local migration and Wrangler dry run passed.
