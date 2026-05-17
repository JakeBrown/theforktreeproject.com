---
id: theforktreeproject.com-a6r
status: closed
deps: []
links: []
created: 2026-05-08T03:14:57Z
type: task
priority: 2
---
# Testimonials: change Blackwood quote to 'Upper Primary to Year 12'

Per Liz's May 7 priorities email (StpATctU5KeB). She wants to change the Blackwood testimonial wording because it was attracting too-junior approaches:

  "from Reception to Year 12" → "from Upper Primary to Year 12"

Liz: "They won't mind!! And I'll ask them anyway, but I think we should just do it."

Locations to update:
- src/pages/testimonials.astro line 17: full quote contains "...A perfect choice for students from Reception through to Year 12."
- src/pages/education1.astro line 93: short form "A perfect choice for students from Reception through to Year 12." — but if bd theforktreeproject.com-XXX (Annesley swap) lands first, the Blackwood short quote is gone from /education1 entirely. Sequence matters.

If Annesley swap (the other bead) ships first → only update /testimonials.
If this ships first → update both, then Annesley swap removes the edu1 line.


