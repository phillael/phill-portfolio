# Enhanced About Section - Requirements

## Overview
Transform the About section into a multi-slide carousel that includes the existing bio content plus testimonials, with optional 3D/particle effects while maintaining performance, accessibility, and responsiveness.

## Core Requirements

### 1. Carousel Structure
- **Slide 1 (Default):** Current About section content + space_llama.png image
- **Slides 2-6:** Testimonials from colleagues (5 testimonials total)
- Swipe left/right navigation (touch and mouse drag)
- Arrow button navigation
- Dot indicators showing current position

### 2. Space Llama Image Integration
- Include `/images/space_llama.png` (purple astronaut llama)
- Must be fully responsive across all screen sizes
- Placement TBD - alongside bio text or as featured element

### 3. Testimonials Data
Source: Old website testimonials
- 5 testimonials with llama avatar images
- Each has: name, position, date, relationship, body text, image

**Testimonial People:**
1. Kimberly Nguyen - Senior Software Engineer (Sessions)
2. Joshua Kaulius - Sr. Program Manager (Microsoft)
3. David Shin - Software Engineer (Sessions)
4. Benjamin Blutzer - Full Stack Software Engineer (Microsoft mentor)
5. Andrew Keturi - Software Engineer (Sessions manager)

**Images to copy:**
- llama_kimberly.jpg
- llama_josh.jpeg
- llama_david.jpeg
- llama_benjamin.jpg
- llama_andrew.jpg
- space_llama.png

### 4. Design Requirements
- Match existing cyberpunk "Tokyo at midnight" aesthetic
- Neon color palette (cyan, magenta, green)
- Use existing component patterns (GlitchText, neon effects, etc.)
- Gradient card styling for testimonial cards

### 5. Technical Requirements
- **Performance:** Smooth 60fps animations, lazy load images
- **Accessibility:**
  - Keyboard navigation (arrow keys, tab)
  - Screen reader announcements for slide changes
  - Respect reduced motion preferences
  - Focus management
- **Responsiveness:** Work flawlessly on mobile, tablet, desktop

## Animation/3D Options to Discuss

### Option A: Enhanced Framer Motion (Recommended for balance)
- 3D perspective transforms on slide transitions
- Cards appear to rotate in 3D space when swiping
- Parallax depth effect on elements
- Particle burst on slide change
- **Pros:** Great performance, full accessibility, easier to implement
- **Cons:** Not true 3D

### Option B: React Three Fiber Integration
- Full 3D carousel with cards in 3D space
- Shader-based transition effects
- Particle systems floating around cards
- Wavy distortion effects on swipe
- **Pros:** Maximum "wow factor"
- **Cons:** Higher complexity, potential performance concerns on mobile

### Option C: Hybrid Approach
- Framer Motion for carousel mechanics
- Small R3F canvas for background particle effects
- 3D transforms via CSS/Framer for cards
- **Pros:** Best of both worlds
- **Cons:** Need to carefully manage performance

## Reference Files

### From Old Site (/Users/phillipaelony/Desktop/dev/phillcodes/)
- `src/components/Sections/TestimonialSection/testimonials.ts` - Testimonial data
- `src/components/Sections/TestimonialSection/TestimonialSection.tsx` - Existing carousel
- `public/images/` - Llama avatar images

### Current Site Patterns to Follow
- `MobileMenu.tsx` - AnimatePresence patterns
- `SkillChip.tsx` - Particle effects pattern
- `music/AudioVisualizer.tsx` - R3F integration pattern
- `AnimatedSection.tsx` - Scroll reveal patterns

## Open Questions
1. Which animation approach to use? (A, B, or C)
2. Space llama placement - left side, right side, or background?
3. Should testimonials auto-advance or only manual navigation?
4. Add subtle background particles to entire About section?
