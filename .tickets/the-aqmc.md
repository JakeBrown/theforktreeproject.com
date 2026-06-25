---
id: the-aqmc
status: closed
deps: []
links: []
created: 2026-06-25T00:38:28Z
type: task
priority: 2
assignee: Jake Brown
---
# Optimize static page images

Migrate main static page raster photos from public /images references to Astro assets using <Image> for inline images and getImage() for CSS backgrounds. Exclude logos, supporter graphics, style-guide asset gallery, search dynamic images, and journal markdown content for this pass.


## Notes

**2026-06-25T00:46:32Z**

Completed: migrated main static page raster photos to src/assets and Astro image pipeline; build generated 52 optimized images. npm run build passed.
