# The Forktree Project - Astro Site

## Issue Tracking
- This repo uses **wedow/ticket** via the `tk` CLI. Tickets are stored in `.tickets/` and should be committed with related changes.
- Do not use legacy issue trackers or ad-hoc TODO lists.
- Useful commands: `tk ready`, `tk show <id>`, `tk create`, `tk start <id>`, `tk close <id>`.

## Deployment
- Deployment is via **git push** to the main branch. Cloudflare Pages/Workers automatically builds and deploys on push.
- Do NOT use `npx wrangler deploy` directly.
- **Workers URL:** https://theforktreeprojectdotcom.jake8335.workers.dev/
- **Production URL:** https://www.theforktreeproject.com/ (served by the Cloudflare Workers site)

## Stack
- Astro 5 with SSR mode (`output: 'server'`) and Cloudflare Workers adapter
- Content collections for journal posts (`src/content/journal/`)
- Google Fonts: Poppins (headings + body) to match forktree.app

## Key Notes
- Journal post pages use `export const prerender = true` for static generation in SSR mode
- Background images on full-bleed sections use CSS `background-image` with dark overlays

## Admin access
- `/admin` is protected by Cloudflare Access (email one-time PIN for Liz, Maddie and Jake; app "Forktree Project Admin" in the Windy Bit Zero Trust org). `src/middleware.ts` also verifies the `Cf-Access-Jwt-Assertion` JWT using `CF_ACCESS_TEAM_DOMAIN` / `CF_ACCESS_AUD` in `wrangler.toml`.
- Any route that reads or returns volunteer data must live under `/admin/...`, never `/api/...`, so both Access and the middleware check cover it.
- `/admin` is the admin home (links to Calendar, Volunteers, the public forms and printable QR posters, plus a short how-it-works). Keep it short and update it when admin features change.
- For programmatic testing, send `CF-Access-Client-Id` / `CF-Access-Client-Secret` from the gitignored `CREDS.md` (service token `forktree-admin-test`).

## Section background rule (footer adjacency)
- The site footer is dark olive `#1f2a1f`. **The last content section before `<Footer />` must NOT also be `#1f2a1f`** — otherwise the footer visually merges into the last section and the page looks like it has no end.
- Pages that alternate `--plain` (`#fafaf9`) and `--olive` (`#1f2a1f`) sections should plan the alternation so the FINAL section is `--plain`. If you need an even number of content sections, start with `--olive` (right after the hero) and alternate, ending on `--plain`. See `team-days.astro` and `nursery.astro` for the established pattern.
- Same rule applies to any new section variant — never end a page on the footer's color.
