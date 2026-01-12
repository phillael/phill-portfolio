'use client'

import { useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, Volume1 } from 'lucide-react'

interface VolumeControlProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
}

/**
 * Volume control component with slider and mute toggle.
 *
 * Features:
 * - Horizontal volume slider
 * - Mute toggle button with icon state
 * - Volume icon changes based on level
 * - Drag support for smooth volume adjustment
 * - Minimum 44x44px touch target for button
 * - Cyberpunk styling
 *
 * @param volume - Current volume level (0-1)
 * @param isMuted - Whether audio is muted
 * @param onVolumeChange - Callback when volume changes
 * @param onToggleMute - Callback to toggle mute state
 */
const VolumeControl = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute
}: VolumeControlProps) => {
  const sliderRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Determine which volume icon to show
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  // Calculate volume from position
  const calculateVolume = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return

      const rect = sliderRef.current.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      onVolumeChange(percent)
    },
    [onVolumeChange]
  )

  // Handle click on slider
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      calculateVolume(e.clientX)
    },
    [calculateVolume]
  )

  // Handle mouse down for drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      isDraggingRef.current = true
      calculateVolume(e.clientX)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (isDraggingRef.current) {
          calculateVolume(moveEvent.clientX)
        }
      }

      const handleMouseUp = () => {
        isDraggingRef.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [calculateVolume]
  )

  // Handle touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      isDraggingRef.current = true
      const touch = e.touches[0]
      calculateVolume(touch.clientX)
    },
    [calculateVolume]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) {
        const touch = e.touches[0]
        calculateVolume(touch.clientX)
      }
    },
    [calculateVolume]
  )

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Handle keyboard for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = 0.05 // 5% step

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault()
          onVolumeChange(Math.max(0, volume - step))
          break
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault()
          onVolumeChange(Math.min(1, volume + step))
          break
        case 'Home':
          e.preventDefault()
          onVolumeChange(0)
          break
        case 'End':
          e.preventDefault()
          onVolumeChange(1)
          break
      }
    },
    [volume, onVolumeChange]
  )

  // Display volume (0 if muted)
  const displayVolume = isMuted ? 0 : volume

  return (
    <div
      className="flex items-center gap-2"
      data-testid="volume-control"
    >
      {/* Mute Toggle Button */}
      <motion.button
        className="
          flex items-center justify-center
          w-11 h-11 min-w-[44px] min-h-[44px]
          rounded-md
          text-foreground/70 hover:text-primary
          transition-colors duration-150
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card
        "
        onClick={onToggleMute}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        aria-pressed={isMuted}
        data-testid="mute-button"
      >
        <VolumeIcon className="w-5 h-5" aria-hidden="true" />
      </motion.button>

      {/* Volume Slider */}
      <div
        ref={sliderRef}
        className="
          relative
          flex-1
          h-2
          bg-muted
          rounded-full
          cursor-pointer
          touch-none
          group
        "
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayVolume * 100)}
        aria-valuetext={isMuted ? 'Muted' : `${Math.round(displayVolume * 100)}%`}
        tabIndex={0}
        data-testid="volume-slider"
      >
        {/* Filled volume */}
        <div
          className="
            absolute top-0 left-0 h-full
            bg-secondary
            rounded-full
            transition-all duration-100
          "
          style={{
            width: `${displayVolume * 100}%`,
            boxShadow: '0 0 6px hsl(var(--secondary) / 0.5)'
          }}
        />

        {/* Handle */}
        <div
          className="
            absolute top-1/2 -translate-y-1/2
            w-3 h-3
            bg-secondary
            rounded-full
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
            pointer-events-none
          "
          style={{
            left: `calc(${displayVolume * 100}% - 6px)`,
            boxShadow: '0 0 8px hsl(var(--secondary))'
          }}
        />
      </div>
    </div>
  )
}

export default VolumeControl
