# The Forktree Project - Astro Site

## Deployment
- Deployment is via **git push** to the main branch. Cloudflare Pages/Workers automatically builds and deploys on push.
- Do NOT use `npx wrangler deploy` directly.
- **Workers URL:** https://theforktreeprojectdotcom.jake8335.workers.dev/
- **Production URL:** https://www.theforktreeproject.com/ (currently still Squarespace)

## Stack
- Astro 5 with SSR mode (`output: 'server'`) and Cloudflare Workers adapter
- Content collections for journal posts (`src/content/journal/`)
- Google Fonts: Poppins (headings + body) to match forktree.app

## Key Notes
- Journal post pages use `export const prerender = true` for static generation in SSR mode
- Background images on full-bleed sections use CSS `background-image` with dark overlays

## Section background rule (footer adjacency)
- The site footer is dark olive `#1f2a1f`. **The last content section before `<Footer />` must NOT also be `#1f2a1f`** — otherwise the footer visually merges into the last section and the page looks like it has no end.
- Pages that alternate `--plain` (`#fafaf9`) and `--olive` (`#1f2a1f`) sections should plan the alternation so the FINAL section is `--plain`. If you need an even number of content sections, start with `--olive` (right after the hero) and alternate, ending on `--plain`. See `team-days.astro` and `nursery.astro` for the established pattern.
- Same rule applies to any new section variant — never end a page on the footer's color.
