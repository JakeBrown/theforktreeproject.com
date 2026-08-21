---
id: the-on4f
status: open
deps: []
links: []
created: 2026-08-04T09:31:58Z
type: feature
priority: 1
assignee: Jake Brown
---
# Import volunteer attendance from Outlook calendar

Add a repeatable, idempotent import for Liz's private Outlook On-Site Register ICS feed. Treat events whose summary begins with the volunteer marker 'V' (for example, 'V: Ralph') as volunteer attendance, parse the Adelaide attendance date and volunteer name, and store them in D1 without requiring email or phone details. Keep the capability URL out of git/logs and load it from a Cloudflare secret. Preserve source UID/occurrence metadata so reruns update or skip duplicates safely. Surface imported attendance alongside web sign-ins in the admin register. Acceptance: parser tests cover folded ICS lines, all-day/timed dates, malformed/non-V events, duplicate reruns and cancellations; a dry run reports candidates without writes; successful sync reports inserted/skipped/error counts.

