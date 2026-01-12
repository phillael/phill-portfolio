# Specification: Music & Audio Features

## Goal
Build a floating music player with an audio-reactive 3D visualizer to showcase Phill's musician background, featuring self-hosted tracks with full playback controls in a cyberpunk aesthetic.

## User Stories
- As a visitor, I want to play music while browsing the portfolio so that I can experience Phill's musical work alongside his developer projects.
- As a visitor, I want to see an audio-reactive visualizer so that the music playback feels immersive and matches the cyberpunk aesthetic.

## Specific Requirements

**Floating Action Button (FAB) - Collapsed State**
- Fixed position in bottom-right corner with 16-24px margin from edges
- Button size: 48-56px diameter, ensuring minimum 44x44px touch target
- Contains a Three.js canvas with audio-reactive visualizer when playing, static music icon when idle
- Neon glow effect using box-shadow with primary (cyan) color
- z-index high enough to float above all content but below modals
- Click/tap expands to full player panel

**Audio-Reactive 3D Visualizer (inside FAB)**
- Use React Three Fiber (@react-three/fiber) and Drei (@react-three/drei)
- Sphere geometry with MeshWobbleMaterial - wobble factor driven by bass frequency (20-250Hz)
- Sparkles particles - speed and count driven by treble frequencies (2kHz-8kHz)
- Color shifts through cyan to magenta based on overall audio intensity
- Three.js AudioAnalyser for FFT frequency data (128 or 256 bands)
- Canvas only renders when audio is playing for performance optimization
- When idle: display a static music note icon (SVG or Lucide icon)

**Expanded Player Panel**
- Slides up or expands from the FAB on click using Framer Motion AnimatePresence
- Fixed width ~320px on desktop, full width minus margins on mobile
- X button to minimize back to FAB with focus management
- gradient-card background styling matching existing portfolio cards
- Neon border accent using primary color

**Playback Controls**
- Play/pause toggle button with clear visual state indication
- Previous/next track buttons for navigation
- Seek bar showing current position and total duration, supporting click-to-seek and drag scrubbing
- Volume slider (vertical or horizontal) with mute toggle icon
- All controls minimum 44x44px touch targets
- Control icons using consistent style (Lucide icons or inline SVG)

**Track Metadata Display**
- Album artwork thumbnail (64-80px square) with fallback gradient placeholder
- Track name with CSS marquee/scroll animation for names exceeding container width
- Artist name and album name on separate lines
- Current time / total duration display in MM:SS format
- Scrollable description field (custom-scrollbar class) for per-track story/context

**Track List**
- Scrollable list showing all ~10 tracks
- Each item shows: thumbnail, track name, duration
- Visual indicator for currently playing track
- Click to select and play a track
- Track data stored in JSON file at /src/data/tracks.json

**Audio File Management**
- Self-hosted audio files in /public/audio/ directory
- Support MP3 format (~40MB total for ~10 tracks)
- Optional: Howler.js for cross-browser audio management, or native HTMLAudioElement
- Preload metadata only (not full audio) for performance

**Responsive Behavior**
- Works identically on desktop and mobile
- FAB position consistent (bottom-right corner)
- Expanded panel: fixed width on desktop (320px), near-full-width on mobile
- Touch-friendly controls with proper spacing

## Visual Design
No visual mockups provided. Implementation should follow the established cyberpunk aesthetic:
- Neon cyan (--primary) and magenta (--secondary) colors
- Dark gradient backgrounds (--background, --card)
- Neon glow effects using box-shadow
- gradient-card styling for the expanded panel
- custom-scrollbar class for scrollable areas
- Font: Audiowide for headings, Nunito for body text

## Existing Code to Leverage

**MobileMenu.tsx - Panel Animation Pattern**
- AnimatePresence with slide/expand animation using Framer Motion variants
- Backdrop overlay with blur effect for focus
- Focus trap implementation with keyboard navigation (Tab, Shift+Tab, Escape)
- Close button positioning and styling pattern
- Neon border accent styling (gradient left edge)

**SkillChip.tsx - Interactive Hover Effects**
- Particle color constants using cyberpunk palette (PARTICLE_COLORS)
- whileHover and whileTap scale effects (1.05, 0.97)
- useReducedMotion hook for accessibility
- Focus-visible ring styling pattern

**ProjectCard.tsx - Card Styling Pattern**
- gradient-card class usage with hover hue-rotate effect
- Image with fallback to gradient placeholder (project-placeholder-gradient)
- Neon text effect classes (neon-text-blue)
- Button styling with hover glow effects

**globals.css - Design Tokens and Effects**
- CSS custom properties for colors (--primary, --secondary, --accent)
- neon-border and neon-border-subtle box-shadow effects
- custom-scrollbar styling for consistent scrollbars
- pulse-glow keyframe animation for subtle glow pulsing
- gradient-card hover effect pattern

**types/content.ts - Type Definition Pattern**
- Follow existing interface structure for Track type
- Use id, title, and metadata fields pattern
- Place new Track interface in same file or dedicated music types file

## Out of Scope
- Full dedicated music section/page (only the floating player component)
- Lyrics display or synchronized lyrics
- Social sharing functionality (share buttons, embed codes)
- Spotify, SoundCloud, or Last.fm API integration
- Download functionality for tracks
- Equalizer presets or audio effects controls
- Full-page or section-wide visualizations (visualizer is contained to FAB only)
- Keyboard shortcuts for playback control
- Playlist creation or reordering
- Background audio persistence across page navigations (audio stops on navigate)
