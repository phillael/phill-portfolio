# Task Breakdown: Phase 2 Core Content

## Overview

**Total Tasks:** 56 sub-tasks across 8 task groups
**Estimated Duration:** 5-7 development sessions
**Dependencies:** Phase 1 Foundation (complete)

This phase builds the core content sections for Phill Aelony's cyberpunk developer portfolio: Work Experience Timeline, Skills Showcase, Project Gallery, and Education & Certifications. It also establishes a data-driven architecture using JSON files and enhances the header with social links.

## Task List

---

### Data Architecture

#### Task Group 1: Data Files and TypeScript Interfaces
**Dependencies:** Phase 1 complete
**Complexity:** Low-Medium
**Estimated Time:** 45-60 minutes

- [x] 1.0 Complete data architecture setup
  - [x] 1.1 Create TypeScript interfaces for all content types
    - Create `/src/types/content.ts`
    - Define `Experience` interface: id, title, company, dateRange, description, bulletPoints (string[]), techStack (string[]), type ('tech' | 'music')
    - Define `SkillCategory` interface: category (string), skills (string[])
    - Define `Project` interface: id, title, description, techStack (string[]), imageUrl, liveUrl?, repoUrl?
    - Define `Education` interface: id, credential, institution, platform?, year?
    - Export all interfaces for use in components
  - [x] 1.2 Create experience.json data file
    - Create `/src/data/experience.json`
    - Add Senior Software Engineer II entry (TimelyCare, Feb 2023 - Present)
    - Add Software Engineer entry (Sessions, Jul 2022 - Dec 2022)
    - Add Front End Developer entry (Designit/Microsoft, Mar 2021 - Jul 2022)
    - Add Freelance Developer entry (phillcodes.com, Dec 2018 - Dec 2020)
    - Add Guitarist/Composer entry (The Funky Knuckles/Strange Loop Games, Apr 1998 - Present)
    - Include placeholder bulletPoints and descriptions (can be refined later)
  - [x] 1.3 Create skills.json data file
    - Create `/src/data/skills.json`
    - Technical Skills category: JavaScript, TypeScript, HTML, CSS, React, React Native, Redux, ThreeJS, Tailwind, Node.js, SQL, NoSQL, RESTful APIs, Git, Figma, Cursor, Claude Code, Postman, Docker, Accessibility
    - Professional Skills category: Software Engineering, SDLC, Systems Architecture, Full-Stack, SOA, Game Development, Testing, Responsive Design, Data Structures, Cloud Computing, Prompt Engineering, Agile, Cross-functional Collaboration
    - Other Skills category: Guitar, Music Composition & Production, Cooking, Fitness/Nutrition, Spanish
  - [x] 1.4 Create projects.json data file
    - Create `/src/data/projects.json`
    - Add Number Slayers entry (Three.js game) with placeholder imageUrl and links
    - Add 2D Pong Game entry with placeholder imageUrl and links
    - Add TimelyCare entry with placeholder imageUrl and liveUrl
    - Include techStack arrays for each project
  - [x] 1.5 Create education.json data file
    - Create `/src/data/education.json`
    - Add MongoDB/Full-stack Certificate (Udemy) entry
    - Add Ultimate Redux Course (Code with Mosh) entry
    - Add BA Jazz Studies (University of North Texas) entry
  - [x] 1.6 Verify data files are properly formatted and importable
    - Import each JSON file in a test component or script
    - Verify TypeScript recognizes the types correctly
    - Ensure no JSON syntax errors

**Acceptance Criteria:**
- All TypeScript interfaces are defined and exported
- All JSON data files exist in `/src/data/`
- Data files can be imported without errors
- TypeScript type checking works with imported data

**Files to Create:**
- `/src/types/content.ts` - TypeScript interfaces
- `/src/data/experience.json` - Work experience data
- `/src/data/skills.json` - Skills by category
- `/src/data/projects.json` - Project showcase data
- `/src/data/education.json` - Education and certifications

---

### Header Enhancement

#### Task Group 2: Social Links in Navigation
**Dependencies:** Task Group 1 (minimal), Phase 1 Navigation
**Complexity:** Low
**Estimated Time:** 30-45 minutes

