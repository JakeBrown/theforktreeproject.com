---
id: the-t1t9
status: closed
deps: []
links: [the-ihsi, the-6jf2]
created: 2026-08-05T11:57:55Z
type: task
priority: 1
assignee: Jake Brown
---
# Make volunteer QR page print-friendly

Move the QR code from /volunteer-sign-in to a separate /volunteer-sign-in/qr page linked from the form, remove the QR download control, and add print/PDF styling for a clean single-page A4 volunteer sign-in poster. The printed layout should omit navigation, footer, interactive form and screen-only controls; retain Forktree branding, a clear volunteer sign-in heading, brief scan instruction, a large high-contrast QR code, and the canonical URL as text. Acceptance: the form page links to the separate QR page without embedding the code; no download control remains; browser print preview fits one portrait page without clipping; the QR remains scannable; and the production build passes.


## Notes

**2026-08-05T11:59:01Z**

Jake confirmed the QR should move to a separate screen page linked from the sign-in form. Use /volunteer-sign-in/qr for the printable poster page; keep /volunteer-sign-in focused on the form.

**2026-08-05T12:08:25Z**

Implemented separate /volunteer-sign-in/qr poster page and linked it from the form page. Removed the embedded QR and download link. Added on-screen print/back actions plus portrait print CSS that hides site chrome and produces a branded one-page poster. Verified form/QR route separation, 390px responsive layout, one-page browser PDF output, QR decode from the rendered PDF to the exact production URL, clean browser console, focused review, git diff checks, and production build.
