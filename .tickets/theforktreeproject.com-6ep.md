---
id: theforktreeproject.com-6ep
status: closed
deps: []
links: []
created: 2026-04-02T03:03:07Z
type: chore
priority: 3
---
# Migrate corporate events photos to Astro Image component

Currently all photos on /corporate-events use raw <img> tags pointing to public/images/corporate-events/. Photos are 3-10MB each unoptimised JPEGs. Migrate to Astro's <Image> component from astro:assets to get automatic WebP/AVIF conversion, responsive srcsets, and proper lazy loading. Photos need to move from public/ to src/assets/images/corporate-events/ for Astro's build pipeline to process them.