- [x] 2.0 Complete header social links
  - [x] 2.1 Write 2-4 focused tests for social links
    - Test SocialLinks component renders GitHub and LinkedIn icons
    - Test icons have proper aria-labels for accessibility
    - Test links have correct href values and target="_blank"
    - Test hover state applies (optional visual test)
  - [x] 2.2 Create SocialLinks component
    - Create `/src/components/SocialLinks.tsx`
    - Render GitHub SVG icon (24x24px) with link
    - Render LinkedIn SVG icon (24x24px) with link
    - GitHub URL: `https://github.com/phillaelony` (placeholder)
    - LinkedIn URL: `https://www.linkedin.com/in/phill-aelony`
    - Apply `target="_blank"` and `rel="noopener noreferrer"` to links
    - Add `aria-label="Visit Phill's GitHub profile"` and `aria-label="Visit Phill's LinkedIn profile"`
  - [x] 2.3 Style social icons with hover effects
    - Base styling: consistent with nav link colors (text-foreground/80)
    - Hover effect: `scale(1.1)` transform
    - Hover effect: neon glow using text-shadow or filter matching primary color
    - Transition: smooth 200-300ms ease
  - [x] 2.4 Integrate SocialLinks into Nav component
    - Modify `/src/components/Nav.tsx`
    - Position SocialLinks to the right of desktop NavLinks
    - Ensure visible in both scrolled and non-scrolled header states
    - Add SocialLinks to MobileMenu as well
  - [x] 2.5 Ensure social links tests pass
    - Run ONLY the 2-4 tests written in 2.1
    - Verify icons display correctly at all viewport sizes

**Acceptance Criteria:**
- The 2-4 tests written in 2.1 pass
- GitHub and LinkedIn icons appear in header
- Icons have proper accessibility labels
- Hover effects work smoothly
- Links open in new tabs

**Files to Create/Modify:**
- `/src/components/SocialLinks.tsx` - New social icons component
- `/src/components/Nav.tsx` - Integration of social links
- `/src/components/MobileMenu.tsx` - Add social links to mobile menu

---

### Navigation Updates

#### Task Group 3: Extended Navigation Items
**Dependencies:** Task Group 1 (for section IDs)
**Complexity:** Low
**Estimated Time:** 20-30 minutes

