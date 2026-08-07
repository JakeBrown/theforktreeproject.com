---
id: the-x0g4
status: closed
deps: [the-wtbq]
links: []
created: 2026-07-30T02:43:23Z
type: feature
priority: 1
assignee: Jake Brown
---
# Add volunteer sign-in submission endpoint

Add a server-side Astro API endpoint that validates name, email, phone, and selected volunteer day, records the submission in the volunteer D1 database, and returns clear success/error responses. The recorded-at timestamp must be generated server-side, not trusted from the browser. Include abuse-resistant basics appropriate to a public form.


## Notes

**2026-07-30T03:44:56Z**

Implemented validated API with server-generated timestamp, Adelaide-today enforcement, Australian phone normalization, duplicate handling, streamed body limit, origin checks, honeypot, and rate limiting. Local API scenarios passed.

**2026-08-07T02:19:00Z**

Windy Bit client ticket: #ylg19 (https://windybit.au/clients/forktree-project/completed?ticket=ylg19).
