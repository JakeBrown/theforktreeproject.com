---
id: the-316s
status: closed
deps: []
links: []
created: 2026-06-25T00:45:50Z
type: task
priority: 3
assignee: Jake Brown
---
# Optimize journal images

Follow-up to static image optimization: migrate journal thumbnail/frontmatter images and markdown content images into Astro's image pipeline where feasible. Needs a mapping or content image schema approach because blog listing/search currently use dynamic string paths and rendered markdown emits raw <img> tags.


## Notes

**2026-06-25T02:45:04Z**

Implemented automated journal thumbnail generation for frontmatter images: scripts/generate-journal-thumbnails.mjs creates 800px WebP thumbnails, src/data/journalThumbnails.ts maps originals to thumbnails, and blog listing/search now use the thumbnails. Inline body images are intentionally unchanged to avoid markdown churn.
