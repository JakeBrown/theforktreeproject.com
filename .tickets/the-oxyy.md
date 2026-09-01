---
id: the-oxyy
status: closed
deps: []
links: []
created: 2026-09-01T04:19:25Z
type: bug
priority: 1
assignee: Jake Brown
---
# Fix Common Boobialla image orientation

The newly published Common Boobialla hero image is rotated relative to the original supplied HEIC. Rotate the optimized public and Astro source copies to match the source image's intended portrait orientation. Acceptance: both copies are portrait and visually align with the macOS Quick Look rendering; image metadata remains stripped; production build passes.


## Notes

**2026-09-01T04:20:14Z**

Rotated the Common Boobialla hero 90 degrees to match the supplied HEIC's macOS Quick Look rendering. Verified portrait 1350x1800 dimensions, close pixel alignment to the source preview, identical public/source copies, stripped metadata, clean diff, and successful production build.
