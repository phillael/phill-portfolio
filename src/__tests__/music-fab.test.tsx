/**
 * Music FAB Tests
 *
 * Tests for the floating action button component behavior.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import MusicFAB from '@/components/music/MusicFAB'
import type { FrequencyData } from '@/lib/audio-utils'

// Mock AudioVisualizer to avoid Three.js setup
jest.mock('@/components/music/AudioVisualizer', () => {
  return function MockAudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
    return isPlaying ? <div data-testid="audio-visualizer">Visualizer</div> : null
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button onClick={onClick} {...props}>{children}</button>
    )
  }
}))

const defaultFrequencyData: FrequencyData = {
  bass: 0.5,
  treble: 0.3,
  intensity: 0.4
}

const defaultProps = {
  isPlaying: false,
  isExpanded: false,
  frequencyData: defaultFrequencyData,
  onToggleExpand: jest.fn()
}

describe('Music FAB Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders FAB in bottom-right corner with correct positioning classes', () => {
      render(<MusicFAB {...defaultProps} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toBeInTheDocument()
      expect(fab).toHaveClass('fixed')
      expect(fab).toHaveClass('bottom-4')
      expect(fab).toHaveClass('right-4')
    })

    it('has minimum 44x44px touch target', () => {
      render(<MusicFAB {...defaultProps} />)

      const fab = screen.getByTestId('music-fab')
      // Check for 52px width/height classes (min-w-[52px] min-h-[52px])
      expect(fab).toHaveClass('w-[52px]')
      expect(fab).toHaveClass('h-[52px]')
    })

    it('shows music icon when not playing', () => {
      render(<MusicFAB {...defaultProps} isPlaying={false} />)

      // The Music icon from lucide-react should be rendered
      const svg = screen.getByTestId('music-fab').querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(screen.queryByTestId('audio-visualizer')).not.toBeInTheDocument()
    })

    it('shows visualizer when playing', () => {
      render(<MusicFAB {...defaultProps} isPlaying={true} />)

      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('calls onToggleExpand when clicked', () => {
      const onToggleExpand = jest.fn()
      render(<MusicFAB {...defaultProps} onToggleExpand={onToggleExpand} />)

      const fab = screen.getByTestId('music-fab')
      fireEvent.click(fab)

      expect(onToggleExpand).toHaveBeenCalledTimes(1)
    })

    it('toggles expanded state via click', () => {
      const onToggleExpand = jest.fn()
      const { rerender } = render(
        <MusicFAB {...defaultProps} isExpanded={false} onToggleExpand={onToggleExpand} />
      )

      const fab = screen.getByTestId('music-fab')
      fireEvent.click(fab)

      expect(onToggleExpand).toHaveBeenCalled()

      // Simulate parent updating state
      rerender(
        <MusicFAB {...defaultProps} isExpanded={true} onToggleExpand={onToggleExpand} />
      )

      expect(fab.getAttribute('aria-expanded')).toBe('true')
    })
  })

  describe('Accessibility', () => {
    it('has role="button"', () => {
      render(<MusicFAB {...defaultProps} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toHaveAttribute('role', 'button')
    })

    it('has appropriate aria-label when idle', () => {
      render(<MusicFAB {...defaultProps} isPlaying={false} isExpanded={false} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toHaveAttribute('aria-label', 'Open music player')
    })

    it('has appropriate aria-label when playing', () => {
      render(<MusicFAB {...defaultProps} isPlaying={true} isExpanded={false} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toHaveAttribute('aria-label', 'Open music player (currently playing)')
    })

    it('has appropriate aria-label when expanded', () => {
      render(<MusicFAB {...defaultProps} isExpanded={true} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toHaveAttribute('aria-label', 'Close music player')
    })

    it('has aria-expanded attribute', () => {
      render(<MusicFAB {...defaultProps} isExpanded={false} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toHaveAttribute('aria-expanded', 'false')
    })

    it('has aria-haspopup="dialog"', () => {
      render(<MusicFAB {...defaultProps} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toHaveAttribute('aria-haspopup', 'dialog')
    })

    it('has focus-visible styling classes', () => {
      render(<MusicFAB {...defaultProps} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).toHaveClass('focus-visible:ring-2')
      expect(fab).toHaveClass('focus-visible:ring-primary')
    })
  })

  describe('Visual States', () => {
    it('applies different styling when playing', () => {
      const { rerender } = render(<MusicFAB {...defaultProps} isPlaying={false} />)

      const fab = screen.getByTestId('music-fab')
      expect(fab).not.toHaveClass('fab-playing')

      rerender(<MusicFAB {...defaultProps} isPlaying={true} />)

      expect(fab).toHaveClass('fab-playing')
    })
  })
})
