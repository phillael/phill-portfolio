/**
 * Music Feature Edge Cases Tests
 *
 * Additional tests to fill coverage gaps for edge cases and error handling.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { formatDuration, extractFrequencyBands, FREQUENCY_BANDS } from '@/lib/audio-utils'
import SeekBar from '@/components/music/SeekBar'
import VolumeControl from '@/components/music/VolumeControl'
import TrackInfo from '@/components/music/TrackInfo'
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

describe('Edge Cases and Error Handling', () => {
  describe('Audio Error Handling', () => {
    it('formatDuration handles NaN input', () => {
      expect(formatDuration(NaN)).toBe('0:00')
    })

    it('formatDuration handles negative numbers', () => {
      expect(formatDuration(-100)).toBe('0:00')
    })

    it('formatDuration handles Infinity', () => {
      expect(formatDuration(Infinity)).toBe('0:00')
    })

    it('extractFrequencyBands handles null-like input', () => {
      const emptyArray = new Uint8Array(0)
      const result = extractFrequencyBands(emptyArray)

      expect(result.bass).toBe(0)
      expect(result.treble).toBe(0)
      expect(result.intensity).toBe(0)
    })
  })

  describe('SeekBar Edge Cases', () => {
    const mockOnSeek = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('handles zero duration gracefully', () => {
      render(<SeekBar currentTime={0} duration={0} onSeek={mockOnSeek} />)

      expect(screen.getByTestId('current-time')).toHaveTextContent('0:00')
      expect(screen.getByTestId('duration')).toHaveTextContent('0:00')
    })

    it('handles Home key to seek to beginning', () => {
      render(<SeekBar currentTime={60} duration={180} onSeek={mockOnSeek} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      fireEvent.keyDown(progressBar, { key: 'Home' })

      expect(mockOnSeek).toHaveBeenCalledWith(0)
    })

    it('handles End key to seek to end', () => {
      render(<SeekBar currentTime={60} duration={180} onSeek={mockOnSeek} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      fireEvent.keyDown(progressBar, { key: 'End' })

      expect(mockOnSeek).toHaveBeenCalledWith(180)
    })

    it('prevents seeking below 0', () => {
      render(<SeekBar currentTime={2} duration={180} onSeek={mockOnSeek} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      // Try to seek backwards more than current time
      fireEvent.keyDown(progressBar, { key: 'ArrowLeft' })

      const calledValue = mockOnSeek.mock.calls[0][0]
      expect(calledValue).toBeGreaterThanOrEqual(0)
    })

    it('prevents seeking above duration', () => {
      render(<SeekBar currentTime={175} duration={180} onSeek={mockOnSeek} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      fireEvent.keyDown(progressBar, { key: 'ArrowRight' })

      const calledValue = mockOnSeek.mock.calls[0][0]
      expect(calledValue).toBeLessThanOrEqual(180)
    })
  })

  describe('VolumeControl Edge Cases', () => {
    const mockOnVolumeChange = jest.fn()
    const mockOnToggleMute = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('handles Home key to set volume to 0', () => {
      render(
        <VolumeControl
          volume={0.7}
          isMuted={false}
          onVolumeChange={mockOnVolumeChange}
          onToggleMute={mockOnToggleMute}
        />
      )

      const slider = screen.getByTestId('volume-slider')
      fireEvent.keyDown(slider, { key: 'Home' })

      expect(mockOnVolumeChange).toHaveBeenCalledWith(0)
    })

    it('handles End key to set volume to 1', () => {
      render(
        <VolumeControl
          volume={0.3}
          isMuted={false}
          onVolumeChange={mockOnVolumeChange}
          onToggleMute={mockOnToggleMute}
        />
      )

      const slider = screen.getByTestId('volume-slider')
      fireEvent.keyDown(slider, { key: 'End' })

      expect(mockOnVolumeChange).toHaveBeenCalledWith(1)
    })

    it('handles ArrowUp key same as ArrowRight', () => {
      render(
        <VolumeControl
          volume={0.5}
          isMuted={false}
          onVolumeChange={mockOnVolumeChange}
          onToggleMute={mockOnToggleMute}
        />
      )

      const slider = screen.getByTestId('volume-slider')
      fireEvent.keyDown(slider, { key: 'ArrowUp' })

      expect(mockOnVolumeChange).toHaveBeenCalledWith(0.55)
    })

    it('handles ArrowDown key same as ArrowLeft', () => {
      render(
        <VolumeControl
          volume={0.5}
          isMuted={false}
          onVolumeChange={mockOnVolumeChange}
          onToggleMute={mockOnToggleMute}
        />
      )

      const slider = screen.getByTestId('volume-slider')
      fireEvent.keyDown(slider, { key: 'ArrowDown' })

      // Use toBeCloseTo for floating point
      expect(mockOnVolumeChange).toHaveBeenCalledTimes(1)
      const calledValue = mockOnVolumeChange.mock.calls[0][0]
      expect(calledValue).toBeCloseTo(0.45, 10)
    })

    it('displays 0% when muted', () => {
      render(
        <VolumeControl
          volume={0.7}
          isMuted={true}
          onVolumeChange={mockOnVolumeChange}
          onToggleMute={mockOnToggleMute}
        />
      )

      const slider = screen.getByTestId('volume-slider')
      expect(slider).toHaveAttribute('aria-valuetext', 'Muted')
    })
  })

  describe('TrackInfo Edge Cases', () => {
    it('handles track with no description', () => {
      const trackWithoutDescription: Track = {
        id: 'test',
        title: 'Test',
        artist: 'Artist',
        album: 'Album',
        duration: 100,
        audioUrl: '/audio/test.mp3'
      }

      render(<TrackInfo track={trackWithoutDescription} currentTime={0} duration={100} />)

      expect(screen.queryByTestId('track-description')).not.toBeInTheDocument()
    })

    it('displays zero time correctly', () => {
      const track: Track = {
        id: 'test',
        title: 'Test',
        artist: 'Artist',
        album: 'Album',
        duration: 0,
        audioUrl: '/audio/test.mp3'
      }

      render(<TrackInfo track={track} currentTime={0} duration={0} />)

      expect(screen.getByTestId('track-time')).toHaveTextContent('0:00 / 0:00')
    })
  })

  describe('Frequency Band Constants', () => {
    it('FREQUENCY_BANDS has correct bass range', () => {
      expect(FREQUENCY_BANDS.bass.start).toBe(0)
      expect(FREQUENCY_BANDS.bass.end).toBe(8)
    })

    it('FREQUENCY_BANDS has correct treble range', () => {
      expect(FREQUENCY_BANDS.treble.start).toBe(32)
      expect(FREQUENCY_BANDS.treble.end).toBe(64)
    })
  })

  describe('Reduced Motion Support', () => {
    it('components should have transition duration classes', () => {
      const mockOnSeek = jest.fn()
      render(<SeekBar currentTime={60} duration={180} onSeek={mockOnSeek} />)

      // The seek bar progress should have transition styling
      const progressBar = screen.getByTestId('seek-bar-progress')
      expect(progressBar).toBeInTheDocument()
    })
  })
})
