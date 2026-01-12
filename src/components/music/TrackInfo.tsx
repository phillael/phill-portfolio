'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import type { Track } from '@/types/content'
import { formatDuration } from '@/lib/audio-utils'

interface TrackInfoProps {
  track: Track | null
  currentTime: number
  duration: number
}

/**
 * Track information display component.
 *
 * Features:
 * - Album artwork thumbnail (64-80px) with fallback gradient
 * - Track name with marquee scroll for long names
 * - Artist name and album name
 * - Current time / duration display
 * - Scrollable description field
 *
 * @param track - Current track data
 * @param currentTime - Current playback position in seconds
 * @param duration - Total track duration in seconds
 */
const TrackInfo = ({ track, currentTime, duration }: TrackInfoProps) => {
  const titleRef = useRef<HTMLDivElement>(null)
  const [shouldMarquee, setShouldMarquee] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Check if title needs marquee scroll
  useEffect(() => {
    if (titleRef.current) {
      const isOverflowing = titleRef.current.scrollWidth > titleRef.current.clientWidth
      setShouldMarquee(isOverflowing)
    }
  }, [track?.title])

  // Reset image error when track changes
  useEffect(() => {
    setImageError(false)
  }, [track?.id])

  if (!track) {
    return (
      <div className="flex items-center gap-4" data-testid="track-info">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-md project-placeholder-gradient flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-foreground/50 text-sm">No track selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="track-info">
      {/* Main track info row */}
      <div className="flex items-center gap-4">
        {/* Album artwork */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden flex-shrink-0 relative">
          {track.artworkUrl && !imageError ? (
            <Image
              src={track.artworkUrl}
              alt={`${track.album} album artwork`}
              fill
              className="object-cover"
              sizes="80px"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="w-full h-full project-placeholder-gradient flex items-center justify-center"
              data-testid="artwork-fallback"
            >
              <span className="text-foreground/30 text-xs text-center px-1">
                {track.album}
              </span>
            </div>
          )}
        </div>

        {/* Track metadata */}
        <div className="flex-1 min-w-0">
          {/* Track title with marquee */}
          <div
            ref={titleRef}
            className={`overflow-hidden ${shouldMarquee ? 'marquee-container' : ''}`}
          >
            <h3
              className={`
                font-heading text-base md:text-lg text-primary
                whitespace-nowrap
                ${shouldMarquee ? 'marquee-text' : 'truncate'}
              `}
              data-testid="track-title"
            >
              {track.title}
            </h3>
          </div>

          {/* Artist */}
          <p className="text-foreground/80 text-sm truncate" data-testid="track-artist">
            {track.artist}
          </p>

          {/* Album */}
          <p className="text-foreground/60 text-xs truncate" data-testid="track-album">
            {track.album}
          </p>
        </div>
      </div>

      {/* Time display */}
      <div className="text-center text-xs text-foreground/60">
        <span data-testid="track-time">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
      </div>

      {/* Description (if available) */}
      {track.description && (
        <div className="mt-2">
          <p className="text-xs text-foreground/50 mb-1">About this track:</p>
          <div
            className="max-h-20 overflow-y-auto custom-scrollbar text-sm text-foreground/70 leading-relaxed"
            data-testid="track-description"
          >
            {track.description}
          </div>
        </div>
      )}

      {/* Marquee CSS styles */}
      <style jsx>{`
        .marquee-container {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }

        .marquee-text {
          display: inline-block;
          animation: marquee 10s linear infinite;
          padding-right: 50px;
        }

        .marquee-text::after {
          content: '${track.title.replace(/'/g, "\\'")}';
          padding-left: 50px;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}

export default TrackInfo
