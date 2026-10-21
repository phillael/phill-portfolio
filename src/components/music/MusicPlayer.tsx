'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { registerSiteMusic } from '@/lib/site-music'
import MusicFAB from './MusicFAB'
import MusicPlayerPanel from './MusicPlayerPanel'
import TrackInfo from './TrackInfo'
import TrackList from './TrackList'
import PlaybackControls from './PlaybackControls'
import SeekBar from './SeekBar'
import VolumeControl from './VolumeControl'
import tracksData from '@/data/tracks.json'
import type { Track } from '@/types/content'

const tracks = tracksData as Track[]

/**
 * MusicPlayer - Parent component orchestrating the music player feature.
 *
 * Features:
 * - Integrates all music player components
 * - Uses useAudioPlayer hook for state management
 * - Manages expanded/collapsed panel state
 * - Passes frequency data to visualizer
 * - Renders FAB and expandable panel
 *
 * Layout:
 * - FAB in bottom-right corner (always visible)
 * - Panel expands above FAB when clicked
 */
const MusicPlayer = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const fabRef = useRef<HTMLButtonElement | null>(null)

  const {
    isPlaying,
    currentTrack,
    currentTime,
    duration,
    volume,
    isMuted,
    frequencyData,
    play,
    toggle,
    nextTrack,
    prevTrack,
    seek,
    setTrack,
    setVolume,
    toggleMute,
    getSourceNode,
    getAudioContext,
    pause
  } = useAudioPlayer(tracks)

  // One player for the whole site: the 3D resume dances to it, P toggles it, the
  // Experience section's Listen opens it (the panel then moves focus in, as on a FAB click)
  // and the Skill blaster plays through its AudioContext, pausing the song while it runs
  const playingRef = useRef(isPlaying)
  const toggleRef = useRef(toggle)
  const playRef = useRef(play)
  const pauseRef = useRef(pause)
  const listenersRef = useRef(new Set<(playing: boolean) => void>())
  useEffect(() => {
    toggleRef.current = toggle
    playRef.current = play
    pauseRef.current = pause
  }, [toggle, play, pause])
  useEffect(() => {
    if (playingRef.current === isPlaying) return
    playingRef.current = isPlaying
    for (const cb of [...listenersRef.current]) cb(isPlaying)
  }, [isPlaying])
  useEffect(() => {
    const listeners = listenersRef.current
    registerSiteMusic({
      getSource: () => getSourceNode(),
      isPlaying: () => playingRef.current,
      toggle: () => toggleRef.current(),
      open: () => setIsExpanded(true),
      context: () => getAudioContext(),
      pause: () => pauseRef.current(),
      play: () => playRef.current(),
      onChange: (cb) => {
        listeners.add(cb)
        return () => listeners.delete(cb)
      },
    })
    return () => registerSiteMusic(null)
  }, [getSourceNode, getAudioContext])

  // Toggle panel expansion
  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Close panel
  const handleClose = useCallback(() => {
    setIsExpanded(false)
  }, [])

  // Select and play a track from the list
  const handleSelectTrack = useCallback(
    (track: Track) => {
      setTrack(track)
      play()
    },
    [setTrack, play]
  )

  return (
    <>
      {/* Floating Action Button */}
      <MusicFAB
        isPlaying={isPlaying}
        isExpanded={isExpanded}
        frequencyData={frequencyData}
        onToggleExpand={handleToggleExpand}
        ref={fabRef}
      />

      {/* Expanded Player Panel */}
      <MusicPlayerPanel
        isExpanded={isExpanded}
        onClose={handleClose}
        fabRef={fabRef}
      >
        <div className="flex flex-col h-full gap-3">
          {/* Track Info */}
          <div className="flex-shrink-0">
            <TrackInfo
              track={currentTrack}
              currentTime={currentTime}
              duration={duration}
            />
          </div>

          {/* Seek Bar */}
          <div className="flex-shrink-0">
            <SeekBar
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
            />
          </div>

          {/* Playback Controls */}
          <div className="flex-shrink-0">
            <PlaybackControls
              isPlaying={isPlaying}
              onToggle={toggle}
              onPrevious={prevTrack}
              onNext={nextTrack}
            />
          </div>

          {/* Volume Control - hidden on mobile (iOS doesn't support programmatic volume) */}
          <div className="flex-shrink-0 hidden md:block">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
            />
          </div>

          {/* Track List - fills remaining space */}
          <div className="flex-1 min-h-0 border-t border-primary/20 pt-3 flex flex-col">
            <p className="text-xs text-foreground/50 mb-2 flex-shrink-0">Track List</p>

            {/* Track List - scrollable */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <TrackList
                tracks={tracks}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                onSelectTrack={handleSelectTrack}
              />
            </div>
          </div>
        </div>
      </MusicPlayerPanel>
    </>
  )
}

export default MusicPlayer
