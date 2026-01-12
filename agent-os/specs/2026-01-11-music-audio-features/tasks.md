# Task Breakdown: Music & Audio Features

## Overview
Total Tasks: 32

This spec implements a floating music player with an audio-reactive 3D visualizer to showcase Phill's musician background. The feature includes a FAB (Floating Action Button) with Three.js visualizer, expandable player panel with full playback controls, track list, and metadata display.

## Task List

### Data & Types Layer

#### Task Group 1: Track Data Model and JSON Structure
**Dependencies:** None

- [x] 1.0 Complete data layer for tracks
  - [x] 1.1 Write 3-5 focused tests for Track type and data loading
    - Test Track interface has required fields (id, title, artist, album, duration, audioUrl)
    - Test tracks.json loads and parses correctly
    - Test optional fields (description, artworkUrl) handle missing values
    - Test duration formatting helper (seconds to MM:SS)
  - [x] 1.2 Create Track interface in `/src/types/content.ts`
    - Fields: id, title, artist, album, duration (number), audioUrl
    - Optional fields: artworkUrl, description
    - Follow existing interface patterns from Experience and Project types
  - [x] 1.3 Create `/src/data/tracks.json` with sample track data
    - Include 10 placeholder tracks with metadata
    - Use placeholder audioUrl paths pointing to `/public/audio/`
    - Include varied track durations for testing
  - [x] 1.4 Create utility function for duration formatting
    - Convert seconds to MM:SS format
    - Handle edge cases (0 duration, very long tracks)
    - Place in `/src/lib/utils.ts` or new `/src/lib/audio-utils.ts`
  - [x] 1.5 Ensure data layer tests pass
    - Run ONLY the 3-5 tests written in 1.1
    - Verify TypeScript compilation succeeds

**Acceptance Criteria:**
- The 3-5 tests written in 1.1 pass
- Track interface is properly typed
- JSON data loads without errors
- Duration formatting works correctly

---

### Audio Engine Layer

#### Task Group 2: Audio Playback Hook and Web Audio Integration
**Dependencies:** Task Group 1

- [x] 2.0 Complete audio playback engine
  - [x] 2.1 Write 4-6 focused tests for audio hook functionality
    - Test play/pause state toggle
    - Test track loading and currentTrack state
    - Test next/previous track navigation
    - Test volume control and mute toggle
    - Test seek functionality updates currentTime
    - Test AudioAnalyser frequency data retrieval
  - [x] 2.2 Create `useAudioPlayer` hook in `/src/hooks/useAudioPlayer.ts`
    - Manage HTMLAudioElement instance
    - State: isPlaying, currentTrack, currentTime, duration, volume, isMuted
    - Actions: play, pause, toggle, setTrack, nextTrack, prevTrack, seek, setVolume, toggleMute
    - Preload metadata only for performance
  - [x] 2.3 Integrate Web Audio API for frequency analysis
    - Create AudioContext and connect to audio element
    - Create AnalyserNode with 128 or 256 FFT size
    - Expose getFrequencyData() method returning Uint8Array
    - Handle AudioContext resume on user interaction (browser autoplay policy)
  - [x] 2.4 Add frequency band extraction utilities
    - Extract bass frequency range (20-250Hz)
    - Extract treble frequency range (2kHz-8kHz)
    - Calculate overall intensity (average amplitude)
    - Return normalized values (0-1) for visualizer consumption
  - [x] 2.5 Handle audio element lifecycle and cleanup
    - Proper cleanup on unmount
    - Handle audio errors gracefully
    - Emit events for track end (auto-advance)
  - [x] 2.6 Ensure audio engine tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify hook state management works correctly

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- Audio plays and pauses correctly
- Frequency data is accessible for visualizer
- Volume and seek controls function properly

---

### 3D Visualizer Layer

#### Task Group 3: React Three Fiber Audio Visualizer
**Dependencies:** Task Group 2

