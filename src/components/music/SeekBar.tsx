'use client'

import { useRef, useCallback } from 'react'
import { formatDuration } from '@/lib/audio-utils'

interface SeekBarProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

/**
 * Seek bar component for audio playback position.
 *
 * Features:
 * - Visual progress bar showing current position
 * - Time display in MM:SS format (current / total)
 * - Click-to-seek functionality
 * - Drag scrubbing support
 * - Cyberpunk styling with primary color fill
 *
 * @param currentTime - Current playback position in seconds
 * @param duration - Total track duration in seconds
 * @param onSeek - Callback when user seeks to a new position
 */
const SeekBar = ({ currentTime, duration, onSeek }: SeekBarProps) => {
  const progressRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Calculate seek position from click/drag event
  const calculateSeekPosition = useCallback(
    (clientX: number) => {
      if (!progressRef.current || duration <= 0) return

      const rect = progressRef.current.getBoundingClientRect()
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newTime = percent * duration

      onSeek(newTime)
    },
    [duration, onSeek]
  )

  // Handle click on progress bar
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      calculateSeekPosition(e.clientX)
    },
    [calculateSeekPosition]
  )

  // Handle mouse down for drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      isDraggingRef.current = true
      calculateSeekPosition(e.clientX)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (isDraggingRef.current) {
          calculateSeekPosition(moveEvent.clientX)
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
    [calculateSeekPosition]
  )

  // Handle touch events for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      isDraggingRef.current = true
      const touch = e.touches[0]
      calculateSeekPosition(touch.clientX)
    },
    [calculateSeekPosition]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (isDraggingRef.current) {
        const touch = e.touches[0]
        calculateSeekPosition(touch.clientX)
      }
    },
    [calculateSeekPosition]
  )

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  // Handle keyboard for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = duration * 0.05 // 5% of duration

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onSeek(Math.max(0, currentTime - step))
          break
        case 'ArrowRight':
          e.preventDefault()
          onSeek(Math.min(duration, currentTime + step))
          break
        case 'Home':
          e.preventDefault()
          onSeek(0)
          break
        case 'End':
          e.preventDefault()
          onSeek(duration)
          break
      }
    },
    [currentTime, duration, onSeek]
  )

  return (
    <div className="w-full" data-testid="seek-bar">
      {/* Progress bar */}
      <div
        ref={progressRef}
        className="
          relative
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
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(duration)}`}
        tabIndex={0}
        data-testid="seek-bar-progress"
      >
        {/* Filled progress */}
        <div
          className="
            absolute top-0 left-0 h-full
            bg-primary
            rounded-full
            transition-all duration-100
          "
          style={{
            width: `${progress}%`,
            boxShadow: '0 0 8px hsl(var(--primary) / 0.5)'
          }}
        />

        {/* Scrubber handle */}
        <div
          className="
            absolute top-1/2 -translate-y-1/2
            w-4 h-4
            bg-primary
            rounded-full
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
            pointer-events-none
          "
          style={{
            left: `calc(${progress}% - 8px)`,
            boxShadow: '0 0 10px hsl(var(--primary))'
          }}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between mt-1.5 text-xs text-foreground/60">
        <span data-testid="current-time">{formatDuration(currentTime)}</span>
        <span data-testid="duration">{formatDuration(duration)}</span>
      </div>
    </div>
  )
}

export default SeekBar
