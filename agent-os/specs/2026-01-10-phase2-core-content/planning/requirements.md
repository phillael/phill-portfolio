# Spec Requirements: Phase 2 - Core Content

## Initial Description

Build the core content sections for Phill Aelony's cyberpunk developer portfolio, following the established design system from Phase 1 (Hero, Navigation, About sections).

Sections to build:
- Work Experience Timeline
- Skills Showcase
- Project Gallery
- Education & Certifications

Tech Stack: Next.js (App Router), TypeScript, React 18+, Tailwind CSS, shadcn/ui, Framer Motion

Design Aesthetic: Cyberpunk/Tokyo-at-midnight theme with neon pinks, cyans, purples against dark backgrounds, glow effects and smooth animations.

## Requirements Discussion

### First Round Questions

**Q1:** Timeline layout - horizontal vs vertical?
**Answer:** VERTICAL timeline (confirmed)

**Q2:** Experience card interaction - expand inline vs modal?
**Answer:** Cards expand INLINE (not modals) - wants futuristic HUD-style display look

**Q3:** Music career placement in timeline?
**Answer:** Music career (Funky Knuckles/Strange Loop Games) included in SAME timeline with other work experience - single unified timeline

**Q4:** Skills presentation format?
**Answer:** Grouped skill CHIPS by category with hover effects. Future enhancement: explosion animation when clicked (defer to later phase)

**Q5:** Accessibility skill prominence?
**Answer:** NO special prominence for accessibility - just include as a regular skill in the relevant category

**Q6:** Number of projects to showcase?
**Answer:** THREE projects: Number Slayers (Three.js game), 2D Pong game, TimelyCare link

**Q7:** Project card information?
**Answer:** Each project card should include: screenshot, title, description, tech stack, and links

**Q8:** Education section treatment?
**Answer:** Same interactive treatment as other sections - consistent styling

**Q9:** Data structure preference?
**Answer:** User wants data in JSON or Markdown for EASY EDITING. Should be simple to update, push to GitHub, and deploy. No hardcoded content in components.

### Additional Requirement: Header Links

**NEW:** Add GitHub and LinkedIn icons/links to the sticky header (always visible)
- LinkedIn: www.linkedin.com/in/phill-aelony
- GitHub: URL to be provided

### Existing Code to Reference

**Similar Features Identified:**
- Feature: ExperienceCard component - Path: `/Users/phillipaelony/Desktop/dev/phillcodes/src/components/ExperienceCard.tsx`
- Components to potentially reuse: Badge styling pattern for skill chips
- Backend logic to reference: None identified

**Badge Styling Pattern from Reference:**
```tsx
// From ExperienceCard.tsx - Badge pattern to follow
<Badge className="text-accent bg-muted" key={index}>
  {tech}
</Badge>

// Card structure pattern
<Card className="bg-transparent border-none">
  <CardContent className="flex flex-col lg:flex-row p-2 gap-6 lg:items-baseline">
    // Content
  </CardContent>
</Card>
```

The reference component shows:
- Use of shadcn/ui Card and Badge components
- Transparent card backgrounds with no borders
- Responsive flex layouts (column on mobile, row on desktop)
- Badge styling with `text-accent bg-muted` classes
- Tech stack displayed as wrapped badge chips

### Follow-up Questions

No follow-up questions needed - user provided comprehensive answers including resume details.

## Visual Assets

### Files Provided:
No visual assets provided in the visuals folder.

### Visual Reference from User:
User mentioned they provided a resume screenshot containing all work history, skills, and education information. The data has been captured in the answers summary below.

## Content Data from Resume

### Work Experience (for timeline)

1. **Senior Software Engineer II | TimelyCare**
   - Feb 2023 - Present

2. **Software Engineer | Sessions**
   - Jul 2022 - Dec 2022

3. **Front End Developer | Designit/Microsoft**
   - Mar 2021 - Jul 2022

