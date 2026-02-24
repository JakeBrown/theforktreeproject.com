# The Forktree Project - Squarespace to Astro Migration Spec

## Overview

Convert theforktreeproject.com from Squarespace to a static Astro site. The site is for an Australian registered charity focused on habitat restoration, rewilding, and environmental education on a 133-acre property in South Australia's Fleurieu Peninsula.

## Source Site Analysis

**Current platform:** Squarespace (Bedford template family)
**Domain:** theforktreeproject.com / www.theforktreeproject.com
**Region:** Australia (AEDT timezone)

### Site Map (8 main pages + 1 sub-page)

| Route | Title | Type |
|---|---|---|
| `/` | Home | Index page with hero slideshow + stats |
| `/about-us` | The Project | Multi-section scrolling page (Intro, The Idea, The Team, Impact) |
| `/goals` | Goals | Numbered goals (1-4) with full-width background images |
| `/education1` | Education | Two sections: Education Program + Carbon Assessment |
| `/supporters` | Supporters | Partner logos + testimonials |
| `/journal` | Journal | Blog listing (grid layout, paginated) |
| `/donate` | Donate | Donation CTA linking to Australian Geographic Society |
| `/join-us` | Join Us | Contact form + volunteering info |
| `/testimonials` | Testimonials | School testimonials (also duplicated on Supporters page) |

### Navigation Structure

**Primary nav:** Home, The Project, Goals, Education, Supporters, Journal, Donate, Join Us
**Social:** Instagram (@forktreeproject)
**Branding:** Green tree logo (ForktreeGreen_Fill_sml.png)

### Design Characteristics

- Full-width hero sections with parallax background images
- Dark/moody nature photography aesthetic
- Clean sans-serif typography (loaded via Typekit)
- Green accent color (brand color from logo)
- Minimal UI, content-focused layout
- Mobile hamburger menu overlay
- Sticky header with logo
- Footer with ACNC Registered Charity badge + Instagram icon
- Section-based scrolling on index pages (Home, About, Goals, Education, Supporters)

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Astro 5.x** | Static site generation, great perf |
| UI (static) | **Astro components** (.astro) | All static content pages |
| UI (interactive) | **React** | Mobile nav toggle, contact form |
| Styling | **CSS** (scoped + global) | Keep it simple, no framework needed |
| Content (blog) | **Astro Content Collections** (Markdown) | Journal/blog posts |
| Deployment | TBD (Vercel/Netlify/Cloudflare) | Static hosting |

---

## Project Structure

```
theforktreeproject.com/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.ico
│   └── images/
│       ├── logo.png              # ForktreeGreen_Fill_sml.png
│       ├── acnc-badge.png        # ACNC Registered Charity logo
│       ├── hero/                 # Homepage hero/slideshow backgrounds
│       ├── about/                # About page section backgrounds
│       ├── goals/                # Goals page backgrounds
│       ├── education/            # Education page backgrounds
│       ├── supporters/           # Supporter/partner logos
│       ├── donate/               # Donate page imagery
│       ├── join-us/              # Join Us page imagery
│       └── journal/              # Blog post images
├── src/
│   ├── components/
│   │   ├── Header.astro          # Site header with logo + nav
│   │   ├── Footer.astro          # Footer with ACNC badge + social
│   │   ├── MobileNav.tsx         # React: hamburger menu overlay
│   │   ├── ContactForm.tsx       # React: contact form with validation
│   │   ├── Hero.astro            # Full-width hero section
│   │   ├── SectionNav.astro      # In-page section navigation (index pages)
│   │   ├── GoalCard.astro        # Numbered goal display
│   │   ├── Testimonial.astro     # Testimonial quote block
│   │   ├── BlogCard.astro        # Journal listing card
│   │   └── SupporterLogos.astro  # Logo grid for supporters
│   ├── layouts/
│   │   ├── BaseLayout.astro      # HTML shell, head, global styles
│   │   ├── PageLayout.astro      # Standard page (header + content + footer)
│   │   └── BlogPost.astro        # Blog post detail layout
│   ├── pages/
│   │   ├── index.astro           # Home
│   │   ├── about-us.astro        # The Project
│   │   ├── goals.astro           # Goals
│   │   ├── education1.astro      # Education (keep URL for compat)
│   │   ├── supporters.astro      # Supporters
│   │   ├── journal/
│   │   │   └── index.astro       # Journal listing
│   │   │   └── [...slug].astro   # Dynamic blog post pages
│   │   ├── donate.astro          # Donate
│   │   ├── join-us.astro         # Join Us
│   │   └── testimonials.astro    # Testimonials
│   ├── content/
│   │   └── journal/              # Markdown blog posts
│   │       ├── beginnings.md
│   │       ├── friends-of-forktree-planting-day-2025.md
│   │       └── ...
│   └── styles/
│       └── global.css            # Global styles, CSS custom properties
```

