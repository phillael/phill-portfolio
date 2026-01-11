# Task Breakdown: Phase 1 Foundation

## Overview

**Total Tasks:** 42 sub-tasks across 6 task groups
**Estimated Duration:** 3-4 development sessions
**Dependencies:** None (greenfield project)

This phase establishes the foundational elements of Phill Aelony's cyberpunk developer portfolio, including project setup, design system, Hero section, Navigation, and About section.

## Task List

---

### Project Setup

#### Task Group 1: Next.js Project Initialization
**Dependencies:** None
**Complexity:** Low
**Estimated Time:** 30-45 minutes

- [x] 1.0 Complete project setup and configuration
  - [x] 1.1 Initialize Next.js project with TypeScript and App Router
    - Run `npx create-next-app@latest` with TypeScript, Tailwind CSS, ESLint, App Router options
    - Project name: `phill-portfolio` (or use existing directory)
    - Configure `tsconfig.json` with strict mode
  - [x] 1.2 Install required dependencies
    - Core: `framer-motion` for animations
    - UI: `@radix-ui/react-*` components as needed for shadcn/ui
    - Fonts: Configure via `next/font/google`
    - Dev: Ensure ESLint and Prettier are configured
  - [x] 1.3 Configure Tailwind CSS with custom theme
    - Extend `tailwind.config.ts` with cyberpunk color palette
    - Add custom font families (Audiowide, Nunito)
    - Configure responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
  - [x] 1.4 Set up folder structure
    - `/src/app` - App Router pages and layouts
    - `/src/components` - Reusable React components
    - `/src/components/ui` - shadcn/ui base components
    - `/src/lib` - Utility functions and helpers
    - `/src/styles` - Global styles and CSS utilities
    - `/public/images` - Static image assets
  - [x] 1.5 Copy and configure hero image asset
    - Copy `hero-image-phill-llamas.png` from `planning/visuals/` to `/public/images/`
    - Verify image dimensions and optimize if needed
  - [x] 1.6 Verify project builds and runs successfully
    - Run `npm run dev` and confirm no errors
    - Verify hot reload works correctly

**Acceptance Criteria:**
- Project runs with `npm run dev` without errors
- TypeScript compilation succeeds
- Tailwind CSS utilities are available
- Hero image is accessible at `/images/hero-image-phill-llamas.png`

**Files to Create/Modify:**
- `/src/app/layout.tsx` - Root layout with font configuration
- `/src/app/page.tsx` - Main page placeholder
- `/src/app/globals.css` - Global styles
- `tailwind.config.ts` - Tailwind configuration
- `tsconfig.json` - TypeScript configuration

---

### Design System

#### Task Group 2: Cyberpunk Design System Implementation
**Dependencies:** Task Group 1
**Complexity:** Medium
**Estimated Time:** 1-1.5 hours

- [x] 2.0 Complete cyberpunk design system
  - [x] 2.1 Write 2-4 focused tests for design system utilities
    - Test neon text effect class application
    - Test color CSS variable availability
    - Test font family CSS variable availability
    - Keep tests minimal - verify CSS classes exist and apply correctly
  - [x] 2.2 Implement CSS custom properties for color palette
    - Primary: `--primary: 190 100% 75%` (bright cyan)
    - Secondary: `--secondary: 280 225% 85%` (neon purple/magenta)
    - Accent: `--accent: 130 200% 50%` (neon green)
    - Background: `--background: 220 20% 3%` (near-black with blue tint)
    - Background gradient end: `--background-end: 180 45% 10%` (dark teal)
    - Foreground: `--foreground: 180 100% 95%` (light cyan)
    - Card, muted, border, input, ring colors as specified
    - Reference: `/Users/phillipaelony/Desktop/dev/phillcodes/src/app/globals.css`
  - [x] 2.3 Configure typography with Next.js Font optimization
    - Import Audiowide font for headings via `next/font/google`
    - Import Nunito font (weights: 400, 500, 600, 700) for body
    - Set CSS variables: `--font-heading` and `--font-body`
    - Apply font classes to HTML element in layout.tsx
  - [x] 2.4 Create neon text effect utility classes
    - `.neon-text-green`: Multi-layer text-shadow with green/cyan glow
    - `.neon-text-purple`: Multi-layer text-shadow with purple/magenta glow
    - `.neon-text-blue`: Multi-layer text-shadow with cyan/blue glow
    - Ensure sufficient contrast for accessibility (test against dark backgrounds)
  - [x] 2.5 Create neon border and card utility classes
    - `.neon-border`: Multi-color box-shadow for glowing borders
    - `.gradient-card`: Card with gradient background and hover hue-rotate effect
    - `.custom-scrollbar`: Styled scrollbar with primary color thumb
  - [x] 2.6 Implement global background gradient
    - Apply dark gradient from `--background` to `--background-end`
    - Use `min-h-screen` to cover full viewport
    - Ensure gradient direction creates depth (top-left to bottom-right or vertical)
  - [x] 2.7 Ensure design system tests pass
    - Run ONLY the 2-4 tests written in 2.1
    - Verify CSS variables are accessible in browser dev tools
    - Visually verify neon effects render correctly