- [x] 3.0 Complete 3D visualizer component
  - [x] 3.1 Write 3-5 focused tests for visualizer component
    - Test canvas renders when isPlaying is true
    - Test canvas does not render when isPlaying is false (shows static icon)
    - Test wobble factor responds to bass frequency input
    - Test color shifts based on intensity value
  - [x] 3.2 Install React Three Fiber dependencies
    - `npm install @react-three/fiber @react-three/drei three`
    - Verify TypeScript types are available (@types/three)
  - [x] 3.3 Create `AudioVisualizer` component in `/src/components/music/AudioVisualizer.tsx`
    - Use Canvas from @react-three/fiber
    - Small canvas size (48-56px) matching FAB dimensions
    - Accept frequencyData prop (bass, treble, intensity)
    - Conditional rendering: only render 3D scene when playing
  - [x] 3.4 Implement wobbling sphere with MeshWobbleMaterial
    - Use Sphere geometry from Drei
    - MeshWobbleMaterial with factor driven by bass (0-1 mapped to 0.5-3)
    - Speed parameter for animation
    - Base color cyan, emissive for glow effect
  - [x] 3.5 Add Sparkles particle effect
    - Use Sparkles from Drei
    - Count driven by treble (10-50 particles)
    - Speed driven by treble intensity
    - Colors: cyan and magenta
  - [x] 3.6 Implement color shifting based on intensity
    - Interpolate between cyan (low) and magenta (high)
    - Use THREE.Color.lerp for smooth transitions
    - Apply to both sphere material and sparkles
  - [x] 3.7 Optimize performance
    - Use useFrame for animation loop
    - Canvas only renders when isPlaying is true
    - Dispose of resources on unmount
  - [x] 3.8 Ensure visualizer tests pass
    - Run ONLY the 3-5 tests written in 3.1
    - Verify visual rendering with mocked frequency data

**Acceptance Criteria:**
- The 3-5 tests written in 3.1 pass
- Visualizer responds to audio frequency data
- Performance is smooth at 60fps on modern devices
- Renders only when audio is playing

---

### FAB Component Layer

#### Task Group 4: Floating Action Button Component
**Dependencies:** Task Group 3

- [x] 4.0 Complete FAB component
  - [x] 4.1 Write 3-5 focused tests for FAB behavior
    - Test FAB renders in bottom-right corner with correct positioning
    - Test click toggles expanded state
    - Test visualizer shows when playing, music icon shows when idle
    - Test FAB has minimum 44x44px touch target
    - Test neon glow effect is applied
  - [x] 4.2 Create `MusicFAB` component in `/src/components/music/MusicFAB.tsx`
    - Fixed position bottom-right (16-24px margin)
    - Button size 48-56px diameter
    - z-index: 40 (above content, below modals)
    - Accept isPlaying and frequencyData props
  - [x] 4.3 Implement collapsed state rendering
    - When playing: render AudioVisualizer component
    - When idle: render static music note icon (Lucide Music icon)
    - Smooth transition between states
  - [x] 4.4 Add neon glow effect styling
    - Use box-shadow with primary (cyan) color
    - Pulse animation using existing pulse-glow keyframe
    - Enhanced glow when playing
  - [x] 4.5 Implement click handler for expand/collapse
    - onClick toggles isExpanded state
    - Pass state up to parent via callback
    - Framer Motion scale effect on tap (0.95)
  - [x] 4.6 Add accessibility attributes
    - aria-label describing current state
    - role="button"
    - Focus visible ring styling (match existing patterns)
  - [x] 4.7 Ensure FAB tests pass
    - Run ONLY the 3-5 tests written in 4.1
    - Verify positioning and interaction

**Acceptance Criteria:**
- The 3-5 tests written in 4.1 pass
- FAB is fixed in bottom-right corner
- Visualizer displays when playing
- Click expands to player panel

---

### Player Panel UI Layer

#### Task Group 5: Expanded Player Panel Component
**Dependencies:** Task Group 4

- [x] 5.0 Complete expanded player panel
  - [x] 5.1 Write 4-6 focused tests for player panel
    - Test panel renders when isExpanded is true
    - Test AnimatePresence slide-up animation triggers
    - Test X button click calls onClose callback
    - Test panel is 320px on desktop, near-full-width on mobile
    - Test focus trap keeps focus within panel when open
  - [x] 5.2 Create `MusicPlayerPanel` component in `/src/components/music/MusicPlayerPanel.tsx`
    - Use AnimatePresence from Framer Motion (pattern from MobileMenu.tsx)
    - Fixed positioning, slides up from FAB location
    - Width: 320px on desktop, calc(100% - 32px) on mobile
    - gradient-card background styling
    - Neon border accent (pattern from MobileMenu.tsx)
  - [x] 5.3 Implement panel animation variants
    - Initial: opacity 0, y: 100, scale: 0.9
    - Animate: opacity 1, y: 0, scale: 1
    - Exit: opacity 0, y: 50
    - Spring physics matching MobileMenu pattern
  - [x] 5.4 Add close button (X)
    - Position in top-right corner
    - 44x44px minimum touch target
    - Match MobileMenu close button styling
    - onClick calls onClose prop
  - [x] 5.5 Implement focus trap and keyboard handling
    - Trap focus within panel when open (pattern from MobileMenu.tsx)
    - Escape key closes panel
    - Return focus to FAB when closed
  - [x] 5.6 Add backdrop/overlay (optional)
    - Semi-transparent backdrop on mobile
    - Click backdrop to close
    - Match MobileMenu backdrop pattern
  - [x] 5.7 Ensure player panel tests pass
    - Run ONLY the 4-6 tests written in 5.1
    - Verify animation and focus management

