/**
 * Music Player Integration Tests
 *
 * Tests for the integrated MusicPlayer component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MusicPlayer from '@/components/music/MusicPlayer'

// Mock useAudioPlayer hook
const mockToggle = jest.fn()
const mockPlay = jest.fn()
const mockPrevTrack = jest.fn()
const mockNextTrack = jest.fn()
const mockSeek = jest.fn()
const mockSetTrack = jest.fn()
const mockSetVolume = jest.fn()
const mockToggleMute = jest.fn()

const mockAudioState = {
  isPlaying: false,
  currentTrack: {
    id: 'track-1',
    title: 'Test Track',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 180,
    audioUrl: '/audio/test.mp3'
  },
  currentTime: 0,
  duration: 180,
  volume: 0.7,
  isMuted: false,
  frequencyData: { bass: 0, treble: 0, intensity: 0 },
  play: mockPlay,
  pause: jest.fn(),
  toggle: mockToggle,
  setTrack: mockSetTrack,
  nextTrack: mockNextTrack,
  prevTrack: mockPrevTrack,
  seek: mockSeek,
  setVolume: mockSetVolume,
  toggleMute: mockToggleMute,
  getFrequencyData: jest.fn()
}

jest.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => mockAudioState
}))

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: {
      button: React.forwardRef(
        (
          { children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>,
          ref: React.Ref<HTMLButtonElement>
        ) => (
          <button ref={ref} onClick={onClick} {...props}>
            {children}
          </button>
        )
      ),
      div: React.forwardRef(
        (
          { children, onClick, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
          ref: React.Ref<HTMLDivElement>
        ) => (
          <div ref={ref} onClick={onClick} {...props}>
            {children}
          </div>
        )
      )
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
})

// Mock AudioVisualizer
jest.mock('@/components/music/AudioVisualizer', () => {
  return function MockAudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
    return isPlaying ? <div data-testid="audio-visualizer">Visualizer</div> : null
  }
})

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />
}))

describe('MusicPlayer Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Mounting', () => {
    it('mounts without errors', () => {
      render(<MusicPlayer />)

      expect(screen.getByTestId('music-fab')).toBeInTheDocument()
    })

    it('renders FAB in collapsed state initially', () => {
      render(<MusicPlayer />)

      expect(screen.getByTestId('music-fab')).toBeInTheDocument()
      // Panel should not be visible initially (not expanded)
      expect(screen.queryByTestId('music-player-panel')).not.toBeInTheDocument()
    })
  })

  describe('FAB Expansion', () => {
    it('clicking FAB expands panel with all child components', async () => {
      render(<MusicPlayer />)

      // Click FAB to expand
      fireEvent.click(screen.getByTestId('music-fab'))

      // Panel should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('music-player-panel')).toBeInTheDocument()
      })

      // Child components should be rendered
      expect(screen.getByTestId('track-info')).toBeInTheDocument()
      expect(screen.getByTestId('seek-bar')).toBeInTheDocument()
      expect(screen.getByTestId('playback-controls')).toBeInTheDocument()
      expect(screen.getByTestId('volume-control')).toBeInTheDocument()
      expect(screen.getByTestId('track-list')).toBeInTheDocument()
    })

    it('clicking FAB again or close button closes panel', async () => {
      render(<MusicPlayer />)

      // Open panel
      fireEvent.click(screen.getByTestId('music-fab'))

      await waitFor(() => {
        expect(screen.getByTestId('music-player-panel')).toBeInTheDocument()
      })

      // Close via close button
      fireEvent.click(screen.getByTestId('panel-close-button'))

      // Panel should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('music-player-panel')).not.toBeInTheDocument()
      })
    })
  })

  describe('Playback Integration', () => {
    it('play/pause button triggers toggle', async () => {
      render(<MusicPlayer />)

      // Open panel
      fireEvent.click(screen.getByTestId('music-fab'))

      await waitFor(() => {
        expect(screen.getByTestId('playback-controls')).toBeInTheDocument()
      })

      // Click play button
      fireEvent.click(screen.getByTestId('play-pause-button'))

      expect(mockToggle).toHaveBeenCalledTimes(1)
    })

    it('track list selection triggers setTrack and play', async () => {
      render(<MusicPlayer />)

      // Open panel
      fireEvent.click(screen.getByTestId('music-fab'))

      await waitFor(() => {
        expect(screen.getByTestId('track-list')).toBeInTheDocument()
      })

      // Click on a track
      const trackItem = screen.getByTestId('track-item-0')
      fireEvent.click(trackItem)

      expect(mockSetTrack).toHaveBeenCalled()
      expect(mockPlay).toHaveBeenCalled()
    })
  })

  describe('Volume Control Integration', () => {
    it('mute button triggers toggleMute', async () => {
      render(<MusicPlayer />)

      // Open panel
      fireEvent.click(screen.getByTestId('music-fab'))

      await waitFor(() => {
        expect(screen.getByTestId('volume-control')).toBeInTheDocument()
      })

      // Click mute button
      fireEvent.click(screen.getByTestId('mute-button'))

      expect(mockToggleMute).toHaveBeenCalledTimes(1)
    })
  })

  describe('Navigation Integration', () => {
    it('next/prev buttons trigger track navigation', async () => {
      render(<MusicPlayer />)

      // Open panel
      fireEvent.click(screen.getByTestId('music-fab'))

      await waitFor(() => {
        expect(screen.getByTestId('playback-controls')).toBeInTheDocument()
      })

      // Click next
      fireEvent.click(screen.getByTestId('next-button'))
      expect(mockNextTrack).toHaveBeenCalledTimes(1)

      // Click prev
      fireEvent.click(screen.getByTestId('prev-button'))
      expect(mockPrevTrack).toHaveBeenCalledTimes(1)
    })
  })

  describe('Current Track Display', () => {
    it('displays current track info in panel', async () => {
      render(<MusicPlayer />)

      // Open panel
      fireEvent.click(screen.getByTestId('music-fab'))

      await waitFor(() => {
        expect(screen.getByTestId('track-info')).toBeInTheDocument()
      })

      // Track info should display current track
      expect(screen.getByTestId('track-title')).toHaveTextContent('Test Track')
      expect(screen.getByTestId('track-artist')).toHaveTextContent('Test Artist')
    })
  })
})
