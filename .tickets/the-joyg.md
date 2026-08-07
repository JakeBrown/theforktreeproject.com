---
id: the-joyg
status: closed
deps: [the-x0g4]
links: []
created: 2026-07-30T02:43:23Z
type: feature
priority: 1
assignee: Jake Brown
---
# Build public volunteer sign-in page

Add a mobile-friendly public website page for volunteers arriving onsite. Form fields: name, email, phone number, and day; day defaults to the current date in the visitor's local timezone and remains editable. Submit to the sign-in endpoint, show accessible validation/loading/success/error states, and provide a discoverable website link without adding an admin area. Verify responsive behaviour and production build.


## Notes

**2026-07-30T03:22:34Z**

Page will be linked from footer only, publicly accessible but noindex, designed for a shared device, and clear personal details after success with a Sign in another volunteer action.

**2026-07-30T03:44:56Z**

Implemented responsive noindex shared-device form and footer-only link. Required full name/email/phone, locked Adelaide date, optional communications consent, accessible states, personal-detail reset, and next-volunteer action. Mobile browser test and production build passed.

**2026-08-07T02:19:00Z**

Windy Bit client ticket: #ylg19 (https://windybit.au/clients/forktree-project/completed?ticket=ylg19).