- [x] 3.0 Complete navigation updates
  - [x] 3.1 Write 2-3 focused tests for new navigation items
    - Test NavLinks renders all navigation items: Home, About, Experience, Skills, Projects, Education
    - Test navigation links have correct href anchors (#experience, #skills, #projects, #education)
    - Test mobile menu includes all new navigation items
  - [x] 3.2 Update NavLinks component with new items
    - Modify `/src/components/NavLinks.tsx`
    - Add Experience link (href="#experience")
    - Add Skills link (href="#skills")
    - Add Projects link (href="#projects")
    - Add Education link (href="#education")
    - Maintain navigation order: Home, About, Experience, Skills, Projects, Education
    - Ensure smooth scroll behavior works for all new anchors
  - [x] 3.3 Update MobileMenu with new navigation items
    - Modify `/src/components/MobileMenu.tsx`
    - Add all new navigation links with same order
    - Ensure menu closes after navigation item click
    - Maintain touch target size (minimum 44x44px)
  - [x] 3.4 Ensure navigation tests pass
    - Run ONLY the 2-3 tests written in 3.1
    - Verify smooth scroll works for all section anchors

**Acceptance Criteria:**
- The 2-3 tests written in 3.1 pass
- All navigation items appear in desktop and mobile navigation
- Smooth scroll works for all section anchors
- Navigation order is correct

**Files to Modify:**
- `/src/components/NavLinks.tsx` - Add new navigation items
- `/src/components/MobileMenu.tsx` - Add new navigation items

---

### Work Experience Section

#### Task Group 4: Timeline and Experience Cards
**Dependencies:** Task Groups 1, 3
**Complexity:** High
**Estimated Time:** 2.5-3 hours

- [x] 4.0 Complete Work Experience Timeline section
  - [x] 4.1 Write 4-6 focused tests for Experience section
    - Test ExperienceSection renders with correct ID (#experience)
    - Test timeline renders all 5 experience entries from data
    - Test TimelineCard expands/collapses on click
    - Test expanded card shows description and tech stack
    - Test aria-expanded attribute updates correctly
    - Test keyboard accessibility (Enter/Space to toggle)
  - [x] 4.2 Create HUD card CSS utility class
    - Add `.hud-card` class to `/src/app/globals.css`
    - Apply clip-path for angled corners (cyberpunk HUD aesthetic)
    - Add scanline overlay effect using pseudo-element or background
    - Add subtle border glow using box-shadow
    - Combine with existing `.gradient-card` for hover hue-rotate effect
  - [x] 4.3 Create TimelineCard component
    - Create `/src/components/TimelineCard.tsx`
    - Accept Experience data via props
    - Collapsed state: show dateRange, title, company, expand indicator (chevron)
    - Expanded state: reveal description, bulletPoints list, tech stack badges
    - Use Framer Motion `AnimatePresence` and `motion.div` with `layout` prop
    - Implement smooth height transition animation
    - Apply `.hud-card` styling with `.gradient-card` base
    - Add click handler to toggle expand/collapse
    - Include `aria-expanded` attribute for accessibility
    - Support keyboard interaction (Enter/Space to toggle)
  - [x] 4.4 Create TimelineConnector component
    - Create `/src/components/TimelineConnector.tsx` (or include in ExperienceSection)
    - Render vertical glowing cyan line
    - Desktop: line on left side with cards on right
    - Mobile: line on left with cards stacked
    - Timeline dots at each entry point with neon glow effect
    - Use CSS or Framer Motion for glow animation
  - [x] 4.5 Create ExperienceSection container
    - Create `/src/components/ExperienceSection.tsx`
    - Section ID: `experience` for navigation anchor
    - Add `role="region"` and `aria-label="Work Experience"`
    - Import experience data from `/src/data/experience.json`
    - Section heading: "Experience" with `.neon-text-purple` effect
    - Use AnimatedSection for entrance animation
    - Render TimelineConnector with TimelineCard for each experience entry
    - Order entries reverse-chronologically (most recent first)
  - [x] 4.6 Implement responsive timeline layout
    - Mobile (< 768px): cards stacked in single column, timeline dots on left
    - Desktop (>= 768px): timeline line on left, cards on right
    - Use Tailwind responsive classes (md:) for breakpoint handling
    - Ensure touch targets meet 44x44px minimum
  - [x] 4.7 Integrate ExperienceSection into main page
    - Add ExperienceSection to `/src/app/page.tsx`
    - Position after AboutSection
    - Verify navigation anchor works
  - [x] 4.8 Ensure Experience section tests pass
    - Run ONLY the 4-6 tests written in 4.1
    - Verify expand/collapse functionality works
    - Test timeline layout at different breakpoints

**Acceptance Criteria:**
- The 4-6 tests written in 4.1 pass
- Timeline displays with glowing cyan line and connector dots
- All 5 experience entries render from JSON data
- Cards expand/collapse smoothly with Framer Motion
- Expanded cards show full details and tech stack badges
- HUD aesthetic with angled corners and scanline effect
- Responsive layout works on mobile and desktop
- Keyboard accessible (Enter/Space toggles expansion)

**Files to Create/Modify:**
- `/src/app/globals.css` - Add `.hud-card` utility class
- `/src/components/TimelineCard.tsx` - Expandable experience card
- `/src/components/TimelineConnector.tsx` - Timeline line and dots (optional separate component)
- `/src/components/ExperienceSection.tsx` - Section container
- `/src/app/page.tsx` - Page integration

---

### Skills Section

#### Task Group 5: Skills Showcase with Grouped Chips
**Dependencies:** Task Groups 1, 3
**Complexity:** Medium
**Estimated Time:** 1.5-2 hours

- [x] 5.0 Complete Skills Showcase section
  - [x] 5.1 Write 3-5 focused tests for Skills section
    - Test SkillsSection renders with correct ID (#skills)
    - Test all three skill categories render with headings
    - Test SkillChip components render for each skill
    - Test hover state applies scale and glow effect
    - Test skills are imported from JSON data
  - [x] 5.2 Create SkillChip component
    - Create `/src/components/SkillChip.tsx`
    - Accept skill name via props
    - Use Badge pattern: `text-accent bg-muted` base styling
    - Hover effect: `scale(1.05)` transform
    - Hover effect: enhanced text-shadow glow
    - Transition: smooth 150-200ms ease
    - Do NOT implement click explosion animation (deferred to Phase 3)
  - [x] 5.3 Create SkillCategory component
    - Create `/src/components/SkillCategory.tsx`
    - Accept category name and skills array via props
    - Render category heading with `.neon-text-blue` effect
    - Render horizontal divider line below heading
    - Render SkillChip components in flex-wrap layout
    - Apply AnimatedSection for staggered entrance animation
  - [x] 5.4 Create SkillsSection container
    - Create `/src/components/SkillsSection.tsx`
    - Section ID: `skills` for navigation anchor
    - Add `role="region"` and `aria-label="Skills"`
    - Import skills data from `/src/data/skills.json`
    - Section heading: "Skills" with `.neon-text-purple` effect
    - Render SkillCategory for each category (Technical, Professional, Other)
    - Use AnimatedSection wrapper for section heading
  - [x] 5.5 Implement responsive chip layout
    - Mobile: flexible wrap layout
    - Desktop: flexible wrap layout filling available width
    - Appropriate gap spacing between chips
    - Consistent chip sizing across breakpoints
  - [x] 5.6 Integrate SkillsSection into main page
    - Add SkillsSection to `/src/app/page.tsx`
    - Position after ExperienceSection
    - Verify navigation anchor works
  - [x] 5.7 Ensure Skills section tests pass
    - Run ONLY the 3-5 tests written in 5.1
    - Verify all skills from JSON render correctly
    - Test hover effects work

**Acceptance Criteria:**
- The 3-5 tests written in 5.1 pass
- All three skill categories display with headings
- All skills render as interactive chips from JSON data
- Chips have hover effects (scale and glow)
- Responsive layout works on mobile (flex-wrap) and desktop (flex-wrap)
- No click animation implemented (deferred)

**Files to Create/Modify:**
- `/src/components/SkillChip.tsx` - Individual skill badge
- `/src/components/SkillCategory.tsx` - Category group with heading
- `/src/components/SkillsSection.tsx` - Section container
- `/src/app/page.tsx` - Page integration

---

### Projects Section

#### Task Group 6: Project Gallery
**Dependencies:** Task Groups 1, 3
**Complexity:** Medium-High
**Estimated Time:** 2-2.5 hours

- [x] 6.0 Complete Project Gallery section
  - [x] 6.1 Write 3-5 focused tests for Projects section
    - Test ProjectsSection renders with correct ID (#projects)
    - Test all 3 project cards render from JSON data
    - Test ProjectCard displays title, description, and tech stack
    - Test action links (Live Demo, View Code) render with correct hrefs
    - Test images have proper alt text
  - [x] 6.2 Create ProjectCard component
    - Create `/src/components/ProjectCard.tsx`
    - Accept Project data via props
    - Use Next.js Image component for screenshot with aspect ratio container
    - Display project title with neon text effect
    - Display description text
    - Render tech stack as badges (same pattern as SkillChip)
    - Render "Live Demo" button if liveUrl exists
    - Render "View Code" button if repoUrl exists
    - Style buttons with neon border effects
    - Apply `.gradient-card` base styling
    - Links open in new tab with `target="_blank"` and `rel="noopener noreferrer"`
  - [x] 6.3 Style ProjectCard action buttons
    - Neon border effect on buttons
    - Hover: enhanced glow and slight scale
    - Distinct styling for primary (Live Demo) vs secondary (View Code)
    - Consistent with design system colors
  - [x] 6.4 Create ProjectsSection container
    - Create `/src/components/ProjectsSection.tsx`
    - Section ID: `projects` for navigation anchor
    - Add `role="region"` and `aria-label="Projects"`
    - Import projects data from `/src/data/projects.json`
    - Section heading: "Projects" with `.neon-text-purple` effect
    - Render ProjectCard for each project
    - Use AnimatedSection with staggered delays for entrance animation
  - [x] 6.5 Implement responsive grid layout
    - Mobile (< 1024px): single column stack
    - Desktop (>= 1024px): 3-column grid
    - Use Tailwind `grid grid-cols-1 lg:grid-cols-3` pattern
    - Appropriate gap spacing between cards
  - [x] 6.6 Add placeholder project images
    - Create placeholder images using gradient backgrounds until real screenshots provided
    - Ensure images are properly optimized
    - Add meaningful alt text for each project image
  - [x] 6.7 Integrate ProjectsSection into main page
    - Add ProjectsSection to `/src/app/page.tsx`
    - Position after SkillsSection
    - Verify navigation anchor works
  - [x] 6.8 Ensure Projects section tests pass
    - Run ONLY the 3-5 tests written in 6.1
    - Verify all projects from JSON render correctly
    - Test responsive grid layout

**Acceptance Criteria:**
- The 3-5 tests written in 6.1 pass
- All 3 projects display from JSON data
- Each card shows screenshot, title, description, tech stack, and action links
- Action buttons have neon border styling
- Links open in new tabs
- Responsive grid: 1 column mobile, 3 columns desktop
- Staggered entrance animations work

**Files to Create/Modify:**
- `/src/components/ProjectCard.tsx` - Individual project card
- `/src/components/ProjectsSection.tsx` - Section container
- `/src/app/page.tsx` - Page integration
- `/public/images/` - Placeholder project images (optional)

---

### Education Section

#### Task Group 7: Education & Certifications
**Dependencies:** Task Groups 1, 3
**Complexity:** Low-Medium
**Estimated Time:** 1-1.5 hours

- [x] 7.0 Complete Education & Certifications section
  - [x] 7.1 Write 2-4 focused tests for Education section
    - Test EducationSection renders with correct ID (#education)
    - Test all 3 education entries render from JSON data
    - Test EducationCard displays credential and institution
    - Test section uses semantic HTML structure
  - [x] 7.2 Create EducationCard component
    - Create `/src/components/EducationCard.tsx`
    - Accept Education data via props
    - Display credential name prominently
    - Display institution/platform name
    - Display year if available
    - Optional: subtle icon or badge indicating type (certificate, degree)
    - Apply `.gradient-card` base styling
    - Keep design minimal and less prominent than Experience/Projects
  - [x] 7.3 Create EducationSection container
    - Create `/src/components/EducationSection.tsx`
    - Section ID: `education` for navigation anchor
    - Add `role="region"` and `aria-label="Education and Certifications"`
    - Import education data from `/src/data/education.json`
    - Section heading: "Education" with `.neon-text-purple` effect
    - Render EducationCard for each entry
    - Use AnimatedSection with staggered delays for entrance animation
    - Less visual prominence than Experience and Projects sections
  - [x] 7.4 Implement responsive card layout
    - Mobile: single column
    - Desktop: 3-column grid or flexible layout
    - Consistent with other section layouts
    - Appropriate spacing between cards
  - [x] 7.5 Integrate EducationSection into main page
    - Add EducationSection to `/src/app/page.tsx`
    - Position after ProjectsSection (last content section before footer)
    - Verify navigation anchor works
  - [x] 7.6 Ensure Education section tests pass
    - Run ONLY the 2-4 tests written in 7.1
    - Verify all education entries from JSON render correctly

**Acceptance Criteria:**
- The 2-4 tests written in 7.1 pass
- All 3 education entries display from JSON data
- Each card shows credential and institution
- Design is consistent but less prominent than other sections
- Responsive layout works on mobile and desktop
- Staggered entrance animations work

**Files to Create/Modify:**
- `/src/components/EducationCard.tsx` - Individual education card
- `/src/components/EducationSection.tsx` - Section container
- `/src/app/page.tsx` - Page integration

---

### Testing & Accessibility

#### Task Group 8: Test Review, Accessibility & Responsive Verification
**Dependencies:** Task Groups 1-7
**Complexity:** Medium
**Estimated Time:** 1.5-2 hours

- [x] 8.0 Complete testing and accessibility verification
  - [x] 8.1 Review tests from Task Groups 2-7
    - Review the 2-4 tests from Social Links (Task 2.1)
    - Review the 2-3 tests from Navigation Updates (Task 3.1)
    - Review the 4-6 tests from Experience Section (Task 4.1)
    - Review the 3-5 tests from Skills Section (Task 5.1)
    - Review the 3-5 tests from Projects Section (Task 6.1)
    - Review the 2-4 tests from Education Section (Task 7.1)
    - Total existing tests: approximately 16-27 tests
  - [x] 8.2 Analyze test coverage gaps for Phase 2 features only
    - Identify critical user workflows lacking coverage
    - Focus on: data loading, timeline interaction, navigation to new sections
    - Do NOT assess entire application - focus only on Phase 2 scope
  - [x] 8.3 Write up to 8 additional strategic tests if needed
    - Integration test: all new sections render without errors
    - Integration test: navigation to each new section works end-to-end
    - Test data imports work correctly (JSON parsing)
    - Test timeline expand/collapse full interaction flow
    - Skip edge cases and performance tests unless critical
  - [x] 8.4 Run Phase 2 feature-specific tests only
    - Run all Phase 2 tests (expected total: 24-35 tests maximum)
    - Do NOT run tests for features outside Phase 2 scope
    - Verify all critical workflows pass
  - [x] 8.5 Conduct accessibility audit for new sections
    - Verify color contrast ratios (4.5:1 minimum for text)
    - Test keyboard navigation through timeline cards (Tab, Enter/Space)
    - Test focus indicators visible on all new interactive elements
    - Verify ARIA labels on expandable cards and social links
    - Check heading hierarchy (h2 for section headings, h3 for cards)
    - Verify screen reader announces expand/collapse state changes
  - [x] 8.6 Verify responsive design across breakpoints
    - Mobile (320px - 767px):
      - Timeline centered, cards stacked
      - Skills 2-column
      - Projects single column
      - Navigation includes all new items
    - Tablet (768px - 1023px):
      - Timeline alternating layout begins
      - Skills flexible wrap
      - Projects single or 2 column
    - Desktop (1024px+):
      - Full timeline alternating layout
      - Skills full wrap
      - Projects 3-column grid
    - Verify touch targets minimum 44x44px on mobile
    - Confirm no horizontal scrolling at any breakpoint
  - [x] 8.7 Verify all animations and interactions
    - Timeline card expand/collapse smooth animation
    - Skill chip hover effects
    - Project card hover effects
    - Section entrance animations (AnimatedSection)
    - Social link hover effects
    - Reduce motion media query respected (if applicable)
  - [x] 8.8 Document any known issues or future improvements
    - Note any deferred features (skill chip explosion)
    - Document placeholder content that needs updating
    - List any discovered accessibility improvements for future

**Acceptance Criteria:**
- All Phase 2 tests pass (approximately 24-35 tests total)
- No critical accessibility violations
- Color contrast meets WCAG AA standards
- Keyboard navigation works for all interactive elements
- All expandable cards have proper ARIA attributes
- Responsive design works at all standard breakpoints
- No horizontal scroll at any viewport width
- All animations are smooth and performant

**Files to Create/Modify:**
- Test files in `/src/__tests__/` or colocated with components
- Potential accessibility fixes in any component files
- Documentation notes (optional)

---

## Execution Order

**Recommended implementation sequence:**

```
1. Data Architecture (Task Group 1)
   |
   +---> 2. Header Social Links (Task Group 2)
   |
   +---> 3. Navigation Updates (Task Group 3)
   |
   v
4. Work Experience Timeline (Task Group 4) -- Highest complexity, start early
   |
   +---> 5. Skills Showcase (Task Group 5) -- Can parallelize with 6, 7
   |
   +---> 6. Project Gallery (Task Group 6)
   |
   +---> 7. Education Section (Task Group 7)
   |
   v
8. Testing & Accessibility (Task Group 8)
```

**Notes on parallelization:**
- Task Groups 2 (Social Links) and 3 (Navigation) can be developed in parallel after Task Group 1
- Task Groups 5 (Skills), 6 (Projects), and 7 (Education) can be developed in parallel after Group 4
- Task Group 4 (Experience) is the most complex and should be prioritized early
- Task Group 8 must run after all other groups complete

---

## Summary

| Task Group | Name | Complexity | Est. Time | Dependencies | Status |
|------------|------|------------|-----------|--------------|--------|
| 1 | Data Architecture | Low-Medium | 45-60 min | Phase 1 | Complete |
| 2 | Social Links | Low | 30-45 min | Group 1 (minimal) | Complete |
| 3 | Navigation Updates | Low | 20-30 min | Group 1 | Complete |
| 4 | Work Experience Timeline | High | 2.5-3 hrs | Groups 1, 3 | Complete |
| 5 | Skills Showcase | Medium | 1.5-2 hrs | Groups 1, 3 | Complete |
| 6 | Project Gallery | Medium-High | 2-2.5 hrs | Groups 1, 3 | Complete |
| 7 | Education Section | Low-Medium | 1-1.5 hrs | Groups 1, 3 | Complete |
| 8 | Testing & Accessibility | Medium | 1.5-2 hrs | Groups 1-7 | Complete |

**Total Estimated Time:** 10.5-14 hours

---

## Component Architecture Overview

**New Components to Create:**
- `SocialLinks.tsx` - GitHub/LinkedIn icons for header
- `TimelineCard.tsx` - Expandable experience card with HUD styling
- `TimelineConnector.tsx` - Vertical line and connector dots (optional)
- `ExperienceSection.tsx` - Work experience timeline section
- `SkillChip.tsx` - Individual skill badge with hover effects
- `SkillCategory.tsx` - Skill category grouping
- `SkillsSection.tsx` - Skills showcase section
- `ProjectCard.tsx` - Project showcase card with image and links
- `ProjectsSection.tsx` - Project gallery section
- `EducationCard.tsx` - Education/certification card
- `EducationSection.tsx` - Education section

**Existing Components to Modify:**
- `Nav.tsx` - Add SocialLinks integration
- `NavLinks.tsx` - Add new navigation items
- `MobileMenu.tsx` - Add new navigation items

**Existing Components to Reuse:**
- `AnimatedSection.tsx` - Scroll-triggered animations for all sections
- Badge styling pattern from Phase 1 design system

---

## Data Files Summary

**Files to Create in `/src/data/`:**
- `experience.json` - 5 work experience entries
- `skills.json` - 3 skill categories with arrays
- `projects.json` - 3 project entries
- `education.json` - 3 education/certification entries

**TypeScript Types in `/src/types/content.ts`:**
- `Experience` interface
- `SkillCategory` interface
- `Project` interface
- `Education` interface

---

## CSS Utilities to Add

**In `/src/app/globals.css`:**
- `.hud-card` - HUD-style card with clip-path angled corners, scanline effect, border glow

---

## Tech Stack Reference (from Phase 1)

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom cyberpunk theme
- **Animations:** Framer Motion
- **Fonts:** Audiowide (headings), Nunito (body)
- **Images:** Next.js Image component
- **Testing:** Jest + React Testing Library (or Vitest)
- **Accessibility:** WCAG 2.1 AA compliance target

---

## Visual Assets Needed

**Project Screenshots:**
- Number Slayers game screenshot
- 2D Pong game screenshot
- TimelyCare website screenshot

**Note:** Placeholders can be used until actual screenshots are provided. Consider using gradient backgrounds or placeholder services.

---

## Out of Scope (Deferred to Later Phases)

- Skill chip explosion animation on click (Phase 3)
- Contact form and contact section (Phase 3)
- Downloadable PDF resume (Phase 3)
- Additional projects beyond the 3 specified
- Blog or writing section
- Backend API or CMS for content management
- AI chatbot functionality (Phase 7)
- 3D graphics or Three.js elements (Phase 6)
- Audio player or music section (Phase 5)
- Easter eggs and hidden features (Phase 6)
