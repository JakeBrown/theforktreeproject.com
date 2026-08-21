---
id: the-ljvb
status: open
deps: []
links: []
created: 2026-08-21T02:22:27Z
type: chore
priority: 2
assignee: Jake Brown
---
# Pin production D1 identity in Wrangler config

The production VOLUNTEER_SIGN_INS database is auto-provisioned and wrangler.toml omits database_name/database_id. As a result, the required project-pinned 'wrangler d1 migrations list VOLUNTEER_SIGN_INS --remote' safety check fails unless a temporary config is created with the resolved production database identity. Evaluate pinning the existing database name/ID without creating or rebinding a database, document the migration-status command, and verify the Worker binding remains unchanged.
