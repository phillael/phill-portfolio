# Specification: Phase 3 - Polish & Interactivity

## Goal
Add polish and interactivity to the cyberpunk portfolio through resume download functionality, particle burst effects on skill chips, varied scroll reveal animations, glitch text effects, and enhanced hover states while maintaining accessibility and performance.

## User Stories
- As a recruiter, I want to download Phill's resume from multiple accessible locations so that I can review his qualifications offline
- As a visitor, I want engaging micro-interactions when clicking skill chips and scrolling through sections so that the site feels dynamic and memorable

## Specific Requirements

**Resume Download Button - Desktop Header**
- Add download button between NavLinks and SocialLinks in the desktop navigation
- Button triggers direct download of `/Phillip_Aelony_Resume_2025.pdf` (file already exists in public folder)
- Style as outlined button matching existing primary color scheme with neon glow hover effect
- Include download icon (SVG) adjacent to "Resume" text
- Minimum touch target 44x44px with proper focus-visible ring styling
- Use `download` attribute on anchor tag for proper download behavior

**Resume Download Button - Mobile Menu**
- Add download button in MobileMenu below the navigation links, above social links divider
- Same download behavior and accessibility as desktop version
- Larger touch target appropriate for mobile (full-width or prominent placement)
- Include same download icon and "Download Resume" text label

**Resume Download Button - Experience Section**
- Add prominent download button below the Experience section heading
- Position between heading and timeline, centered or left-aligned with timeline
- Use secondary/accent styling to differentiate from header button while maintaining cohesion
- Brief contextual text like "View my full resume" above or beside the button

**Particle Burst Effect on Skill Chips**
- Implement click handler on SkillChip component to trigger particle burst animation
- Generate 10-15 particles on click that explode outward from chip center
- Particles use cyberpunk colors: primary (cyan), secondary (magenta), accent (green) randomly assigned
- Use Framer Motion AnimatePresence for particle lifecycle management
- Particles animate outward with randomized x/y offsets (-100 to 100px range), scale from 1 to 0, opacity from 1 to 0
- Animation duration approximately 500-600ms with easeOut easing
- Clear particles from state after animation completes to prevent memory buildup

**Varied Scroll Reveal Animations**
- Create multiple AnimatedSection variants beyond current fade-up: fade-in, slide-from-left, slide-from-right, scale-up
- Apply different variants to different sections for visual variety (e.g., About fades up, Skills slides in, Projects scale up)
- All variants respect `prefers-reduced-motion` via Framer Motion's useReducedMotion hook
- Maintain `viewport={{ once: true, amount: 0.2 }}` pattern for single trigger
- Keep animations subtle (y offset 20-50px, duration 0.5-0.8s) to avoid being distracting

**Glitch Text Effect on Headings**
- Create GlitchText wrapper component for heading hover effects
- Effect triggers on hover: rapid x-offset jitter (-2px to 2px), opacity flicker, optional hue-rotate filter shift
- Use Framer Motion variants with whileHover to trigger glitch animation sequence
- Keep effect duration short (200-300ms) and tasteful, not constant/annoying
- Apply to section headings (Experience, Skills, Projects, About) selectively
- Provide non-glitch fallback when reduced motion is preferred

**Enhanced Scale/Glow Hover Patterns**
- Polish existing hover effects on NavLinks, SocialLinks, and buttons for consistency
- Standardize hover scale to 1.05-1.1 range across interactive elements
- Standardize neon glow intensity using CSS filter drop-shadow or box-shadow
- Ensure transitions are smooth (150-200ms duration with easeOut)
- Button hover states include subtle background color shift (bg-primary/10 pattern)

**Contact Section Simplification**
- Contact section focuses on LinkedIn as primary contact method
- Remove any email display or contact form if present
- Feature LinkedIn link prominently with clear CTA text like "Connect with me on LinkedIn"
- Keep GitHub link visible as secondary social link
- Brief explanatory text: "The best way to reach me is through LinkedIn"

**Responsive Audit for New Features**
- All resume download buttons must be properly sized and positioned at all breakpoints
- Particle effects must not cause layout shifts or overflow issues on mobile
- Glitch effects must perform well on mobile devices (GPU-accelerated transforms only)
- Touch interactions for skill chips must have appropriate feedback delay

## Visual Design
No visual mockups provided.

## Existing Code to Leverage

**`src/components/SkillChip.tsx`**
- Currently has basic hover scale/glow effect with Framer Motion
- Add onClick handler and particle state management
- Wrap component in relative-positioned container for absolute particle positioning
- Extend existing motion.span with whileTap for click feedback

**`src/components/AnimatedSection.tsx`**
- Current implementation uses single fade-up variant
- Extend to accept variant prop to select from multiple animation patterns
- Keep existing API backwards-compatible with default variant
- Add useReducedMotion hook for accessibility

**`src/components/Nav.tsx` and `src/components/MobileMenu.tsx`**
- Nav.tsx line 103-106: Insert resume button between NavLinks and SocialLinks in desktop flex container
- MobileMenu.tsx line 158-164: Insert resume button in mobile nav before social links section
- Follow existing motion.a pattern with whileHover and whileTap for button styling

**`src/components/SocialLinks.tsx`**
- Existing hover effect pattern: scale 1.1, drop-shadow filter, whileTap scale 0.95
- Replicate this pattern for resume download button styling
- LinkedIn URL already present for contact section reference

**`src/app/globals.css` Neon Effect Classes**
- Use existing `.neon-text-blue`, `.neon-text-purple`, `.neon-text-green` classes for particle colors
- Leverage existing hover glow patterns from link styles and timeline-dot animations
- Reference `pulse-glow` keyframes for inspiration on particle fade animations

## Out of Scope
- Three.js or React Three Fiber integration (reserved for Phase 6)
- 3D hero element or swirling background effects (reserved for Phase 6)
- Contact form implementation
- Email address display anywhere on the site
- Resume PDF generation or modification (using existing file)
- Major responsive redesign of existing sections
- New section creation beyond enhancing existing contact area
- Backend functionality or API endpoints
- Analytics or tracking implementation
- SEO metadata changes
