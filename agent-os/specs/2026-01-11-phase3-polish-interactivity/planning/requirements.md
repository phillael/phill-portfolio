# Spec Requirements: Phase 3 - Polish & Interactivity

## Initial Description
Phase 3 focuses on Polish & Interactivity for the cyberpunk developer portfolio. This phase includes:

1. Downloadable Resume - PDF resume download functionality with print-friendly design matching site branding
2. Micro-Interactions - Hover effects, click animations ("things that explode"), scroll-triggered reveals
3. Contact Section - Social links, email, optional contact form with cyberpunk styling
4. Responsive Optimization - Ensure all sections work flawlessly on mobile, tablet, and desktop

The project is a Next.js 16 portfolio with TypeScript, Tailwind CSS, and Framer Motion. The design follows a cyberpunk "Tokyo at midnight" aesthetic with neon cyan, magenta, and green colors.

## Requirements Discussion

### First Round Questions

**Q1:** Where should the resume download button be placed - in the navigation header, hero section, or dedicated "Resume" section?
**Answer:** Resume button in header (desktop) and mobile menu, plus a button next to the Experience section.

**Q2:** For the resume PDF, should it match the site's cyberpunk branding or use a more traditional/ATS-friendly format?
**Answer:** PDF download - file located at /Users/phillipaelony/Desktop/Phillip_Aelony_Resume_2025.pdf (existing file, no generation needed).

**Q3:** For micro-interactions, which elements should have "exploding" click effects - skill chips, buttons, cards, or all interactive elements?
**Answer:** Particle burst effects for skill chips - use Framer Motion (NOT Three.js for now). All skill chips should explode on click. User wants to discuss before implementing.

**Q4:** Should scroll-triggered reveals be consistent (e.g., all fade-up) or vary by section type?
**Answer:** Some different animation types for scroll reveals, but keep it accessible, mobile-friendly, and not annoying/overboard.

**Q5:** For hover effects, should we include glitch effects on text, or focus on scale/glow patterns that match existing design?
**Answer:** All of the above: glitch effects on text, polish scale/glow patterns. Performance-minded and tasteful.

**Q6:** For the contact section, should the email be displayed as text (with copy-to-clipboard) or hidden behind a mailto link?
**Answer:** NO email displayed on page - users can get email from downloaded resume or find via LinkedIn.

**Q7:** Should we include a contact form, or is a simpler "reach out via email/LinkedIn" approach preferred?
**Answer:** NO contact form - LinkedIn is sufficient for contact.

**Q8:** Are there specific responsive breakpoints or device sizes that need priority attention based on current testing?
**Answer:** Current responsiveness looks good. Can audit systematically if desired.

**Q9:** Is there anything that should explicitly NOT be included in Phase 3?
**Answer:** Keep scoped to Phase 3 only. User wants Framer Motion for animations, save Three.js swirling background for Phase 6.

### Animation Library Decision

**Decision:** Use Framer Motion for all Phase 3 animations (particles, glitch, hover effects, scroll reveals). Save Three.js/React Three Fiber for Phase 6 (3D Hero Element, background swirl effects).

### Existing Code to Reference

No similar existing features explicitly identified for reference. However, the codebase already uses:
- Framer Motion for animations
- Tailwind CSS with custom cyberpunk color palette
- shadcn/ui component patterns

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements

**Downloadable Resume:**
- Add resume download button to desktop header navigation
- Add resume download button to mobile menu
- Add resume download button adjacent to Experience section
- Link to existing PDF file: `/Users/phillipaelony/Desktop/Phillip_Aelony_Resume_2025.pdf`
- Copy PDF to public folder for web serving (e.g., `/public/Phillip_Aelony_Resume_2025.pdf`)
- Button should trigger direct download with cyberpunk styling

**Micro-Interactions - Particle Burst Effects:**
- Implement particle burst effect on skill chip click using Framer Motion
- All skill chips should have this explosion animation
- Particles should use cyberpunk color palette (cyan, magenta, green)
- Consult with user before final implementation

**Micro-Interactions - Scroll Reveals:**
- Implement varied scroll-triggered reveal animations by section
- Keep animations accessible (respect `prefers-reduced-motion`)
- Ensure mobile-friendly performance
- Avoid excessive or distracting animations
- Suggested variety: fade-up, fade-in, slide-in from sides

**Micro-Interactions - Hover Effects:**
- Add glitch effects on text hover (headings, links)
- Polish existing scale/glow patterns
- Performance-minded implementation
- Tasteful and consistent with cyberpunk aesthetic

**Contact Section:**
- NO email address displayed on the page
- NO contact form
- Social links (LinkedIn prominently featured)
- Users directed to resume or LinkedIn for contact information

**Responsive Optimization:**
- Current responsiveness is acceptable
- Optional systematic audit available if desired
- Ensure all new Phase 3 features are responsive

### Technical Considerations

**Animation Library:**
- Use Framer Motion exclusively for Phase 3 animations
- Do NOT use Three.js or React Three Fiber in this phase
- Three.js reserved for Phase 6 (3D Hero Element, background effects)

**Performance:**
- All animations should be performance-minded
- Respect `prefers-reduced-motion` media query
- Mobile-friendly (no heavy computations on scroll)
- GPU-accelerated transforms preferred

**Accessibility:**
- WCAG 2.1 AA compliance maintained
- Keyboard support for all interactive elements
- Focus visible states on download buttons
- Reduced motion alternatives for animations

**File Handling:**
- Resume PDF needs to be copied to public folder
- Ensure proper download headers/behavior

### Scope Boundaries

**In Scope:**
- Resume download button (header, mobile menu, Experience section)
- Particle burst effect on skill chips (Framer Motion)
- Varied scroll-triggered reveal animations
- Glitch text effects on hover
- Polished scale/glow hover patterns
- Simplified contact section (social links, no email/form)
- Responsive verification of new features

**Out of Scope:**
- Three.js or React Three Fiber integration (Phase 6)
- 3D hero element (Phase 6)
- Swirling background effects (Phase 6)
- Contact form
- Displayed email address
- Resume PDF generation (using existing file)
- Major responsive redesign (current is acceptable)

### Reusability Opportunities

- Existing Framer Motion patterns in codebase
- Tailwind CSS custom cyberpunk color variables
- shadcn/ui button components for download buttons
- Existing hover/transition patterns can be extended
