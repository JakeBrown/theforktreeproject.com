---
id: the-wr38
status: closed
deps: []
links: []
created: 2026-08-21T03:52:08Z
type: task
priority: 2
assignee: Jake Brown
---
# Hide volunteer sign-in from public site navigation

Remove public links to the daily volunteer sign-in from Get Involved, volunteer registration, and the footer while keeping /volunteer-sign-in directly accessible. Exclude the sign-in and QR routes from the sitemap. Acceptance: no public navigation points to the sign-in; direct sign-in URL still builds; routes remain noindex; production build passes.


## Notes

**2026-08-21T03:55:35Z**

Removed sign-in links from Get Involved, volunteer registration, and the footer; excluded sign-in routes from the sitemap. Verified direct route returns 200 with noindex, no public Get Involved link remains, Node tests pass, build passes, and remote D1 has no pending migrations.
