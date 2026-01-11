# Spec Requirements: Phase 1 Foundation

## Initial Description

Build the foundation for Phill Aelony's cyberpunk developer portfolio, establishing the core visual identity and initial sections.

### Components to Build

1. **Hero Section**
   - Custom hero image
   - "Legendary Code Sorcerer" tagline
   - Animated headline text
   - Smooth scroll indicator

2. **Navigation System**
   - Accessible, responsive navigation
   - Cyberpunk styling
   - Smooth scroll to sections
   - Mobile hamburger menu with animated transitions

3. **Cyberpunk Design System**
   - Neon glow effects
   - Color palette (neon pinks, cyans, purples against dark backgrounds)
   - Typography system
   - Reusable Tailwind utilities
   - "Tokyo at midnight" aesthetic

4. **About Section**
   - Personal introduction
   - Animated text reveals
   - Minneapolis location mention
   - Brief bio establishing engineer/musician dual identity

### Context

- Owner: Phill Aelony - "Legendary Code Sorcerer | Vanquisher of Bugs | Builder of Dreams"
- Tech Stack: Next.js, TypeScript, React, Tailwind CSS, shadcn/ui, Framer Motion
- Requirements: 100% accessible (WCAG compliant), perfectly responsive, high performance (Lighthouse 90+)
- Target Users: Recruiters, fellow developers, and should be fun for a 6-year-old niece

## Requirements Discussion

### First Round Questions

**Q1:** What should the hero section height and layout be?
**Answer:** Full height (100vh), must be fully responsive and look good on mobile/any screen size.

**Q2:** How should the hero image be positioned and styled?
**Answer:** User provided an amazing photo of themselves in a poncho with llamas (transparent PNG). Can be centered or positioned to the side. Must work for both web and mobile. Add cyberpunk effects around the image.

**Q3:** How should the scroll indicator be styled?
**Answer:** Cyberpunk styled would be cool.

**Q4:** What navigation behavior and styling is expected?
**Answer:** Sticky header with glowing bottom border on scroll, hamburger menu on mobile with animated cyberpunk reveal.

**Q5:** What navigation items should be included?
**Answer:** Home and About for now, add others as needed.

**Q6:** What color palette should be used?
**Answer:** Use existing palette from `/Users/phillipaelony/Desktop/dev/phillcodes/src/app/globals.css` (documented below in Visual Assets section).

**Q7:** What typography should be used?
**Answer:** Audiowide font for headings, clean sans-serif for body.

**Q8:** What content should the About section include?
**Answer:** User provided full bio text (documented below in Bio Content section).

**Q9:** What features should be excluded from this phase?
**Answer:** Basic implementation for now - 3D graphics and audio for later phases. (Note: 3D assets exist in "Number Slayers" repo for future use.)

### Existing Code to Reference

**Similar Features Identified:**
- Feature: phillcodes - Path: `/Users/phillipaelony/Desktop/dev/phillcodes/`
  - CSS/Design System: `/Users/phillipaelony/Desktop/dev/phillcodes/src/app/globals.css`
  - Contains existing cyberpunk color palette, neon text effects, typography configuration
- Images to copy from: `/Users/phillipaelony/Desktop/dev/phillcodes/public/images`
  - Multiple Phill photos (phill1.png through phill5.png)
  - Llama images for testimonials/fun elements
  - phill_llamas.png (alternative hero option)
  - space_llama.png
  - timelycare-logo.svg

### Follow-up Questions

No follow-up questions needed - user provided comprehensive answers with all necessary details.

## Visual Assets

### Files Provided:
- `hero-image-phill-llamas.png`: High-quality transparent PNG of Phill wearing a poncho and cowboy hat, throwing a rock hand sign, surrounded by three llamas. Image has transparent background - ideal for web use and adding cyberpunk glow effects around the subject.

### Visual Insights:
- Hero image is playful and memorable - perfect for the fun, personality-driven portfolio
- Transparent background allows for creative cyberpunk effects (glows, particles, etc.)
- The llamas add humor and uniqueness that differentiates from boring portfolios
- Image composition works well for both centered and side positioning
- Rock hand sign reinforces the musician/creative identity

## Bio Content

Full About section content provided by user:

```
I was born and raised in Minneapolis, MN! I began playing music at a young age and eventually went to the University of North Texas to study jazz guitar.

I spent many years playing in bands, touring, recording, teaching, and traveling the world. I crushed it. I played with an epic band called The Funky Knuckles. However all of this grew tiresome, so I used my insanely powerful mind and firey unparallelled discipline to teach myself computer programming.

Oh yeah I also composed a ton of music for a video game called Eco which is available on Steam and I did an awesome job.

I was so good at programming that my first job was at Microsoft. That grew tiresome so I moved on to work at some more interesting startups, and now I am doing full stack development for a company called TimelyCare and it is awesome and I do great work.
```

## Color Palette (from phillcodes globals.css)

