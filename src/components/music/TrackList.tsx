'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Play } from 'lucide-react'
import type { Track } from '@/types/content'
import { formatDuration } from '@/lib/audio-utils'

interface TrackListProps {
  tracks: Track[]
  currentTrack: Track | null
  isPlaying: boolean
  onSelectTrack: (track: Track) => void
}

/**
 * Track list component showing all available tracks.
 *
 * Features:
 * - Scrollable list of all tracks
 * - Each item shows: thumbnail, track name, duration
 * - Visual indicator for currently playing track
 * - Click to select and play a track
 * - Keyboard accessible
 *
 * @param tracks - Array of all available tracks
 * @param currentTrack - Currently selected/playing track
 * @param isPlaying - Whether audio is currently playing
 * @param onSelectTrack - Callback when a track is selected
 */
const TrackList = ({
  tracks,
  currentTrack,
  isPlaying,
  onSelectTrack
}: TrackListProps) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, track: Track) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelectTrack(track)
      }
    },
    [onSelectTrack]
  )

  if (tracks.length === 0) {
    return (
      <div className="text-center text-foreground/50 py-4" data-testid="track-list">
        No tracks available
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-y-auto custom-scrollbar space-y-1"
      role="listbox"
      aria-label="Track list"
      data-testid="track-list"
      style={{ touchAction: 'pan-y' }}
    >
      {tracks.map((track, index) => {
        const isCurrent = currentTrack?.id === track.id
        const isCurrentlyPlaying = isCurrent && isPlaying

        return (
          <motion.button
            key={track.id}
            className={`
              w-full flex items-center gap-3 p-2
              rounded-md
              text-left
              transition-colors duration-150
              focus:outline-none
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset
              ${isCurrent
                ? 'bg-primary/20 border border-primary/30'
                : 'hover:bg-muted/50 border border-transparent'
              }
            `}
            onClick={() => onSelectTrack(track)}
            onKeyDown={(e) => handleKeyDown(e, track)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            role="option"
            aria-selected={isCurrent}
            aria-label={`${track.title} by ${track.artist}, ${formatDuration(track.duration)}`}
            data-testid={`track-item-${index}`}
          >
            {/* Thumbnail or playing indicator */}
            <div className="w-10 h-10 rounded flex-shrink-0 relative overflow-hidden">
              {isCurrentlyPlaying ? (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <div className="flex gap-0.5 items-end h-4">
                    <span className="w-1 bg-primary rounded-full animate-[equalizer_0.5s_ease-in-out_infinite]" style={{ height: '60%' }} />
                    <span className="w-1 bg-primary rounded-full animate-[equalizer_0.5s_ease-in-out_infinite_0.1s]" style={{ height: '100%' }} />
                    <span className="w-1 bg-primary rounded-full animate-[equalizer_0.5s_ease-in-out_infinite_0.2s]" style={{ height: '40%' }} />
                  </div>
                </div>
              ) : track.artworkUrl ? (
                <Image
                  src={track.artworkUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <div className="w-full h-full project-placeholder-gradient flex items-center justify-center">
                  <Play className="w-4 h-4 text-foreground/30" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}
                data-testid={`track-name-${index}`}
              >
                {track.title}
              </p>
              <p className="text-xs text-foreground/60 truncate">
                {track.artist}
              </p>
            </div>

            {/* Duration */}
            <span className="text-xs text-foreground/50 flex-shrink-0">
              {formatDuration(track.duration)}
            </span>
          </motion.button>
        )
      })}

      {/* Equalizer animation keyframes */}
      <style jsx>{`
        @keyframes equalizer {
          0%, 100% {
            height: 40%;
          }
          50% {
            height: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default TrackList
