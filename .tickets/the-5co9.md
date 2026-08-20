---
id: the-5co9
status: open
deps: []
links: [the-bgzr]
created: 2026-08-20T11:59:13Z
type: task
priority: 2
assignee: Jake Brown
---
# Add volunteer registration regression tests

Add automated coverage for the volunteer registration validator, API guards, D1 insert mapping, and conditional form behaviour. The initial launch was manually exercised because this repository currently has no automated test setup.

## Acceptance Criteria

Tests cover valid adult and under-18 submissions, age boundaries, conditional fields, duplicate and unknown options, malformed scalar/array input, duplicate records, 415/403/413/400/429 responses, honeypot no-insert behaviour, database failures, form success/error state, and migration/runtime schema parity; the tests run from a documented package script.