**Acceptance Criteria:**
- The 4-6 tests written in 5.1 pass
- Panel slides up smoothly from FAB
- Focus is trapped within panel
- X button closes panel

---

### Playback Controls Layer

#### Task Group 6: Playback Control Components
**Dependencies:** Task Groups 2, 5

- [x] 6.0 Complete playback controls
  - [x] 6.1 Write 4-6 focused tests for playback controls
    - Test play/pause button toggles state and shows correct icon
    - Test prev/next buttons trigger track navigation
    - Test seek bar updates on drag and click
    - Test volume slider changes volume value
    - Test mute toggle mutes/unmutes audio
  - [x] 6.2 Create `PlaybackControls` component in `/src/components/music/PlaybackControls.tsx`
    - Container for all playback control buttons
    - Centered layout with consistent spacing
    - All buttons minimum 44x44px touch targets
  - [x] 6.3 Implement Play/Pause button
    - Show Play icon when paused, Pause icon when playing
    - Use Lucide icons (Play, Pause)
    - whileHover scale 1.05, whileTap scale 0.95 (pattern from ProjectCard.tsx)
    - onClick calls toggle() from useAudioPlayer
  - [x] 6.4 Implement Previous/Next buttons
    - Lucide icons (SkipBack, SkipForward)
    - Same hover/tap animations
    - onClick calls prevTrack()/nextTrack()
  - [x] 6.5 Create `SeekBar` component in `/src/components/music/SeekBar.tsx`
    - Display current time / total duration in MM:SS
    - Progress bar showing playback position
    - Click-to-seek functionality
    - Drag scrubbing support
    - Styled to match cyberpunk theme (primary color fill)
  - [x] 6.6 Create `VolumeControl` component in `/src/components/music/VolumeControl.tsx`
    - Volume slider (range input or custom)
    - Mute toggle button (Volume2, VolumeX icons)
    - Vertical or horizontal layout option
    - Shows current volume level visually
  - [x] 6.7 Style all controls with cyberpunk aesthetic
    - Neon glow on hover/active states
    - Primary/secondary color accents
    - Focus-visible ring styling
  - [x] 6.8 Ensure playback controls tests pass
    - Run ONLY the 4-6 tests written in 6.1
    - Verify all control interactions work

**Acceptance Criteria:**
- The 4-6 tests written in 6.1 pass
- All playback controls are functional
- Seek and volume work smoothly
- Touch targets meet 44x44px minimum

---

### Track Display Layer

#### Task Group 7: Track Metadata and List Components
**Dependencies:** Task Groups 1, 5

- [x] 7.0 Complete track display components
  - [x] 7.1 Write 3-5 focused tests for track display
    - Test TrackInfo displays current track metadata correctly
    - Test album artwork shows image or fallback gradient
    - Test long track names trigger marquee scroll
    - Test TrackList renders all tracks and highlights current
    - Test clicking track in list triggers playback
  - [x] 7.2 Create `TrackInfo` component in `/src/components/music/TrackInfo.tsx`
    - Album artwork thumbnail (64-80px) with Image component
    - Fallback gradient for missing artwork (project-placeholder-gradient pattern)
    - Track name, artist name, album name
    - Current time / duration display
  - [x] 7.3 Implement marquee scroll for long track names
    - CSS animation for names exceeding container width
    - Only animate when text overflows
    - Smooth looping animation
  - [x] 7.4 Create scrollable description field
    - Display per-track description/story
    - Use custom-scrollbar class from globals.css
    - Max height with overflow scroll
  - [x] 7.5 Create `TrackList` component in `/src/components/music/TrackList.tsx`
    - Scrollable list of all tracks
    - Each item shows: thumbnail, track name, duration
    - Visual indicator for currently playing track (highlight, icon)
    - custom-scrollbar class for scroll styling
  - [x] 7.6 Implement track selection
    - Click on track item triggers setTrack() and play()
    - Keyboard accessible (Enter/Space to select)
    - Focus management within list
  - [x] 7.7 Ensure track display tests pass
    - Run ONLY the 3-5 tests written in 7.1
    - Verify metadata displays correctly

