---
id: the-bzct
status: closed
deps: []
links: []
created: 2026-11-23T23:05:44Z
type: feature
priority: 2
assignee: Jake Brown
---
# Let admins correct attendance history

On volunteer profiles admins can fix sign-in/out times, add a missed visit, or delete a mistaken visit. Every change is audited in volunteer_attendance_edits with the admin's Access identity and before/after snapshot; rows show Edited / Added by admin. Guards: no future dates or (today) future times; stale edits refused if the visit changed since the page loaded; unchanged times keep their stored values and automatic label; ownership enforced; kiosk race returns a friendly error. Two-step confirm moved to AdminLayout, resets on dialog close and announces via a live region.


## Notes

**2026-11-23T23:05:44Z**

Independent review findings all addressed (future times today, stale overwrite, automatic label preserved, unique-race error, dialog text inheritance, confirm reset/announcement, error reopens dialog with typed values). Verified: 40 tests, build, local end-to-end add/edit/delete/guards.
