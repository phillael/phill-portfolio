'use client'

import { motion } from 'framer-motion'
import { Music } from 'lucide-react'
import AudioVisualizer from './AudioVisualizer'
import type { FrequencyData } from '@/lib/audio-utils'

interface MusicFABProps {
  isPlaying: boolean
  isExpanded: boolean
  frequencyData: FrequencyData
  onToggleExpand: () => void
}

/**
 * Floating Action Button for the music player.
 *
 * Features:
 * - Fixed position in bottom-right corner
 * - 52px diameter button (meets 44x44px minimum touch target)
 * - Shows AudioVisualizer when playing, static music icon when idle
 * - Neon glow effect with pulse animation when playing
 * - Click to expand/collapse player panel
 * - Full accessibility support with aria labels and keyboard interaction
 *
 * @param isPlaying - Whether audio is currently playing
 * @param isExpanded - Whether the player panel is expanded
 * @param frequencyData - Audio frequency data for visualizer
 * @param onToggleExpand - Callback to toggle expanded state
 */
const MusicFAB = ({
  isPlaying,
  isExpanded,
  frequencyData,
  onToggleExpand
}: MusicFABProps) => {
  // Determine aria label based on state
  const ariaLabel = isExpanded
    ? 'Close music player'
    : isPlaying
      ? 'Open music player (currently playing)'
      : 'Open music player'

  return (
    <motion.button
      className={`
        fixed bottom-4 right-4 md:bottom-6 md:right-6
        w-[52px] h-[52px] md:w-14 md:h-14
        rounded-full
        flex items-center justify-center
        overflow-hidden
        z-40
        bg-card border-2 border-primary/50
        transition-shadow duration-300
        focus:outline-none
        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${isPlaying ? 'fab-playing' : ''}
      `}
      style={{
        boxShadow: isPlaying
          ? '0 0 15px hsl(var(--primary)), 0 0 30px hsl(var(--primary) / 0.5), 0 0 45px hsl(var(--primary) / 0.3)'
          : '0 0 8px hsl(var(--primary) / 0.4), 0 0 16px hsl(var(--primary) / 0.2)'
      }}
      onClick={onToggleExpand}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={isPlaying ? {
        boxShadow: [
          '0 0 15px hsl(var(--primary)), 0 0 30px hsl(var(--primary) / 0.5), 0 0 45px hsl(var(--primary) / 0.3)',
          '0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary) / 0.6), 0 0 60px hsl(var(--primary) / 0.4)',
          '0 0 15px hsl(var(--primary)), 0 0 30px hsl(var(--primary) / 0.5), 0 0 45px hsl(var(--primary) / 0.3)'
        ]
      } : undefined}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        },
        scale: {
          duration: 0.15
        }
      }}
      role="button"
      aria-label={ariaLabel}
      aria-expanded={isExpanded}
      aria-haspopup="dialog"
      data-testid="music-fab"
    >
      {isPlaying ? (
        <div className="w-full h-full">
          <AudioVisualizer
            isPlaying={isPlaying}
            frequencyData={frequencyData}
          />
        </div>
      ) : (
        <Music
          className="w-6 h-6 md:w-7 md:h-7 text-primary"
          aria-hidden="true"
        />
      )}
    </motion.button>
  )
}

export default MusicFAB
