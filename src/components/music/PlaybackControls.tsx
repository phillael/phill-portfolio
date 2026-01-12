'use client'

import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

interface PlaybackControlsProps {
  isPlaying: boolean
  onToggle: () => void
  onPrevious: () => void
  onNext: () => void
}

/**
 * Playback control buttons component.
 *
 * Features:
 * - Play/Pause toggle button with state indication
 * - Previous/Next track buttons
 * - All buttons have minimum 44x44px touch targets
 * - Cyberpunk styling with hover/tap animations
 * - Full accessibility support
 *
 * @param isPlaying - Whether audio is currently playing
 * @param onToggle - Callback to toggle play/pause
 * @param onPrevious - Callback to go to previous track
 * @param onNext - Callback to go to next track
 */
const PlaybackControls = ({
  isPlaying,
  onToggle,
  onPrevious,
  onNext
}: PlaybackControlsProps) => {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="group"
      aria-label="Playback controls"
      data-testid="playback-controls"
    >
      {/* Previous Track Button */}
      <motion.button
        className="
          flex items-center justify-center
          w-11 h-11 min-w-[44px] min-h-[44px]
          rounded-full
          text-foreground/70 hover:text-primary
          transition-colors duration-150
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card
        "
        onClick={onPrevious}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Previous track"
        data-testid="prev-button"
      >
        <SkipBack className="w-5 h-5" aria-hidden="true" />
      </motion.button>

      {/* Play/Pause Button */}
      <motion.button
        className={`
          flex items-center justify-center
          w-14 h-14 min-w-[44px] min-h-[44px]
          rounded-full
          bg-primary/20
          text-primary
          border-2 border-primary/50
          transition-all duration-150
          hover:bg-primary/30 hover:border-primary
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card
          ${isPlaying ? 'shadow-[0_0_15px_hsl(var(--primary)/0.5)]' : ''}
        `}
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        aria-pressed={isPlaying}
        data-testid="play-pause-button"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Play className="w-6 h-6 ml-0.5" aria-hidden="true" />
        )}
      </motion.button>

      {/* Next Track Button */}
      <motion.button
        className="
          flex items-center justify-center
          w-11 h-11 min-w-[44px] min-h-[44px]
          rounded-full
          text-foreground/70 hover:text-primary
          transition-colors duration-150
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card
        "
        onClick={onNext}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Next track"
        data-testid="next-button"
      >
        <SkipForward className="w-5 h-5" aria-hidden="true" />
      </motion.button>
    </div>
  )
}

export default PlaybackControls
