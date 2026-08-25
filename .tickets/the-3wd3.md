---
id: the-3wd3
status: closed
deps: []
links: [the-62go]
created: 2026-08-25T02:47:03Z
type: bug
priority: 1
assignee: Jake Brown
---
# Apply volunteer registration feedback

Update the volunteer registration form based on Maddie's review. Show all public registration date fields in Australian DD/MM/YYYY format while preserving ISO dates in validated/stored data. Rename the Q4 free-text prompt to Skills and experience so qualifications remain in Q5. Leave Education and community engagement unchanged pending Liz and Maddie's content decision. Acceptance: valid Australian dates submit and normalize to YYYY-MM-DD; invalid/future/past constraints still work; build and focused tests pass.


## Notes

**2026-08-25T02:53:42Z**

Implemented Australian DD/MM/YYYY public date entry with ISO normalization, updated Q4/admin wording to Skills and experience, and added focused date validation tests. Education and community engagement remains unchanged pending Liz/Maddie's decision. Tests (6) and production build pass. Remote D1 migration gate reports no pending migrations. Standalone tsc has a pre-existing src/worker.ts Request typing failure tracked in the-62go.