**Acceptance Criteria:**
- The 2-4 tests written in 2.1 pass
- All CSS custom properties are defined and accessible
- Neon text effects are visible and maintain readability
- Typography scales appropriately across breakpoints
- Color contrast meets WCAG AA standards for body text

**Files to Create/Modify:**
- `/src/app/globals.css` - CSS custom properties and utility classes
- `/src/app/layout.tsx` - Font configuration and HTML class application
- `tailwind.config.ts` - Color and font family extensions

---

### Hero Section

#### Task Group 3: Hero Section Components
**Dependencies:** Task Group 2
**Complexity:** High
**Estimated Time:** 2-2.5 hours

- [x] 3.0 Complete Hero section implementation
  - [x] 3.1 Write 2-4 focused tests for Hero section
    - Test Hero section renders with correct structure
    - Test headline text content is present
    - Test scroll indicator button is keyboard accessible
    - Test hero image has proper alt text
  - [x] 3.2 Create HeroSection container component
    - Full viewport height using `min-h-screen` with flex layout
    - Responsive layout: center content on desktop, stack vertically on mobile
    - Apply background gradient from design system
    - Section ID for potential navigation anchor
  - [x] 3.3 Create HeroImage component with cyberpunk effects
    - Use Next.js Image component with `fill` and `object-contain`
    - Wrap in aspect ratio container for proper sizing
    - Apply animated neon glow effect using CSS box-shadow
    - Glow colors cycle through cyan, magenta, purple (CSS animation or Framer Motion)
    - Framer Motion entrance animation: scale from 0 to 1 with spring physics
    - Alt text: "Phill Aelony wearing a poncho and cowboy hat, throwing a rock hand sign, surrounded by three llamas"
    - Max width: 500-600px on desktop, responsive scaling on mobile
  - [x] 3.4 Create AnimatedHeadline component
    - Primary tagline: "Legendary Code Sorcerer"
    - Secondary taglines: "Vanquisher of Bugs" and "Builder of Dreams"
    - Typography: Audiowide font, responsive sizes (`text-4xl md:text-6xl lg:text-7xl`)
    - Apply `.neon-text-green` or `.neon-text-blue` effect
    - Framer Motion staggered text reveal animation (word by word or line by line)
    - Animation variants: initial (opacity 0, y offset), animate (opacity 1, y 0)
  - [x] 3.5 Create ScrollIndicator component
    - Position at bottom center of hero section
    - Animated bouncing arrow or chevron pointing downward
    - Apply neon glow effect matching design system
    - Framer Motion continuous bounce animation (infinite loop)
    - Render as `<button>` element for accessibility
    - `aria-label="Scroll to about section"`
    - onClick handler: smooth scroll to About section using `scrollIntoView({ behavior: 'smooth' })`
    - Visible focus indicator for keyboard navigation
  - [x] 3.6 Integrate Hero section into main page
    - Import and render HeroSection in `/src/app/page.tsx`
    - Verify layout works across viewport sizes
    - Test smooth scroll functionality
  - [x] 3.7 Ensure Hero section tests pass
    - Run ONLY the 2-4 tests written in 3.1
    - Verify animations trigger correctly
    - Test keyboard accessibility of scroll indicator