---

## Page Specifications

### Home (`/`)

- **Hero:** Full-viewport slideshow/banner with parallax background image
- **Headline:** "Re-wilding. It's in our nature."
- **Stats section:** Three impact statements:
  - "Global extinction rates of plants and animals are 100 times higher because of us."
  - "Australia is one of seven countries responsible for more than half of global biodiversity loss."
  - "If we planted trees on all the suitable spare land that existed globally, we could store over 200 billion tonnes of carbon and buy 20 years in the fight against climate change."
  - "Australia is one of the top countries globally with such tree-planting potential."
- **CTA:** "Project Overview >>" linking to /about-us
- **Section nav:** Banner, Story 1, Story 2 (side navigation dots)

### The Project (`/about-us`)

- **Intro section:** Mission statement (133-acre property, tens of thousands of native trees)
- **The Idea section:** Why Fleurieu Peninsula, project history from April 2019
- **The Team section:** 
  - Tim Jarvis AM - environmental scientist, author, adventurer, WWF Global Ambassador
  - Elizabeth Blumer - teaching, governance, writing
  - Miles Rowland - cinematographer
- **Impact section:** Two levels - practical on-ground work + systemic influence on small/medium farms
- **CTA:** "Our Goals >>" linking to /goals

### Goals (`/goals`)

- **Intro banner** with mission statement
- **4 numbered goals** (each as full-width section with background image):
  1. Restore native vegetation / rewilding / regenerative agriculture
  2. Operate nursery and rare seed orchard
  3. Provide environmental and experiential education
  4. Open-source example of regenerative land/water/energy/waste management
- **CTA:** "Resources >>" (note: /resources returned 404 on source - omit or link to education)

### Education (`/education1`)

- **Education Program section:**
  - Experiential sustainability education for young people
  - Works with Australian Curriculum, SACE, IB
  - Day excursions, overnight camping, extended programs
  - PDF downloads (3 program documents)
  - CTA: "Get in Touch" -> /join-us
- **Carbon Assessment Methodologies section:**
  - Role of small/medium properties in carbon sequestration
  - Trialling carbon measurement methodologies
  - CTA: "Get in Touch" -> /join-us

### Supporters (`/supporters`)

- **Supporting Partners:** Logo grid image (SP_v3.png)
- **Supporters:** Logo grid image (S_V3.png)
- **Advisory Supporters:** Additional logo grid (LOGO PAGE 2.png)
- **Testimonials:** 6 school testimonials (Blackwood HS, Tatachilla, Prince Alfred College, Adelaide Botanic HS, Annesley Junior School, Operation Flinders)

### Journal (`/journal`)

- **Blog listing:** Grid layout (2 columns)
- **Each card:** Thumbnail image, title, author ("Elizabeth Jarvis"), date
- **Pagination:** "Older" link at bottom
- **Blog content** managed via Astro Content Collections (Markdown files)
- Note: Individual blog posts need their own dynamic route

### Donate (`/donate`)

- **Heading:** "Help us to re-establish habitat!"
- **Hero image** of the property
- **Description** of the project and donation mechanism
- **External donate link** to Australian Geographic Society fundraising page
- **Note** about tax deductibility
- Links back to journal and AG Society newsletter

### Join Us (`/join-us`)

