# Spec Requirements: Music & Audio Features

## Initial Description

Build a music section for the cyberpunk developer portfolio that showcases Phill's musician background. This includes:

1. **Music Player Component** - Custom audio player with play/pause, track selection, volume control, and progress scrubbing for original compositions

2. **Audio Visualizations** - Real-time audio visualizations using Web Audio API that respond to music playback

3. **Music Section Integration** - Showcase section featuring the iTunes #1 jazz album (Meta-Musica by The Funky Knuckles) and ECO game soundtrack ($7.1M revenue, 314K units sold)

## Requirements Discussion

### First Round Questions

**Q1:** What audio hosting approach should we use - self-hosted files, Spotify embed, SoundCloud, or a combination?
**Answer:** Self-hosted audio files in /public/audio/. Approximately 10 tracks, roughly 40MB total. Full UI control that matches the cyberpunk aesthetic with no third-party dependencies.

**Q2:** For the music player, what UI pattern should we use - full section, floating player, or modal?
**Answer:** Floating Action Button (FAB) pattern in the bottom-right corner. Small collapsed state (48-56px) that expands to full player panel on click.

**Q3:** What controls and features should the player include?
**Answer:** Play/pause, previous/next track, seek bar (progress scrubbing), volume slider with mute toggle. No keyboard shortcuts needed.

**Q4:** What track information should be displayed?
**Answer:** Album artwork thumbnail, track name (with marquee scroll for long names), artist name, album name, track duration, and a scrolling description field where custom descriptions can be written per track.

**Q5:** What type of audio visualization do you want?
**Answer:** Audio-reactive visualizer inside the FAB icon using Three.js AudioAnalyser. When music is playing: sphere with MeshWobbleMaterial (pulsing blob) plus Sparkles particles driven by frequency data. When not playing: static music icon.

**Q6:** Should the visualizer be full-page or contained to a specific area?
**Answer:** Contained within the FAB icon only (48-56px canvas). No full-page visualizations.

**Q7:** What should the behavior be on mobile vs desktop?
**Answer:** Works identically on both. FAB in bottom-right corner, expands to player panel on click, X button to minimize back to FAB.

### Existing Code to Reference

No specific existing features identified for reference. This is a new component pattern for the portfolio.

### Follow-up Questions

**Follow-up 1:** What specific Three.js libraries/approaches should be used for the visualizer?
**Answer:** React Three Fiber (@react-three/fiber) and Drei (@react-three/drei) for PositionalAudio, Sparkles, and MeshWobbleMaterial. Three.js AudioAnalyser for frequency analysis. Optional Howler.js for audio playback management.

**Follow-up 2:** What visual effects should the visualizer respond to?
**Answer:** MeshWobbleMaterial factor driven by bass frequency. Sparkles particles speed/count driven by treble. Color shifts through cyan/magenta based on intensity.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual mockups available. Implementation should follow the cyberpunk aesthetic established in the portfolio with neon cyan/magenta colors and glow effects.

## Requirements Summary

### Functional Requirements

**Music Player - Floating Action Button (FAB) Pattern:**

*Collapsed State:*
- Small floating button (48-56px) in bottom-right corner
- Contains a Three.js canvas with audio-reactive visualizer
- When music playing: Sphere with MeshWobbleMaterial (pulsing blob) + Sparkles particles, driven by AudioAnalyser frequency data
- When not playing: Static music icon
- Subtle neon glow effect matching cyberpunk theme

*Expanded State (click to open):*
- Full player panel slides up/expands from the button
- X button to minimize back to FAB
- Works identically on desktop and mobile

*Player Controls:*
- Play/pause
- Previous/next track
- Seek bar (progress scrubbing)
- Volume slider with mute toggle
- No keyboard shortcuts needed

*Track Display:*
- Album artwork thumbnail
- Track name (marquee scroll if long)
- Artist name
- Album name
- Track duration
- Scrolling description field (user can write custom descriptions per track like "I wrote this song while eating turtle soup in Uganda")

*Track List:*
- Browse/select from ~10 tracks
- Show track metadata in list

**Audio Source:**
- Self-hosted audio files in /public/audio/
- ~10 tracks, approximately 40MB total
- Full UI control, matches cyberpunk aesthetic
- No third-party dependencies (Spotify/SoundCloud)

**Audio-Reactive Visualizer (in FAB icon):**
- Uses Three.js AudioAnalyser for frequency data
- React Three Fiber + Drei implementation
- Sphere with MeshWobbleMaterial - factor driven by bass frequency
- Sparkles particles - speed/count driven by treble
- Color shifts through cyan/magenta based on intensity
- Canvas only renders when music playing (performance optimization)
- Small canvas size (48-56px) keeps it performant

### Reusability Opportunities

- Framer Motion animation patterns already exist in the portfolio for expand/collapse transitions
- Cyberpunk color palette (cyan/magenta) and glow effects are established in the design system
- Three.js integration patterns documented in CLAUDE.md can be referenced

### Scope Boundaries

**In Scope:**
- Floating music player FAB component
- Audio-reactive 3D visualizer in FAB icon
- Full playback controls (play/pause, prev/next, seek, volume)
- Track list with metadata display
- Self-hosted audio file playback
- Responsive design (same behavior on mobile and desktop)

**Out of Scope:**
- Full music section/page (just the floating player)
- Lyrics display
- Social sharing
- Last.fm/Spotify integration
- Download functionality
- Equalizer presets
- Full-page visualizations
- Keyboard shortcuts

### Technical Considerations

**Libraries Required:**
- React Three Fiber (@react-three/fiber)
- Drei (@react-three/drei) - PositionalAudio, Sparkles, MeshWobbleMaterial
- Three.js AudioAnalyser for frequency analysis
- Howler.js for audio playback management (optional, or use native Three.js Audio)
- Framer Motion for panel animations (expand/collapse)

**Performance Optimizations:**
- Canvas only renders when music is playing
- Small canvas size (48-56px) minimizes GPU load
- Audio files self-hosted (~40MB total for ~10 tracks)

**Design System Integration:**
- Must match cyberpunk "Tokyo at midnight" aesthetic
- Use neon cyan primary, magenta secondary colors
- Include neon glow effects
- Follow existing Tailwind CSS patterns
