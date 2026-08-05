---
id: the-ihsi
status: closed
deps: []
links: [the-t1t9]
created: 2026-08-05T02:16:34Z
type: feature
priority: 1
assignee: Jake Brown
---
# Simplify volunteer sign-in and add QR code

Update the existing /volunteer-sign-in page following Liz's 2 Aug feedback and Jake's 5 Aug decision. Show only full name and phone number fields; continue deriving the Adelaide attendance date and server timestamp automatically. Stop collecting email and communications consent, update duplicate handling and the admin display while preserving existing stored records, and add a local QR code at the bottom that opens https://www.theforktreeproject.com/volunteer-sign-in and can be downloaded for printing. Acceptance: valid name/phone submissions succeed; no email, consent, or date control appears; repeat phone sign-in on the same day is blocked; existing records remain readable; the QR scans to the exact HTTPS URL; relevant checks and production build pass.


## Notes

**2026-08-05T11:07:01Z**

Implemented name-and-phone-only sign-in, automatic Adelaide attendance date/server timestamp, phone-only duplicate detection, legacy-schema compatibility, simplified admin display, and a downloadable local QR code. Verified client/API validation and success flows locally, two distinct blank-email records on the same day, normalized-phone duplicate rejection (409), QR decode to the exact production URL, 390px mobile layout, clean focused review, local D1 migration, git diff check, and production build.
