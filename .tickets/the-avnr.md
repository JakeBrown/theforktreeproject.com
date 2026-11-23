---
id: the-avnr
status: closed
deps: []
links: []
created: 2026-11-23T22:23:14Z
type: feature
priority: 2
assignee: Jake Brown
---
# Simplify admin: drop Sign-ins and Registrations pages

Calendar becomes the admin home. Remove the Sign-ins page (redirect /admin/sign-ins to /admin/calendar) and its now-unused helpers including the demo badge. Fold registration forms into volunteer profiles: show the full registration details (DOB/under 18, WWCC, medical, media consent, declaration, interests, skills, qualifications, licences, frequency, days, referral, accessibility) on the profile, move the MailerLite CSV download to the Volunteers page, remove Registrations from the nav and redirect /admin/registrations to /admin/volunteers. No data deleted.


## Notes

**2026-11-23T22:26:06Z**

Calendar is the admin home (/admin -> /admin/calendar, logo link). Removed Sign-ins page (301 /admin/sign-ins -> /admin/calendar, keeping ?month) and Registrations page (301 /admin/registrations -> /admin/volunteers, keeping ?name). Volunteer profiles now show the full registration form (key flags: under 18, WWCC, media consent, medical) with earlier forms from the same phone collapsed; Volunteers list gains a Registered column and the MailerLite CSV download. Removed AdminRecordDialog, demo badge and list/filter helpers; adminSignIns.ts renamed adminCalendar.ts. No data deleted. Verified: 26 tests, build, wrangler dev with a real Access JWT (redirects, calendar/volunteers/CSV 200, profile shows registration incl. earlier form).
