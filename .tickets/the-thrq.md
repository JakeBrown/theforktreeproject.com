---
id: the-thrq
status: closed
deps: []
links: []
created: 2026-08-21T03:14:44Z
type: feature
priority: 2
assignee: Jake Brown
---
# Export volunteer registrations for MailerLite

Add a protected CSV download from the volunteer Registrations admin page. Export the most recent registration per normalized email with Email, Full Name, Preferred Name, Phone, Under 18, Interests, Frequency, Preferred Days, and Registration Date. Format multi-value fields for MailerLite mapping and keep sensitive/non-email fields out.


## Notes

**2026-08-21T03:29:19Z**

Implemented protected /admin/registrations.csv export and a Registrations-page MailerLite download action. The export selects the newest registration per nonblank normalized email, emits only the nine approved operational-contact/segmentation fields, maps stored enums/arrays to readable labels, and uses UTF-8 BOM plus RFC 4180 escaping. Field-aware formula protection preserves legitimate +61 phones, + emails, and hyphen-leading names while neutralising suspicious free-text payloads. Malformed stored selection JSON fails with a generic no-store 503 rather than producing incomplete segmentation data.

Verification: 4 focused CSV tests passed; production build and git diff check passed; local Wrangler endpoint returned 401 without auth and a no-store attachment with auth; parsed CSV had the exact nine headers, equal-width rows, nonblank unique emails, and newest-per-email deduplication; focused re-review reported no findings.
