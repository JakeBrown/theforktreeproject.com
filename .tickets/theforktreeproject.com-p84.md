---
id: theforktreeproject.com-p84
status: closed
deps: []
links: []
created: 2026-04-01T00:58:03Z
type: feature
priority: 1
---
# Corporate events venue page on theforktreeproject.com

Create a new page at /corporate-events on the main Forktree website for corporate venue hire.

## Content
Copy is in: ~/Documents/Forktree Room Rental/Corporate events venue draft text for web page and flyer-3.docx
(Also downloaded to /tmp/corporate-events-draft.docx)

Sections:
1. Hero: full-bleed image with heading 'Corporate Events Venue' and tagline about the restored shearing shed
2. Intro text: 'Come and have your next corporate event...' paragraph
3. Facilities list (WiFi, AV, kitchen, breakout rooms, deck, BBQ, fire pit, parking etc.)
4. Photo gallery showing all key areas: outside of building, deck, view, kitchen, sitting area, lecture room, breakout room, fire pit
5. Testimonials section with 2 quotes:
   - Nicole Gaunt, Pew Charitable Trusts (short)
   - EPA SA (longer — include full text, Liz will decide on trimming)
6. CTA: email hello@theforktreeproject.com or call 0457 492 386

## Photos
All 33 photos from ~/Documents/Forktree Room Rental/House photos/
Include ALL photos for now — Liz will provide feedback on which to keep.
Photos need to be copied into the site's public/images/corporate-events/ directory.
Use a gallery component with lightbox or grid layout.

## Style
- Match existing site style (full-bleed sections, dark overlays, Poppins font)
- Use PageLayout.astro as the base layout
- Look at about-us.astro and testimonials.astro for reference patterns

## Visibility
- Page should be LIVE at /corporate-events but NOT added to the nav (Header.astro)
- It's hidden until Liz approves the final version

## Deployment
- Git push to main triggers Cloudflare Pages deploy (see CLAUDE.md)
- Do NOT use wrangler deploy