**Acceptance Criteria:**
- The 3-5 tests written in 7.1 pass
- Track metadata displays correctly
- Artwork has fallback handling
- Track list is scrollable and selectable

---

### Integration Layer

#### Task Group 8: Component Integration and State Management
**Dependencies:** Task Groups 4, 5, 6, 7

- [x] 8.0 Complete integration of all music components
  - [x] 8.1 Write 3-5 focused tests for integrated player
    - Test MusicPlayer mounts without errors
    - Test clicking FAB expands panel with all child components
    - Test playing a track shows visualizer in FAB and updates panel
    - Test full user flow: open panel, select track, play, seek, close
  - [x] 8.2 Create `MusicPlayer` parent component in `/src/components/music/MusicPlayer.tsx`
    - Orchestrates all child components
    - Uses useAudioPlayer hook for state
    - Manages isExpanded state for FAB/panel toggle
    - Passes frequency data to visualizer
  - [x] 8.3 Wire up all component connections
    - Pass currentTrack to TrackInfo and TrackList
    - Pass playback state to controls
    - Pass frequency data to AudioVisualizer
    - Connect all callbacks (play, pause, seek, etc.)
  - [x] 8.4 Add to app layout
    - Import MusicPlayer in `/src/app/layout.tsx` or appropriate location
    - Ensure it renders on all pages
    - Position does not interfere with other fixed elements
  - [x] 8.5 Test responsive behavior
    - Verify FAB position on mobile and desktop
    - Verify panel width adjusts correctly
    - Test touch interactions on mobile viewport
  - [x] 8.6 Ensure integration tests pass
    - Run ONLY the 3-5 tests written in 8.1
    - Verify end-to-end functionality

**Acceptance Criteria:**
- The 3-5 tests written in 8.1 pass
- All components work together seamlessly
- Player appears on all pages
- Responsive design works correctly

---

### Testing & Polish Layer

#### Task Group 9: Test Review and Final Polish
**Dependencies:** Task Groups 1-8

- [x] 9.0 Review and finalize implementation
  - [x] 9.1 Review tests from Task Groups 1-8
    - Review 3-5 tests from data layer (Task 1.1)
    - Review 4-6 tests from audio engine (Task 2.1)
    - Review 3-5 tests from visualizer (Task 3.1)
    - Review 3-5 tests from FAB (Task 4.1)
    - Review 4-6 tests from player panel (Task 5.1)
    - Review 4-6 tests from playback controls (Task 6.1)
    - Review 3-5 tests from track display (Task 7.1)
    - Review 3-5 tests from integration (Task 8.1)
    - Total existing tests: approximately 27-43 tests
  - [x] 9.2 Analyze test coverage gaps for music feature only
    - Identify any critical user workflows lacking coverage
    - Focus on edge cases: audio errors, empty track list, browser autoplay restrictions
    - Check accessibility interactions are tested
  - [x] 9.3 Write up to 7 additional tests to fill critical gaps
    - Test audio error handling (file not found)
    - Test browser autoplay policy handling (AudioContext resume)
    - Test reduced motion preference is respected
    - Test keyboard navigation through all controls
    - Test track end auto-advances to next
  - [x] 9.4 Add placeholder audio files to `/public/audio/`
    - Create directory structure
    - Add at least 2-3 short test audio files (can be silence or simple tones)
    - Verify audio files load correctly
  - [x] 9.5 Final accessibility audit
    - Verify all interactive elements have proper ARIA labels
    - Test with keyboard-only navigation
    - Verify focus states are visible
    - Check color contrast ratios
  - [x] 9.6 Performance verification
    - Verify visualizer only renders when playing
    - Check for memory leaks on mount/unmount
    - Test on slower devices if possible
  - [x] 9.7 Run all music feature tests
    - Run ONLY tests related to music feature (Tasks 1.1 through 8.1 plus 9.3)
    - Expected total: approximately 34-50 tests
    - Verify all tests pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 34-50 tests total)
- Critical user workflows are covered
- Accessibility requirements met
- Performance is acceptable

---

