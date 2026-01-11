# Specification: Phase 2 Core Content

## Goal

Build the core content sections (Work Experience Timeline, Skills Showcase, Project Gallery, Education & Certifications) and enhance the header with social links, using data-driven architecture for easy content editing while maintaining the established cyberpunk aesthetic from Phase 1.

## User Stories

- As a recruiter, I want to explore Phill's work history in an engaging timeline so that I can quickly assess experience and career progression
- As a visitor, I want to see Phill's skills organized by category so that I can understand technical capabilities at a glance

## Specific Requirements

**Data Architecture - JSON Files for Content**
- Create `/src/data/` directory to store all content as JSON files
- Create `experience.json` with array of experience objects containing: id, title, company, dateRange, description, bulletPoints, techStack, type (tech|music)
- Create `skills.json` with categories array, each containing category name and array of skill strings
- Create `projects.json` with array of project objects containing: id, title, description, techStack, imageUrl, liveUrl, repoUrl
- Create `education.json` with array of education objects containing: id, credential, institution, platform, year
- Define TypeScript interfaces in `/src/types/content.ts` for all data structures
- Components import and render data from these files; no hardcoded content in components

**Work Experience Timeline - Vertical Layout**
- Render a vertical timeline with a glowing cyan line running down the left side (desktop) or center (mobile)
- Each experience entry displays as an expandable card positioned alternating left/right on desktop, stacked on mobile
- Timeline connector dots at each entry point with neon glow effect matching the design system
- Include music career entry (The Funky Knuckles/Strange Loop Games) integrated chronologically with tech positions
- Section uses `#experience` as navigation anchor ID

**Work Experience Cards - HUD-Style Inline Expansion**
- Default collapsed state shows: date range, title, company name, and a subtle "expand" indicator
- Expanded state reveals: full description, bullet points, and tech stack badges
- Use Framer Motion `AnimatePresence` and `motion.div` with `layout` prop for smooth height transitions
- HUD aesthetic: angled corners using CSS clip-path, scanline overlay effect, subtle border glow
- Cards use `.gradient-card` base styling with hover hue-rotate effect from Phase 1
- Expand/collapse triggered by clicking card; use `aria-expanded` for accessibility

**Skills Showcase - Grouped Chips**
- Display skills organized into three categories: Technical Skills, Professional Skills, Other Skills
- Each category has a heading with neon text effect and horizontal divider
- Skills render as interactive chip/badge components in a flex-wrap layout
- Chips use the Badge pattern: `text-accent bg-muted` base with hover state adding glow
- On hover, chips scale slightly (1.05) and gain enhanced text-shadow glow effect
- Section uses `#skills` as navigation anchor ID
- Defer explosion animation on click to future phase; do not implement

**Project Gallery - Three Featured Projects**
- Display three projects in responsive grid: single column on mobile, three columns on desktop
- Projects: Number Slayers (Three.js game), 2D Pong Game, TimelyCare
- Each project card displays: screenshot image, title, description, tech stack badges, action links
- Use Next.js Image component with proper aspect ratio container for screenshots
- Links include: "Live Demo" and "View Code" buttons styled with neon border effects
- Cards use entrance animation with staggered delay using AnimatedSection pattern
- Section uses `#projects` as navigation anchor ID

**Education & Certifications Section**
- Display credentials in card layout consistent with other sections
- Three entries: MongoDB/Full-stack Certificate (Udemy), Ultimate Redux Course (Code with Mosh), BA Jazz Studies (UNT)
- Each card shows credential name, institution/platform, with subtle icon or badge for type
- Use same animation treatment as other sections (AnimatedSection with staggered reveals)
- Minimal design; less prominent than Experience and Projects sections
- Section uses `#education` as navigation anchor ID

**Header Enhancement - Social Links**
- Add GitHub and LinkedIn icon links to the Nav component, positioned to the right of navigation items
- Icons render as SVG components with consistent sizing (24x24px)
- Apply hover effect: scale(1.1) and neon glow matching primary color
- Include proper `aria-label` attributes: "Visit Phill's GitHub profile", "Visit Phill's LinkedIn profile"
- Links open in new tab with `target="_blank"` and `rel="noopener noreferrer"`
- LinkedIn URL: https://www.linkedin.com/in/phill-aelony
- GitHub URL: placeholder until provided, use `#` temporarily

**Navigation Updates**
- Add new navigation items to NavLinks component: Experience, Skills, Projects, Education
- Maintain smooth scroll behavior for all new section anchors
- Update mobile menu to include all new navigation items
- Ensure navigation order: Home, About, Experience, Skills, Projects, Education

**Component Architecture**
- Create reusable `TimelineCard` component for experience entries with expand/collapse logic
- Create reusable `SkillChip` component with hover animation encapsulated
- Create reusable `ProjectCard` component for gallery items
- Create reusable `EducationCard` component for credentials
- Create `SocialLinks` component for header icons
- All components follow single responsibility principle and accept data via props

**Responsive Design Requirements**
- Mobile-first implementation using Tailwind breakpoints (sm, md, lg, xl)
- Timeline: centered line on mobile, left-aligned with alternating cards on desktop
- Skills: 2-column chip grid on mobile, flexible wrap on desktop
- Projects: single column stack on mobile, 3-column grid on lg+ screens
- Touch targets minimum 44x44px for all interactive elements
- Test across breakpoints: 375px, 768px, 1024px, 1280px

## Visual Design

No visual assets were provided in the planning/visuals folder. Design should follow the established Phase 1 cyberpunk aesthetic with HUD-style elements for the timeline cards.

## Existing Code to Leverage

**AnimatedSection Component (`/src/components/AnimatedSection.tsx`)**
- Reusable scroll-triggered animation wrapper using Framer Motion whileInView
- Use for entrance animations on all new sections
- Supports configurable delay prop for staggered reveals
- Apply to section headings and content blocks

**AboutSection Pattern (`/src/components/AboutSection.tsx`)**
- Follow section structure: section tag with id, aria-label, role="region"
- Use max-w-4xl container with responsive padding pattern
- Apply AnimatedSection wrapper to heading and content groups
- Reference HighlightedText component pattern for emphasized text

**Nav Component (`/src/components/Nav.tsx`)**
- Add SocialLinks component next to desktop NavLinks
- Follow existing ref pattern for accessibility
- Maintain sticky header behavior and scroll-triggered styling
- Social links should be visible in both scrolled and non-scrolled states

**globals.css Neon Effects**
- Use `.neon-text-purple` for section headings
- Use `.neon-text-blue` for primary accents and links
- Use `.neon-border` or `.neon-border-subtle` for card borders
- Use `.gradient-card` for card backgrounds with hover effect
- Create new `.hud-card` class for timeline card clip-path styling

**ExperienceCard Reference (`phillcodes/src/components/ExperienceCard.tsx`)**
- Badge pattern: `className="text-accent bg-muted"` for tech stack chips
- Card structure with transparent background and no border
- Responsive flex layout switching between column and row
- Adapt this pattern for the new expandable TimelineCard component

## Out of Scope

- Skill chip explosion animation on click (deferred to Phase 3 micro-interactions)
- Additional projects beyond the three specified
- Blog or writing section
- Contact form and contact section (Phase 3)
- Downloadable PDF resume functionality (Phase 3)
- Backend API or CMS for content management
- AI chatbot functionality (Phase 7)
- 3D graphics or Three.js elements (Phase 6)
- Audio player or music section (Phase 5)
- Easter eggs and hidden features (Phase 6)
