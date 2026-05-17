---
id: theforktreeproject.com-61z
status: closed
deps: []
links: []
created: 2026-05-08T03:16:45Z
type: task
priority: 3
---
# Add bouncy scroll arrow to full-bleed hero pages that lack one

Per Liz's May 7 priorities email (StpATctU5KeB):
  "On the venue page you have one of those bouncy downwards arrows which tells people to scroll down for more content. Should we have them on the other pages?"

Currently has it:
- src/pages/corporate-events.astro (.ce-hero__scroll, lines 53-57 + 404-417)
- src/pages/goals.astro (.goal-section__scroll)

Candidates that have full-bleed (min-height: 100vh) hero with image bg but lack the arrow:
- src/pages/index.astro (banner-only home — about to become About per bead 9sm)
- src/pages/education1.astro (edu-section--hero)
- src/pages/nursery.astro (nur-section--hero)
- src/pages/team-days.astro (td-section--hero)

Probably don't need it (no full-bleed hero or different layout):
- get-involved.astro (shorter join-hero)
- donate.astro, supporters.astro, testimonials.astro (no full-bleed hero)
- blog index/archive (cards layout)

Implementation:
- Reusable: extract a small <ScrollIndicator /> Astro component using the existing chevron SVG + bounceDown keyframes (see corporate-events.astro lines 54-56 + 404-417). Each hero just needs <ScrollIndicator /> inside the hero <section>; section needs position:relative.
- Or copy the markup + CSS per page (faster; what existing pages do).

Confirm with Liz before adding to home page about-section (post-bead-9sm) — the home banner with arrow may compete visually with the heading. Apply to nursery/education/team-days first.


