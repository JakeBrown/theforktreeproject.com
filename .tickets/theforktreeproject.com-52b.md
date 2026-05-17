---
id: theforktreeproject.com-52b
status: closed
deps: []
links: []
created: 2026-04-01T11:37:26Z
type: task
priority: 2
---
# Replace blur boxes with gradient overlay + text shadow on all pages

Replace the semi-transparent backdrop-filter blur boxes behind text on hero/section backgrounds with the cleaner approach used on the corporate events page:

1. Remove `background: rgba(0,0,0,0.3); backdrop-filter: blur(6px)` boxes around text
2. Instead use: radial gradient on the section overlay (darker where text sits), text-shadow on body text, letter-spacing
3. This lets the background photos show through better while keeping text readable

Pages to update:
- index.astro (home page — has banner-text and story-text boxes with blur)
- about-us.astro
- goals.astro  
- education1.astro
- supporters.astro

Reference implementation: src/pages/corporate-events.astro — see .ce-hero::before radial gradient, .ce-hero__tagline-text text-shadow

IMPORTANT: After making changes, test BOTH desktop (1440x900) and mobile (390x844) viewports using Playwright screenshots. Use:
```
node -e "
const pw = require('/Users/jakebrown/gits/forktree/node_modules/playwright');
(async () => {
  const browser = await pw.chromium.launch( executablePath: '/Users/jakebrown/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
  // Desktop
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  await page.goto('http://localhost:PORT/PAGE')();
"
```

Build with `npm run build`, serve with `npx wrangler pages dev dist --port 4325`, then screenshot each page at both sizes. Verify text is readable over backgrounds before committing.

After all changes verified: git add, commit, push, and close this bead.


