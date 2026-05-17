---
id: theforktreeproject.com-xm8
status: closed
deps: []
links: []
created: 2026-03-15T20:44:08Z
type: feature
priority: 1
---
# Subtle text readability over background images

The goal/education sections have text overlaid on full-bleed background images with a dark overlay (rgba(0,0,0,0.2) + backdrop-filter: blur(8px)). Make the blur/darken effect as subtle as possible while keeping text fully readable. Currently applies to .goal-text in goals.astro, education1.astro, supporters.astro. Consider: reducing blur radius, lowering opacity, using text-shadow instead, or a very subtle gradient behind text only. Test across all affected pages.


