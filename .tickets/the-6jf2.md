---
id: the-6jf2
status: closed
deps: []
links: [the-t1t9]
created: 2026-08-05T12:23:11Z
type: bug
priority: 1
assignee: Jake Brown
---
# Fix QR poster print pagination

The /volunteer-sign-in/qr print layout currently shows a dark border and can spill onto a second page in browser print preview. Remove the printed poster border and replace the near-full-page fixed height with compact print dimensions that fit reliably on one portrait page across A4 and Letter PDF output without clipping. Keep the QR large and scannable and preserve the screen layout. Acceptance: no poster border appears in print, print-to-PDF is exactly one page, key content is not clipped, rendered QR decodes to the sign-in URL, and the production build passes.


## Notes

**2026-08-05T21:52:07Z**

Review confirmed the print border is explicitly authored and the fixed 270mm height exceeds Letter's printable area after margins. Applying the recommended paper-size-agnostic auto-height repair with no print border and 10mm page margins.

**2026-08-05T21:54:02Z**

Removed the print-only border, forced A4 paper size and fixed 270mm poster height. Print now uses auto height with 10mm page margins, fitting both Letter and A4. Verified one-page Letter PDF output, no border, QR decode to the exact sign-in URL, focused re-review, and production build.

**2026-08-07T02:19:00Z**

Windy Bit client ticket: #ylg19 (https://windybit.au/clients/forktree-project/completed?ticket=ylg19).
