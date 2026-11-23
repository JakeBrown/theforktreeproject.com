---
id: the-9v9m
status: open
deps: []
links: []
created: 2026-11-23T22:35:16Z
type: feature
priority: 2
assignee: Jake Brown
---
# Sync volunteer registrations to MailerLite

Every volunteer registrant (Jake's decision 2026-11-24: no opt-in checkbox) is upserted into the MailerLite 'Volunteers' group (id 204968455775978608) with name, last name, preferred name, phone, under 18, interests, frequency, preferred days and registration date. Sync runs after each registration and from the twice-daily volunteer cron (retries failures, max 10 attempts). Newest registration per email only; no status sent, so unsubscribed people stay unsubscribed. Volunteers admin page drops the MailerLite CSV download (endpoint and CSV lib removed) and shows a badge with the last successful sync plus failed/waiting counts. API key is the MAILERLITE_API_KEY Worker secret.


## Notes

**2026-11-23T22:37:04Z**

Independent review fixes: per-registration sync targets only the new registration id; no attempt cap (cron retries failures every run, so fixing a bad key recovers everything); a failed overlapping run cannot undo a recorded success; superseded failures are not counted on the badge; cron batch 20 rows to stay inside subrequest limits; response bodies always read. Verified: 32 tests, build. MAILERLITE_API_KEY secret uploaded; group 204968455775978608 and fields preferred_name, under_18, volunteer_interests, volunteer_frequency, preferred_days, volunteer_registered created via API.

**2026-11-23T22:45:25Z**

Sync schedule changed to hourly (cron '5 * * * *', separate from the auto sign-out cron) at Jake's request.

**2026-11-23T23:08:20Z**

First hourly run 2026-11-23T23:05Z synced 13/14. Registration 7 returned 422 'subscriber is not active and cannot be imported' (bounced/unsubscribed in MailerLite); that response is now recorded as done with a note instead of failing and retrying forever.