## Execution Order

Recommended implementation sequence:

1. **Data & Types Layer (Task Group 1)** - Foundation for track data
2. **Audio Engine Layer (Task Group 2)** - Core playback functionality and Web Audio API
3. **3D Visualizer Layer (Task Group 3)** - React Three Fiber visualizer component
4. **FAB Component Layer (Task Group 4)** - Floating action button with visualizer
5. **Player Panel UI Layer (Task Group 5)** - Expandable panel container
6. **Playback Controls Layer (Task Group 6)** - Play/pause, seek, volume controls
7. **Track Display Layer (Task Group 7)** - Metadata and track list
8. **Integration Layer (Task Group 8)** - Wire everything together
9. **Testing & Polish Layer (Task Group 9)** - Fill gaps and finalize

## Files to Create

```
/src/types/content.ts                          # Add Track interface (modify existing)
/src/data/tracks.json                          # Track metadata JSON
/src/lib/audio-utils.ts                        # Duration formatting, frequency helpers
/src/hooks/useAudioPlayer.ts                   # Audio playback state hook
/src/components/music/AudioVisualizer.tsx      # React Three Fiber visualizer
/src/components/music/MusicFAB.tsx             # Floating action button
/src/components/music/MusicPlayerPanel.tsx     # Expanded player panel
/src/components/music/PlaybackControls.tsx     # Play/pause/prev/next buttons
/src/components/music/SeekBar.tsx              # Progress/seek bar
/src/components/music/VolumeControl.tsx        # Volume slider and mute
/src/components/music/TrackInfo.tsx            # Current track metadata display
/src/components/music/TrackList.tsx            # Scrollable track list
/src/components/music/MusicPlayer.tsx          # Parent orchestration component
/public/audio/                                 # Audio files directory
```

## Dependencies to Install

```bash
npm install @react-three/fiber @react-three/drei three
npm install -D @types/three  # If not bundled
```

## Existing Patterns to Leverage

| Pattern | Source File | Usage |
|---------|-------------|-------|
| AnimatePresence + Variants | MobileMenu.tsx | Player panel animation |
| Focus trap implementation | MobileMenu.tsx | Panel keyboard navigation |
| whileHover/whileTap scale | ProjectCard.tsx, SkillChip.tsx | Button interactions |
| useReducedMotion | SkillChip.tsx | Accessibility for visualizer |
| gradient-card styling | ProjectCard.tsx | Panel background |
| project-placeholder-gradient | globals.css | Artwork fallback |
| custom-scrollbar | globals.css | Track list scrolling |
| neon-border effects | globals.css | FAB and panel glow |
| pulse-glow animation | globals.css | FAB idle animation |
| Focus-visible ring | MobileMenu.tsx | Button focus states |
| Type interface patterns | types/content.ts | Track interface |

## Implementation Summary

All 9 task groups have been completed successfully:

**Tests Created:**
- `music-data.test.ts` - 13 tests for data layer
- `music-audio-engine.test.ts` - 17 tests for audio playback hook
- `music-visualizer.test.tsx` - 8 tests for 3D visualizer
- `music-fab.test.tsx` - 14 tests for FAB component
- `music-player-panel.test.tsx` - 20 tests for player panel
- `music-playback-controls.test.tsx` - 29 tests for controls
- `music-track-display.test.tsx` - 18 tests for track display
- `music-integration.test.tsx` - 9 tests for integration
- `music-edge-cases.test.tsx` - 19 tests for edge cases

**Total: 147 tests passing**

**Components Created:**
- `AudioVisualizer.tsx` - React Three Fiber 3D visualizer
- `MusicFAB.tsx` - Floating action button
- `MusicPlayerPanel.tsx` - Expandable panel with focus trap
- `PlaybackControls.tsx` - Play/pause/prev/next buttons
- `SeekBar.tsx` - Progress bar with click and drag support
- `VolumeControl.tsx` - Volume slider with mute toggle
- `TrackInfo.tsx` - Current track metadata display
- `TrackList.tsx` - Scrollable track selection
- `MusicPlayer.tsx` - Parent orchestration component
- `index.ts` - Export barrel file

**Supporting Files:**
- `useAudioPlayer.ts` - Audio playback state hook with Web Audio API
- `audio-utils.ts` - Duration formatting and frequency extraction
- `tracks.json` - 10 sample tracks with metadata
- Updated `content.ts` with Track interface
- Updated `layout.tsx` to include MusicPlayer
