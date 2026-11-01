---
id: the-9ebf
status: closed
deps: []
links: []
created: 2026-11-01T10:55:00Z
type: task
priority: 2
---
# Give Maddie and Liz their own admin logins

The /admin area used a single shared Basic-auth login. Requested at the team meeting: open the admin area to Maddie and Liz.

Added separate per-person logins (usernames `maddie` and `liz`) in src/middleware.ts, stored as SHA-256 digests only. The existing shared login still works. To revoke someone, delete their line from ADMIN_CREDENTIAL_DIGESTS.