**Acceptance Criteria:**
- The 2-4 tests written in 3.1 pass
- Hero section fills viewport height on all screen sizes
- Hero image displays with animated neon glow effect
- Headline text animates in with staggered reveal
- Scroll indicator bounces and scrolls to About section on click
- All interactive elements are keyboard accessible

**Files to Create/Modify:**
- `/src/components/HeroSection.tsx` - Main hero container
- `/src/components/HeroImage.tsx` - Image with glow effects
- `/src/components/AnimatedHeadline.tsx` - Animated text component
- `/src/components/ScrollIndicator.tsx` - Bouncing scroll button
- `/src/app/page.tsx` - Page integration

---

### Navigation

#### Task Group 4: Navigation System
**Dependencies:** Task Group 2
**Complexity:** High
**Estimated Time:** 2-2.5 hours

- [x] 4.0 Complete navigation system implementation
  - [x] 4.1 Write 2-4 focused tests for Navigation
    - Test navigation renders with Home and About links
    - Test mobile menu toggle button is keyboard accessible
    - Test navigation links have proper href values
    - Test scroll state changes header styling
  - [x] 4.2 Create Nav component with sticky header
    - `position: sticky` with `top: 0` and appropriate z-index (z-50)
    - Initially transparent or subtle background
    - Track scroll position with `useEffect` and `useState`
    - Threshold: ~50px scroll triggers solid background with neon border
    - Apply `.neon-border` or custom box-shadow when scrolled
    - Transition effect for smooth state change
  - [x] 4.3 Create NavLinks component for desktop
    - Navigation items: Home (scrolls to top), About (scrolls to #about)
    - Horizontal layout visible on `md` breakpoint and above (hidden below)
    - Smooth scroll onClick handler using `scrollIntoView({ behavior: 'smooth' })`
    - Active state styling based on current scroll position (optional for Phase 1)
    - Typography: Nunito font, appropriate sizing
    - Hover states with neon glow effect
  - [x] 4.4 Create HamburgerButton component
    - Visible on screens below `md` breakpoint (768px)
    - Three-line to X transformation animation on toggle
    - Use Framer Motion for smooth line transformations
    - `aria-label="Open navigation menu"` / `"Close navigation menu"` based on state
    - `aria-expanded` attribute reflecting menu state
    - Minimum touch target: 44x44px
  - [x] 4.5 Create MobileMenu component
    - Full-screen overlay or slide-in panel from right
    - Dark gradient background with neon border accents
    - Framer Motion reveal animation (slide in from right or fade in)
    - Navigation links centered with large touch targets (minimum 44x44px)
    - Close button or tap outside to dismiss
  - [x] 4.6 Implement focus trap and keyboard handling for mobile menu
    - Focus trap when menu is open (prevent tabbing outside)
    - Close on Escape key press
    - Return focus to hamburger button when menu closes
    - Use `useEffect` for keyboard event listeners
  - [x] 4.7 Integrate Navigation into layout
    - Add Nav component to root layout or main page
    - Position above main content
    - Verify z-index layering works correctly
  - [x] 4.8 Ensure Navigation tests pass
    - Run ONLY the 2-4 tests written in 4.1
    - Test mobile menu opens and closes correctly
    - Verify keyboard navigation works end-to-end

**Acceptance Criteria:**
- The 2-4 tests written in 4.1 pass
- Header is sticky and changes appearance on scroll
- Desktop navigation shows links horizontally
- Mobile hamburger menu shows below 768px
- Menu opens/closes with smooth animation
- Focus trap works when mobile menu is open
- Escape key closes mobile menu
- All navigation links scroll smoothly to sections

**Files to Create/Modify:**
- `/src/components/Nav.tsx` - Main navigation container
- `/src/components/NavLinks.tsx` - Desktop navigation links
- `/src/components/HamburgerButton.tsx` - Mobile menu toggle
- `/src/components/MobileMenu.tsx` - Mobile menu overlay
- `/src/app/layout.tsx` or `/src/app/page.tsx` - Navigation integration

---

### About Section

#### Task Group 5: About Section
**Dependencies:** Task Groups 2, 3 (for scroll target)
**Complexity:** Medium
**Estimated Time:** 1.5-2 hours

- [x] 5.0 Complete About section implementation
  - [x] 5.1 Write 2-4 focused tests for About section
    - Test About section has correct ID (#about) for navigation
    - Test bio content paragraphs are present
    - Test section uses semantic HTML (section, headings)
    - Test animated elements have proper ARIA attributes if needed
  - [x] 5.2 Create AboutSection container component
    - Section ID: `about` for navigation anchor
    - Responsive container with max-width (e.g., `max-w-4xl mx-auto`)
    - Padding for comfortable reading
    - Background: subtle variation or transparent over main gradient
  - [x] 5.3 Create AnimatedSection wrapper component
    - Reusable Framer Motion scroll-triggered animation wrapper
    - `whileInView` prop for scroll-based triggering
    - `viewport={{ once: true, amount: 0.2 }}` configuration
    - Animation variants: offscreen (opacity 0, y: 50), onscreen (opacity 1, y: 0)
    - Animation duration: 0.6-1.0 seconds with easing
  - [x] 5.4 Structure About content with full bio
    - Section heading: "About" or "About Me" with Audiowide font
    - Bio paragraphs (preserve personality and humor):
      1. Minneapolis origin, music beginnings, UNT jazz guitar
      2. Band career, touring, The Funky Knuckles
      3. Eco video game soundtrack work
      4. Transition to programming, Microsoft, TimelyCare
    - Consider visual breaks between paragraphs
  - [x] 5.5 Implement staggered paragraph reveal animations
    - Wrap each paragraph in AnimatedSection
    - Add stagger delay (0.1-0.2s) between paragraphs
    - Fade in and slide up sequentially as user scrolls
  - [x] 5.6 Add optional keyword highlighting
    - Subtle glow effect on key terms: "The Funky Knuckles", "Eco", "Microsoft", "TimelyCare"
    - Use `.neon-text-*` class or custom inline style
    - Ensure highlighted text maintains readability
  - [x] 5.7 Ensure About section tests pass
    - Run ONLY the 2-4 tests written in 5.1
    - Verify scroll-triggered animations work
    - Check section is navigable from header links

**Acceptance Criteria:**
- The 2-4 tests written in 5.1 pass
- Section has ID `about` for navigation
- Full bio content is displayed with personality intact
- Paragraphs animate in sequentially on scroll
- Typography is readable and properly styled
- Key terms are optionally highlighted with subtle effects

**Files to Create/Modify:**
- `/src/components/AboutSection.tsx` - About section container
- `/src/components/AnimatedSection.tsx` - Reusable animation wrapper
- `/src/app/page.tsx` - Page integration

---

### Testing & Accessibility

#### Task Group 6: Test Review, Accessibility & Responsive Verification
**Dependencies:** Task Groups 1-5
**Complexity:** Medium
**Estimated Time:** 1-1.5 hours

- [x] 6.0 Complete testing and accessibility verification
  - [x] 6.1 Review tests from Task Groups 2-5
    - Review the 2-4 tests from design system (Task 2.1)
    - Review the 2-4 tests from Hero section (Task 3.1)
    - Review the 2-4 tests from Navigation (Task 4.1)
    - Review the 2-4 tests from About section (Task 5.1)
    - Total existing tests: approximately 8-16 tests
  - [x] 6.2 Analyze test coverage gaps for Phase 1 features only
    - Identify critical user workflows lacking coverage
    - Focus on: full page scroll navigation, mobile menu flow, animation triggers
    - Do NOT assess entire application - focus only on Phase 1 scope
  - [x] 6.3 Write up to 8 additional strategic tests if needed
    - Integration test: full page renders without errors
    - Integration test: navigation to About section works end-to-end
    - Accessibility test: all interactive elements have accessible names
    - Mobile test: hamburger menu flow (open, navigate, close)
    - Skip edge cases and performance tests unless critical
  - [x] 6.4 Run feature-specific tests only
    - Run all Phase 1 tests (expected total: 16-24 tests maximum)
    - Do NOT run tests for features outside Phase 1 scope
    - Verify all critical workflows pass
  - [x] 6.5 Conduct accessibility audit
    - Verify color contrast ratios (4.5:1 minimum for text)
    - Test keyboard navigation flow: Tab through all interactive elements
    - Test focus indicators are visible on all focusable elements
    - Check ARIA labels on scroll indicator and mobile menu
  - [x] 6.6 Verify responsive design across breakpoints
    - Mobile (320px - 767px): Stack layout, hamburger menu visible, readable text
    - Tablet (768px - 1023px): Transition layout, desktop nav visible
    - Desktop (1024px+): Full layout with centered hero, side-by-side elements if applicable
    - Verify touch targets are minimum 44x44px on mobile
    - Confirm no horizontal scrolling occurs at any breakpoint
  - [x] 6.7 Lighthouse performance audit
    - Target scores: Performance 90+, Accessibility 100, Best Practices 90+, SEO 90+
    - Address any critical issues (LCP, CLS, FID)
    - Optimize images if needed (ensure Next.js Image optimization is working)
  - [x] 6.8 Document any known issues or future improvements
    - Note any deferred accessibility improvements
    - Document animation performance considerations

**Acceptance Criteria:**
- All Phase 1 tests pass (approximately 16-24 tests total)
- No critical accessibility violations
- Color contrast meets WCAG AA standards
- Keyboard navigation works for all interactive elements
- Responsive design works at all standard breakpoints
- Lighthouse scores meet targets (90+ Performance, 100 Accessibility)
- No horizontal scroll at any viewport width

**Files to Create/Modify:**
- Test files in `/src/__tests__/` or colocated with components
- Potential accessibility fixes in any component files
- Documentation notes (optional)

---

## Execution Order

**Recommended implementation sequence:**

```
1. Project Setup (Task Group 1)
   |
   v
2. Design System (Task Group 2)
   |
   +---> 3. Hero Section (Task Group 3)
   |
   +---> 4. Navigation (Task Group 4)
   |
   v
5. About Section (Task Group 5)
   |
   v
6. Testing & Accessibility (Task Group 6)
```

**Notes on parallelization:**
- Task Groups 3 (Hero) and 4 (Navigation) can be developed in parallel after Task Group 2 completes
- Task Group 5 (About) depends on Task Group 3 for scroll indicator target
- Task Group 6 must run after all other groups complete

---

## Summary

| Task Group | Name | Complexity | Est. Time | Dependencies | Status |
|------------|------|------------|-----------|--------------|--------|
| 1 | Project Setup | Low | 30-45 min | None | COMPLETE |
| 2 | Design System | Medium | 1-1.5 hrs | Group 1 | COMPLETE |
| 3 | Hero Section | High | 2-2.5 hrs | Group 2 | COMPLETE |
| 4 | Navigation | High | 2-2.5 hrs | Group 2 | COMPLETE |
| 5 | About Section | Medium | 1.5-2 hrs | Groups 2, 3 | COMPLETE |
| 6 | Testing & Accessibility | Medium | 1-1.5 hrs | Groups 1-5 | COMPLETE |

**Total Estimated Time:** 8.5-11 hours

---

## Visual Assets Reference

- **Hero Image:** `planning/visuals/hero-image-phill-llamas.png`
  - Transparent PNG of Phill in poncho with llamas
  - To be copied to `/public/images/hero-image-phill-llamas.png`
  - Alt text: "Phill Aelony wearing a poncho and cowboy hat, throwing a rock hand sign, surrounded by three llamas"

---

## Tech Stack Summary

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom cyberpunk theme
- **Animations:** Framer Motion
- **Fonts:** Audiowide (headings), Nunito (body) via next/font/google
- **Images:** Next.js Image component with optimization
- **Testing:** Jest + React Testing Library (or Vitest)
- **Accessibility:** WCAG 2.1 AA compliance target

---

## Phase 1 Completion Summary

**Completed:** January 10, 2026

**Final Test Results:**
- 25 tests passing across 5 test files
- All critical user workflows covered
- Integration tests for full page render and mobile menu flow

**Verification Report:** See `verification/phase1-verification-report.md`
