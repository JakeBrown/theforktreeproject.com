# The Forktree Project - Astro Site

## Deployment
- Deployment is via **git push** to the main branch. Cloudflare Pages/Workers automatically builds and deploys on push.
- Do NOT use `npx wrangler deploy` directly.

## Stack
- Astro 5 with SSR mode (`output: 'server'`) and Cloudflare Workers adapter
- Content collections for journal posts (`src/content/journal/`)
- Google Fonts: Jost (headings) + Source Sans 3 (body) as approximations for original Adobe Fonts (futura-pt + proxima-nova)

## Key Notes
- Journal post pages use `export const prerender = true` for static generation in SSR mode
- Background images on full-bleed sections use CSS `background-image` with dark overlays
- The homepage banner section has no background image (just black) - this matches the original