- **Hero image**
- **Text:** Charity info, ways to support (volunteering, in-kind, donation)
- **Contact form** (React component with fields TBD - likely name, email, message)
- **Volunteering signup link** (external)

### Testimonials (`/testimonials`)

- **6 testimonial blocks** (same content as on Supporters page)
- Each with quote text + school name attribution
- Separated by horizontal rules

---

## Component Specifications

### Header.astro
- Fixed/sticky positioning
- Logo (links to /)
- Desktop nav links (horizontal)
- Mobile: show hamburger icon, trigger MobileNav
- Search icon (optional - low priority)
- Instagram social icon

### MobileNav.tsx (React)
- Slide-in overlay from right
- Full nav link list
- Close button
- Logo at bottom of overlay
- Body scroll lock when open

### Footer.astro
- ACNC Registered Charity badge
- Instagram icon link
- Minimal design

### ContactForm.tsx (React)
- Fields: First Name, Last Name, Email, Subject, Message
- Client-side validation
- Submit handler (will need a form backend - Formspree/Netlify Forms/etc.)
- Success/error states

### Hero.astro
- Full-viewport height section
- Background image with parallax effect (CSS `background-attachment: fixed`)
- Overlay text content (headings, body, CTA)
- Configurable via props

### BlogCard.astro
- Thumbnail image (square aspect ratio)
- Post title
- Author name
- Date
- Link to full post

---

## Design Tokens / CSS Custom Properties

```css
:root {
  /* Colors - derived from Squarespace site */
  --color-primary: #2d5a27;       /* Forktree green (from logo) */
  --color-text: #1a1a1a;
  --color-text-light: #ffffff;
  --color-bg: #ffffff;
  --color-bg-dark: #1a1a1a;
  --color-border: #e0e0e0;

  /* Typography */
  --font-heading: 'freight-display-pro', Georgia, serif;
  --font-body: 'freight-sans-pro', -apple-system, sans-serif;

  /* Spacing */
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 2rem;
  --space-lg: 4rem;
  --space-xl: 8rem;

  /* Layout */
  --max-width: 1200px;
  --header-height: 80px;
  --mobile-breakpoint: 640px;
}
```

---

## Image Strategy

Images are currently hosted on Squarespace CDN (`images.squarespace-cdn.com`). For the Astro build:

1. **Logo + badge:** Download and place in `public/images/`
2. **Hero/background images:** Download key hero images for each page section
3. **Supporter logos:** Download the composite logo images
4. **Blog images:** Download thumbnail images for existing journal posts
5. **Use Astro's `<Image />` component** from `astro:assets` for optimization where possible

All Squarespace CDN URLs will need to be replaced with local paths.

---

## SEO / Meta

- Preserve existing page titles (e.g., "The Forktree Project", "About Us - The Forktree Project")
- OpenGraph tags: title, description, image, url
- Twitter card: summary
- Canonical URLs
- JSON-LD structured data (WebSite schema)
- RSS feed for journal (`/journal/rss.xml`)

---

## Out of Scope (for initial build)

- Search functionality (was present but minimal on Squarespace)
- E-commerce / store (existed in Squarespace config but not used)
- Cookie consent banner (was disabled on source)
- Blog post migration (stub posts will be created; full content migration is a follow-up)
- Form backend integration (form UI built, backend TBD)
- PDF hosting for education documents (link to external or add to public/)
- Analytics integration

---

## Build & Dev Commands

```bash
npm create astro@latest .     # Initialize in current directory
npm install @astrojs/react react react-dom
npm run dev                   # Dev server
npm run build                 # Production build
npm run preview               # Preview production build
```

---

## Migration Priority Order

1. Project scaffolding (Astro init + React integration)
2. Layouts (BaseLayout, PageLayout)
3. Core components (Header, Footer, MobileNav)
4. Static pages (Home, About, Goals, Education, Supporters, Donate, Join Us, Testimonials)
5. Blog system (Content Collections, Journal listing, post template)
6. Interactive components (ContactForm, MobileNav)
7. Styling polish + responsive design
8. Image optimization + download assets
9. SEO meta tags + RSS feed
10. Build verification + deployment prep