```css
:root {
  /* Background - Dark gradient base */
  --background: 220 20% 3%;           /* Near black with blue tint */
  --background-end: 180 45% 10%;      /* Dark teal for gradient */
  --foreground: 180 100% 95%;         /* Light cyan text */

  /* Cards/Surfaces */
  --card: 220 20% 8%;                 /* Slightly lighter dark */
  --card-foreground: 180 100% 95%;

  /* Primary - Cyan/Electric Blue */
  --primary: 190 100% 75%;            /* Bright cyan */
  --primary-foreground: 0 100% 100%;  /* White */

  /* Secondary - Purple/Magenta */
  --secondary: 280 225% 85%;          /* Neon purple/magenta */
  --secondary-foreground: 220 20% 5%;

  /* Muted - Deep blue */
  --muted: 230 60% 20%;               /* Dark muted blue */
  --muted-foreground: 180 30% 80%;

  /* Accent - Green/Lime */
  --accent: 130 200% 50%;             /* Neon green */
  --accent-foreground: 180 100% 95%;

  /* Borders/Inputs - Cyan */
  --border: 180 100% 50%;             /* Bright cyan borders */
  --input: 180 100% 50%;
  --ring: 180 100% 50%;

  /* Typography */
  --font-heading: var(--font-audiowide);
  --font-body: var(--font-nunito);
}
```

### Pre-built CSS Utilities Available:
- `.neon-text-green` - Green neon glow text effect
- `.neon-text-purple` - Purple neon glow text effect
- `.neon-text-blue` - Blue/cyan neon glow text effect
- `.neon-border` - Multi-color neon border glow
- `.gradient-card` - Card with gradient and hover hue-rotate effect
- `.custom-scrollbar` - Cyberpunk styled scrollbar

## Requirements Summary

### Functional Requirements

**Hero Section:**
- Full viewport height (100vh) on all screen sizes
- Phill llamas hero image with transparent background
- Cyberpunk glow effects around the hero image
- "Legendary Code Sorcerer" animated headline text
- Cyberpunk-styled scroll indicator
- Fully responsive - must work on mobile, tablet, and desktop

**Navigation System:**
- Sticky header that appears/activates on scroll
- Glowing bottom border when scrolled
- Navigation items: Home, About (expandable later)
- Mobile: Hamburger menu with animated cyberpunk reveal transition
- Smooth scroll to sections on click
- Full accessibility (keyboard navigable, ARIA labels)

**Cyberpunk Design System:**
- Implement color palette from phillcodes globals.css
- Typography: Audiowide for headings, Nunito (or clean sans-serif) for body
- Neon glow effects for text and borders
- Dark gradient background (near-black to dark teal)
- Reusable Tailwind utilities matching existing CSS classes
- "Tokyo at midnight" aesthetic throughout

**About Section:**
- Personal bio with provided content (humor and personality intact)
- Animated text reveals (Framer Motion)
- Establishes dual identity: engineer + musician
- Mentions Minneapolis origin, UNT education, The Funky Knuckles, Eco game, Microsoft, TimelyCare
- Responsive layout

### Reusability Opportunities
- CSS variables and utilities from `/Users/phillipaelony/Desktop/dev/phillcodes/src/app/globals.css`
- Neon text effect classes (`.neon-text-green`, `.neon-text-purple`, `.neon-text-blue`)
- Neon border effect (`.neon-border`)
- Gradient card styling (`.gradient-card`)
- Custom scrollbar styling (`.custom-scrollbar`)
- Typography configuration (Audiowide + Nunito fonts)

### Scope Boundaries

**In Scope:**
- Hero section with full-height responsive layout
- Hero image with cyberpunk glow effects
- Animated headline with "Legendary Code Sorcerer" tagline
- Cyberpunk-styled scroll indicator
- Sticky navigation with glow effect on scroll
- Mobile hamburger menu with animated reveal
- Complete cyberpunk design system (colors, typography, utilities)
- About section with full bio content
- Animated text reveals
- Fully responsive design (mobile-first)
- WCAG accessibility compliance

**Out of Scope:**
- 3D graphics and Three.js elements (Phase 6)
- Audio/music player functionality (Phase 5)
- Work experience timeline (Phase 2)
- Skills showcase (Phase 2)
- Project gallery (Phase 2)
- Contact form (Phase 3)
- AI chatbot (Phase 7)

### Technical Considerations
- Framework: Next.js with App Router
- Language: TypeScript
- Styling: Tailwind CSS with custom cyberpunk design tokens
- Components: shadcn/ui where applicable
- Animation: Framer Motion for complex animations
- Images: Next.js Image component with optimization
- Fonts: Audiowide (headings) + Nunito (body) via Next.js Font
- Performance target: Lighthouse 90+
- Accessibility target: WCAG 2.1 AA compliance
- Browser support: Modern evergreen browsers + mobile Safari/Chrome

### Assets to Copy/Reference
From `/Users/phillipaelony/Desktop/dev/phillcodes/public/images`:
- phill1.png through phill5.png (profile photos)
- llama_*.jpg/jpeg (testimonial avatars for future use)
- phill_llamas.png (alternative hero option)
- space_llama.png
- timelycare-logo.svg

Hero image source:
- `/Users/phillipaelony/Desktop/dev/phill-aelony-front-end-dev/static/images/phill_llamas_transparent.png`

Future reference (not for Phase 1):
- 3D assets in "Number Slayers" repo for Phase 6
