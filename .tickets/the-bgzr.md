---
id: the-bgzr
status: closed
deps: []
links: [the-a1xu, the-xhfc, the-9ih1, the-5co9]
created: 2026-08-20T08:09:54Z
type: feature
priority: 1
assignee: Jake Brown
---
# Add online volunteer registration

Publish a web-native version of the approved volunteer registration form at /volunteer-registration, link it from Get Involved alongside the daily volunteer sign-in, validate submissions on client and server, and store every submission as a separate record in the existing Cloudflare D1 database. Include all volunteer-facing fields, conditional date of birth for under-18s, typed-name declaration plus agreement checkbox, no staff UI, and no automatic retention deletion.

## Acceptance Criteria

The Get Involved page clearly links to registration and daily sign-in; all agreed fields and conditional validation are accessible and responsive; each valid submission creates a distinct D1 record; invalid, oversized, cross-origin, spam, and rate-limited requests fail safely; sensitive values are not logged or returned; the form shows clear success/error states and clears submitted personal data; the Astro production build passes.


## Notes

**2026-08-20T11:59:35Z**

Implemented the public /volunteer-registration form, shared client/server validation, guarded JSON API, D1 migration/runtime schema, and distinct registration/sign-in calls to action on Get Involved. Reviewed all four source DOCX pages for field parity and omitted Office Use Only. Verification completed: production build passes; validator age/enum/conditional cases pass; clean and upgraded SQLite migration checks pass; two identical submissions create two rows; API 415/403/413/400/429, honeypot, failure-preservation, and no-store paths exercised; desktop and 320px browser checks pass. Follow-ups: guardian consent the-xhfc, retention the-a1xu, staff UI the-9ih1, automated regressions the-5co9.
