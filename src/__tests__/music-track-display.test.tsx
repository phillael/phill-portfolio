/**
 * Track Display Tests
 *
 * Tests for TrackInfo and TrackList components.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import TrackInfo from '@/components/music/TrackInfo'
import TrackList from '@/components/music/TrackList'
import type { Track } from '@/types/content'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
      <button onClick={onClick} {...props}>{children}</button>
    )
  }
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, onError, ...props }: { alt: string; onError?: () => void }) => (
    <img alt={alt} {...props} onError={onError} />
  )
}))

const mockTrack: Track = {
  id: 'track-1',
  title: 'Test Track Title',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 245,
  audioUrl: '/audio/test.mp3',
  artworkUrl: '/images/music/test.jpg',
  description: 'This is a test track description with some story about how it was made.'
}

const mockTrackLongTitle: Track = {
  ...mockTrack,
  id: 'track-long',
  title: 'This Is A Very Long Track Title That Should Trigger Marquee Scroll Animation'
}

const mockTrackNoArtwork: Track = {
  ...mockTrack,
  id: 'track-no-artwork',
  artworkUrl: undefined
}

const mockTracks: Track[] = [
  mockTrack,
  {
    id: 'track-2',
    title: 'Second Track',
    artist: 'Another Artist',
    album: 'Another Album',
    duration: 180,
    audioUrl: '/audio/test2.mp3'
  },
  {
    id: 'track-3',
    title: 'Third Track',
    artist: 'Third Artist',
    album: 'Third Album',
    duration: 300,
    audioUrl: '/audio/test3.mp3'
  }
]

describe('TrackInfo Component', () => {
  describe('Rendering', () => {
    it('displays current track metadata correctly', () => {
      render(<TrackInfo track={mockTrack} currentTime={60} duration={245} />)

      expect(screen.getByTestId('track-title')).toHaveTextContent('Test Track Title')
      expect(screen.getByTestId('track-artist')).toHaveTextContent('Test Artist')
      expect(screen.getByTestId('track-album')).toHaveTextContent('Test Album')
    })

    it('shows fallback when no track is selected', () => {
      render(<TrackInfo track={null} currentTime={0} duration={0} />)

      expect(screen.getByText('No track selected')).toBeInTheDocument()
    })

    it('displays time correctly', () => {
      render(<TrackInfo track={mockTrack} currentTime={125} duration={245} />)

      expect(screen.getByTestId('track-time')).toHaveTextContent('2:05 / 4:05')
    })

    it('shows description when available', () => {
      render(<TrackInfo track={mockTrack} currentTime={0} duration={245} />)

      expect(screen.getByTestId('track-description')).toHaveTextContent(
        'This is a test track description'
      )
    })
  })

  describe('Album Artwork', () => {
    it('renders album artwork image when artworkUrl is provided', () => {
      render(<TrackInfo track={mockTrack} currentTime={0} duration={245} />)

      const image = screen.getByAltText('Test Album album artwork')
      expect(image).toBeInTheDocument()
    })

    it('shows fallback gradient when no artworkUrl', () => {
      render(<TrackInfo track={mockTrackNoArtwork} currentTime={0} duration={245} />)

      expect(screen.getByTestId('artwork-fallback')).toBeInTheDocument()
    })

    it('shows fallback when image fails to load', () => {
      render(<TrackInfo track={mockTrack} currentTime={0} duration={245} />)

      const image = screen.getByAltText('Test Album album artwork')
      fireEvent.error(image)

      expect(screen.getByTestId('artwork-fallback')).toBeInTheDocument()
    })
  })

  describe('Marquee Scroll', () => {
    it('handles long track names', () => {
      render(<TrackInfo track={mockTrackLongTitle} currentTime={0} duration={245} />)

      expect(screen.getByTestId('track-title')).toHaveTextContent(mockTrackLongTitle.title)
    })
  })
})

describe('TrackList Component', () => {
  const mockOnSelectTrack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all tracks in the list', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      expect(screen.getByTestId('track-list')).toBeInTheDocument()
      expect(screen.getByTestId('track-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('track-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('track-item-2')).toBeInTheDocument()
    })

    it('shows empty state when no tracks', () => {
      render(
        <TrackList
          tracks={[]}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      expect(screen.getByText('No tracks available')).toBeInTheDocument()
    })

    it('displays track name and duration for each item', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      expect(screen.getByTestId('track-name-0')).toHaveTextContent('Test Track Title')
      // Duration should be displayed (4:05 for 245 seconds)
      expect(screen.getByTestId('track-item-0')).toHaveTextContent('4:05')
    })

    it('highlights currently playing track', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={mockTrack}
          isPlaying={true}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      const currentItem = screen.getByTestId('track-item-0')
      expect(currentItem).toHaveAttribute('aria-selected', 'true')
      expect(currentItem).toHaveClass('bg-primary/20')
    })
  })

  describe('Interaction', () => {
    it('calls onSelectTrack when track is clicked', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      fireEvent.click(screen.getByTestId('track-item-1'))

      expect(mockOnSelectTrack).toHaveBeenCalledWith(mockTracks[1])
    })

    it('handles keyboard Enter key', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      const trackItem = screen.getByTestId('track-item-0')
      fireEvent.keyDown(trackItem, { key: 'Enter' })

      expect(mockOnSelectTrack).toHaveBeenCalledWith(mockTracks[0])
    })

    it('handles keyboard Space key', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      const trackItem = screen.getByTestId('track-item-2')
      fireEvent.keyDown(trackItem, { key: ' ' })

      expect(mockOnSelectTrack).toHaveBeenCalledWith(mockTracks[2])
    })
  })

  describe('Accessibility', () => {
    it('has role="listbox"', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      expect(screen.getByTestId('track-list')).toHaveAttribute('role', 'listbox')
    })

    it('track items have role="option"', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      expect(screen.getByTestId('track-item-0')).toHaveAttribute('role', 'option')
    })

    it('track items have descriptive aria-label', () => {
      render(
        <TrackList
          tracks={mockTracks}
          currentTrack={null}
          isPlaying={false}
          onSelectTrack={mockOnSelectTrack}
        />
      )

      expect(screen.getByTestId('track-item-0')).toHaveAttribute(
        'aria-label',
        'Test Track Title by Test Artist, 4:05'
      )
    })
  })
})
