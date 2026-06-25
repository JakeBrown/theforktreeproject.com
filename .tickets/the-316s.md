---
id: the-316s
status: open
deps: []
links: []
created: 2026-06-25T00:45:50Z
type: task
priority: 3
assignee: Jake Brown
---
# Optimize journal images

Follow-up to static image optimization: migrate journal thumbnail/frontmatter images and markdown content images into Astro's image pipeline where feasible. Needs a mapping or content image schema approach because blog listing/search currently use dynamic string paths and rendered markdown emits raw <img> tags.