4. **Freelance Developer | www.phillcodes.com**
   - Dec 2018 - Dec 2020

5. **Guitarist/Composer | The Funky Knuckles/Strange Loop Games**
   - Apr 1998 - Present

### Skills (for chips grouped by category)

**Technical Skills:**
- JavaScript, TypeScript, HTML, CSS
- React, React Native, Redux
- ThreeJS, Tailwind, Node.js
- SQL, NoSQL, RESTful APIs
- Git, Figma, Cursor, Claude Code
- Postman, Docker, Accessibility

**Professional Skills:**
- Software Engineering, SDLC
- Systems Architecture, Full-Stack, SOA
- Game Development, Testing
- Responsive Design, Data Structures
- Cloud Computing, Prompt Engineering
- Agile, Cross-functional Collaboration

**Other Skills:**
- Guitar, Music Composition & Production
- Cooking, Fitness/Nutrition, Spanish

### Projects (for gallery)

1. **Number Slayers**
   - Three.js game
   - Needs: screenshot, description, tech stack, link

2. **2D Pong Game**
   - Needs: screenshot, description, tech stack, link

3. **TimelyCare**
   - Link to live site
   - Needs: screenshot, description, tech stack

### Education & Certifications

1. **MongoDB Complete Developer's Guide 2024 / Full-stack Web-Development Certificate**
   - Udemy

2. **The Ultimate Redux Course**
   - Code with Mosh

3. **Bachelor of Arts in Jazz Studies**
   - University of North Texas

## Requirements Summary

### Functional Requirements

**Work Experience Timeline:**
- Vertical timeline layout
- Inline expanding cards (no modals)
- Futuristic HUD-style visual treatment
- Music career integrated with tech career in single timeline
- Chronological or reverse-chronological ordering

**Skills Showcase:**
- Grouped skill chips by category (Technical, Professional, Other)
- Hover effects on chips
- Follow existing Badge styling pattern from reference component
- Future: explosion animation on click (deferred to later phase)

**Project Gallery:**
- Three featured projects
- Each card displays: screenshot, title, description, tech stack, links
- Interactive treatment consistent with other sections

**Education & Certifications:**
- Same interactive treatment as other sections
- Display institution/platform and credential name

**Header Enhancement:**
- Add GitHub and LinkedIn icon links to sticky header
- Icons always visible
- LinkedIn URL: www.linkedin.com/in/phill-aelony
- GitHub URL: TBD

**Data Architecture:**
- All content stored in JSON or Markdown files
- Easy to edit, update, and deploy
- No hardcoded content in React components
- Components should read from data files

### Reusability Opportunities

- Badge component styling from `/Users/phillipaelony/Desktop/dev/phillcodes/src/components/ExperienceCard.tsx`
- Card component patterns from same reference
- Existing shadcn/ui components (Card, CardContent, Badge)
- Phase 1 design system (colors, fonts, animations)

### Scope Boundaries

**In Scope:**
- Work Experience Timeline section with inline expansion
- Skills Showcase with grouped chips and hover effects
- Project Gallery for 3 projects
- Education & Certifications section
- GitHub/LinkedIn links in header
- JSON/Markdown data files for all content
- Responsive design for all sections
- Framer Motion animations consistent with Phase 1

**Out of Scope:**
- Skill chip explosion animation (deferred to future phase)
- Additional projects beyond the 3 specified
- Blog or writing section
- Contact form (likely Phase 3)
- Backend/API for content management

### Technical Considerations

- Follow Phase 1 design system (cyberpunk theme, neon colors, glow effects)
- Use existing shadcn/ui components where possible
- Maintain Audiowide font for headings, Nunito for body
- Framer Motion for animations
- Tailwind CSS for styling
- Data files should be in `/data` or similar directory for easy access
- Consider TypeScript interfaces for data structures
- Reference ExperienceCard.tsx for Badge and Card patterns
