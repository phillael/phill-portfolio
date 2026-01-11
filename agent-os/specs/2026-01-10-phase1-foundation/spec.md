# Specification: Phase 1 Foundation

## Goal

Build the foundational elements of Phill Aelony's cyberpunk developer portfolio, establishing the core visual identity, design system, and initial sections (Hero, Navigation, About) that set the stage for all future phases.

## User Stories

- As a recruiter, I want to immediately see Phill's personality and branding so that I can quickly assess culture fit and remember this portfolio
- As a visitor, I want smooth, accessible navigation so that I can easily explore different sections without friction

## Specific Requirements

**Hero Section - Full Viewport Layout**
- Full viewport height (100vh) on all devices with responsive adjustments
- Center the hero image on desktop; stack vertically on mobile
- Use CSS `min-h-screen` with flex layout for proper centering
- Ensure content remains accessible and visible on all viewport sizes
- Hero image must be responsive using Next.js Image component with `fill` and `object-contain`

**Hero Image with Cyberpunk Effects**
- Use transparent PNG hero image (`hero-image-phill-llamas.png`)
- Apply animated neon glow effect around the image using CSS box-shadow with multiple layers
- Glow colors should cycle through cyan, magenta, and purple to match the cyberpunk palette
- Use Framer Motion for entrance animation (scale from 0 to 1 with spring physics)
- Image alt text: "Phill Aelony wearing a poncho and cowboy hat, throwing a rock hand sign, surrounded by three llamas"

**Animated Headline Text**
- Display "Legendary Code Sorcerer" as the primary tagline
- Include secondary taglines: "Vanquisher of Bugs" and "Builder of Dreams"
- Use Framer Motion for staggered text reveal animation (each word or line appears sequentially)
- Apply `.neon-text-green` or `.neon-text-blue` effect to headline
- Typography: Audiowide font for headings at responsive sizes (`text-4xl md:text-6xl lg:text-7xl`)

**Cyberpunk Scroll Indicator**
- Position at bottom center of hero section
- Animated bouncing arrow or chevron pointing downward
- Apply neon glow effect matching the design system
- Use Framer Motion for continuous bounce animation
- Must be keyboard accessible and function as a button that smooth-scrolls to About section
- Include `aria-label="Scroll to about section"` for screen readers

**Sticky Navigation Header**
- Initially transparent or subtle, becomes solid with glowing bottom border on scroll
- Use `position: sticky` with `top: 0` and appropriate z-index
- Glowing border effect using `.neon-border` or custom box-shadow when scrolled past threshold (e.g., 50px)
- Navigation items for Phase 1: Home (scrolls to top), About
- Smooth scroll behavior on all navigation link clicks using `scrollIntoView({ behavior: 'smooth' })`
- Track scroll position with `useEffect` and `useState` to toggle header state

**Mobile Navigation - Hamburger Menu**
- Show hamburger icon on screens below `md` breakpoint (768px)
- Animated hamburger icon transformation (three lines to X)
- Full-screen or slide-in overlay with cyberpunk styling
- Use Framer Motion for menu reveal animation (slide in from right or fade in)
- Menu background with dark gradient and neon border accents
- Navigation links centered with large touch targets (minimum 44x44px)
- Focus trap when menu is open; close on Escape key press

**Cyberpunk Design System - Colors**
- Primary: Bright cyan (`hsl(190, 100%, 75%)`)
- Secondary: Neon purple/magenta (`hsl(280, 225%, 85%)`)
- Accent: Neon green (`hsl(130, 200%, 50%)`)
- Background: Near-black with blue tint (`hsl(220, 20%, 3%)`) to dark teal gradient (`hsl(180, 45%, 10%)`)
- Foreground: Light cyan (`hsl(180, 100%, 95%)`)
- Implement as CSS custom properties in globals.css matching the established phillcodes palette

**Cyberpunk Design System - Typography**
- Headings: Audiowide font (Google Fonts) via Next.js Font optimization
- Body: Nunito font (Google Fonts) with weights 400, 500, 600, 700
- Set CSS variables `--font-heading` and `--font-body` for consistent application
- Heading sizes using Tailwind's responsive typography scale
- Line height and letter spacing tuned for readability on dark backgrounds

**Neon Effect Utilities**
- `.neon-text-green`: Multi-layer text-shadow with green/cyan glow
- `.neon-text-purple`: Multi-layer text-shadow with purple/magenta glow
- `.neon-text-blue`: Multi-layer text-shadow with cyan/blue glow
- `.neon-border`: Multi-color box-shadow for glowing borders
- `.gradient-card`: Card with gradient background and hover hue-rotate effect
- `.custom-scrollbar`: Styled scrollbar with primary color thumb

**About Section Content and Layout**
- Section ID `#about` for navigation anchor
- Full bio content with personality and humor intact
- Structure: Minneapolis origin, music background (UNT, jazz guitar), The Funky Knuckles band, Eco game soundtrack, transition to programming, Microsoft, TimelyCare
- Layout: responsive container with max-width, centered text or two-column on larger screens
- Consider splitting into paragraphs with visual breaks or animated reveals between sections

**About Section Animations**
- Use Framer Motion `whileInView` for scroll-triggered animations
- Staggered paragraph reveals (fade in and slide up sequentially)
- Apply `viewport={{ once: true, amount: 0.2 }}` to trigger when 20% visible
- Animation duration 0.6-1.0 seconds with easing for smooth feel
- Optional: highlight key terms (band names, companies) with subtle glow on reveal

## Visual Design

**`planning/visuals/hero-image-phill-llamas.png`**
- High-quality transparent PNG ideal for layering effects
- Subject: Phill in poncho and cowboy hat with rock hand sign, three llamas
- Transparent background allows for creative glow effects around the subject
- Composition works for both centered and side positioning
- Rock hand sign reinforces musician/creative identity
- Playful, memorable image that differentiates from typical portfolio photos
- Llamas add humor and approachability
- Image should maintain quality at large sizes (max-width 500-600px on desktop)

## Existing Code to Leverage

**globals.css from phillcodes**
- Complete CSS custom properties for the cyberpunk color palette
- Neon text effect classes (`.neon-text-green`, `.neon-text-purple`, `.neon-text-blue`)
- Neon border effect (`.neon-border`)
- Gradient card styling (`.gradient-card`)
- Custom scrollbar styling (`.custom-scrollbar`)

**layout.tsx Font Configuration**
- Audiowide and Nunito font setup using `next/font/google`
- CSS variable configuration (`--font-audiowide`, `--font-nunito`)
- HTML class application pattern for font variables
- Metadata structure for SEO

**AnimatedSection Component**
- Framer Motion scroll-triggered animation pattern
- Variants object structure for offscreen/onscreen states
- `whileInView` and `viewport` configuration
- Reusable wrapper component pattern

**HeroImage Component**
- Next.js Image component with `fill` prop pattern
- Framer Motion entrance animation with spring physics
- Aspect ratio container technique
- Wrapper component structure for effects

**Nav Component**
- Scroll position tracking with useEffect pattern
- Active section detection logic
- Smooth scroll onClick handler
- Navigation item type definition

## Out of Scope

- 3D graphics and Three.js elements (Phase 6)
- Audio player and music functionality (Phase 5)
- Work experience timeline section (Phase 2)
- Skills showcase section (Phase 2)
- Project gallery section (Phase 2)
- Education and certifications section (Phase 2)
- Contact form and section (Phase 3)
- Downloadable PDF resume (Phase 3)
- AI chatbot functionality (Phase 7)
- Easter eggs and hidden features (Phase 6)
