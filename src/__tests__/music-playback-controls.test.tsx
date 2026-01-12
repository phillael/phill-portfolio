/**
 * Playback Controls Tests
 *
 * Tests for PlaybackControls, SeekBar, and VolumeControl components.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import PlaybackControls from '@/components/music/PlaybackControls'
import SeekBar from '@/components/music/SeekBar'
import VolumeControl from '@/components/music/VolumeControl'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
      <button onClick={onClick} {...props}>{children}</button>
    )
  }
}))

describe('PlaybackControls Component', () => {
  const mockOnToggle = jest.fn()
  const mockOnPrevious = jest.fn()
  const mockOnNext = jest.fn()

  const defaultProps = {
    isPlaying: false,
    onToggle: mockOnToggle,
    onPrevious: mockOnPrevious,
    onNext: mockOnNext
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all control buttons', () => {
      render(<PlaybackControls {...defaultProps} />)

      expect(screen.getByTestId('prev-button')).toBeInTheDocument()
      expect(screen.getByTestId('play-pause-button')).toBeInTheDocument()
      expect(screen.getByTestId('next-button')).toBeInTheDocument()
    })

    it('shows Play icon when not playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={false} />)

      const playButton = screen.getByTestId('play-pause-button')
      expect(playButton).toHaveAttribute('aria-label', 'Play')
    })

    it('shows Pause icon when playing', () => {
      render(<PlaybackControls {...defaultProps} isPlaying={true} />)

      const playButton = screen.getByTestId('play-pause-button')
      expect(playButton).toHaveAttribute('aria-label', 'Pause')
    })
  })

  describe('Interaction', () => {
    it('calls onToggle when play/pause is clicked', () => {
      render(<PlaybackControls {...defaultProps} />)

      fireEvent.click(screen.getByTestId('play-pause-button'))

      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })

    it('calls onPrevious when prev button is clicked', () => {
      render(<PlaybackControls {...defaultProps} />)

      fireEvent.click(screen.getByTestId('prev-button'))

      expect(mockOnPrevious).toHaveBeenCalledTimes(1)
    })

    it('calls onNext when next button is clicked', () => {
      render(<PlaybackControls {...defaultProps} />)

      fireEvent.click(screen.getByTestId('next-button'))

      expect(mockOnNext).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('has role="group" with aria-label', () => {
      render(<PlaybackControls {...defaultProps} />)

      const controls = screen.getByTestId('playback-controls')
      expect(controls).toHaveAttribute('role', 'group')
      expect(controls).toHaveAttribute('aria-label', 'Playback controls')
    })

    it('play button has aria-pressed attribute', () => {
      const { rerender } = render(<PlaybackControls {...defaultProps} isPlaying={false} />)

      expect(screen.getByTestId('play-pause-button')).toHaveAttribute('aria-pressed', 'false')

      rerender(<PlaybackControls {...defaultProps} isPlaying={true} />)

      expect(screen.getByTestId('play-pause-button')).toHaveAttribute('aria-pressed', 'true')
    })

    it('all buttons have minimum 44px touch target', () => {
      render(<PlaybackControls {...defaultProps} />)

      expect(screen.getByTestId('prev-button')).toHaveClass('min-w-[44px]')
      expect(screen.getByTestId('prev-button')).toHaveClass('min-h-[44px]')
      expect(screen.getByTestId('play-pause-button')).toHaveClass('min-w-[44px]')
      expect(screen.getByTestId('next-button')).toHaveClass('min-w-[44px]')
    })
  })
})

describe('SeekBar Component', () => {
  const mockOnSeek = jest.fn()

  const defaultProps = {
    currentTime: 60,
    duration: 180,
    onSeek: mockOnSeek
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders seek bar', () => {
      render(<SeekBar {...defaultProps} />)

      expect(screen.getByTestId('seek-bar')).toBeInTheDocument()
    })

    it('displays current time correctly', () => {
      render(<SeekBar {...defaultProps} currentTime={125} />)

      expect(screen.getByTestId('current-time')).toHaveTextContent('2:05')
    })

    it('displays duration correctly', () => {
      render(<SeekBar {...defaultProps} duration={245} />)

      expect(screen.getByTestId('duration')).toHaveTextContent('4:05')
    })
  })

  describe('Interaction', () => {
    it('calls onSeek when clicked', () => {
      render(<SeekBar {...defaultProps} />)

      const progressBar = screen.getByTestId('seek-bar-progress')

      // Mock getBoundingClientRect
      Object.defineProperty(progressBar, 'getBoundingClientRect', {
        value: () => ({
          left: 0,
          width: 200,
          top: 0,
          height: 8
        })
      })

      // Click at 50% position (100px from left)
      fireEvent.click(progressBar, { clientX: 100 })

      expect(mockOnSeek).toHaveBeenCalledWith(90) // 50% of 180 = 90
    })

    it('handles keyboard left arrow', () => {
      render(<SeekBar {...defaultProps} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      fireEvent.keyDown(progressBar, { key: 'ArrowLeft' })

      // Should seek backward by 5% (9 seconds)
      expect(mockOnSeek).toHaveBeenCalledWith(51) // 60 - 9 = 51
    })

    it('handles keyboard right arrow', () => {
      render(<SeekBar {...defaultProps} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      fireEvent.keyDown(progressBar, { key: 'ArrowRight' })

      // Should seek forward by 5% (9 seconds)
      expect(mockOnSeek).toHaveBeenCalledWith(69) // 60 + 9 = 69
    })
  })

  describe('Accessibility', () => {
    it('has role="slider"', () => {
      render(<SeekBar {...defaultProps} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      expect(progressBar).toHaveAttribute('role', 'slider')
    })

    it('has correct aria attributes', () => {
      render(<SeekBar {...defaultProps} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      expect(progressBar).toHaveAttribute('aria-label', 'Seek')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '180')
      expect(progressBar).toHaveAttribute('aria-valuenow', '60')
    })

    it('has tabIndex for keyboard access', () => {
      render(<SeekBar {...defaultProps} />)

      const progressBar = screen.getByTestId('seek-bar-progress')
      expect(progressBar).toHaveAttribute('tabIndex', '0')
    })
  })
})

describe('VolumeControl Component', () => {
  const mockOnVolumeChange = jest.fn()
  const mockOnToggleMute = jest.fn()

  const defaultProps = {
    volume: 0.7,
    isMuted: false,
    onVolumeChange: mockOnVolumeChange,
    onToggleMute: mockOnToggleMute
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders volume control', () => {
      render(<VolumeControl {...defaultProps} />)

      expect(screen.getByTestId('volume-control')).toBeInTheDocument()
      expect(screen.getByTestId('mute-button')).toBeInTheDocument()
      expect(screen.getByTestId('volume-slider')).toBeInTheDocument()
    })
  })

  describe('Mute Toggle', () => {
    it('calls onToggleMute when mute button is clicked', () => {
      render(<VolumeControl {...defaultProps} />)

      fireEvent.click(screen.getByTestId('mute-button'))

      expect(mockOnToggleMute).toHaveBeenCalledTimes(1)
    })

    it('shows Unmute label when muted', () => {
      render(<VolumeControl {...defaultProps} isMuted={true} />)

      expect(screen.getByTestId('mute-button')).toHaveAttribute('aria-label', 'Unmute')
    })

    it('shows Mute label when not muted', () => {
      render(<VolumeControl {...defaultProps} isMuted={false} />)

      expect(screen.getByTestId('mute-button')).toHaveAttribute('aria-label', 'Mute')
    })

    it('has aria-pressed attribute', () => {
      const { rerender } = render(<VolumeControl {...defaultProps} isMuted={false} />)

      expect(screen.getByTestId('mute-button')).toHaveAttribute('aria-pressed', 'false')

      rerender(<VolumeControl {...defaultProps} isMuted={true} />)

      expect(screen.getByTestId('mute-button')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Volume Slider', () => {
    it('calls onVolumeChange when slider is clicked', () => {
      render(<VolumeControl {...defaultProps} />)

      const slider = screen.getByTestId('volume-slider')

      // Mock getBoundingClientRect
      Object.defineProperty(slider, 'getBoundingClientRect', {
        value: () => ({
          left: 0,
          width: 100,
          top: 0,
          height: 8
        })
      })

      // Click at 50% position
      fireEvent.click(slider, { clientX: 50 })

      expect(mockOnVolumeChange).toHaveBeenCalledWith(0.5)
    })

    it('handles keyboard up/right for volume increase', () => {
      render(<VolumeControl {...defaultProps} />)

      const slider = screen.getByTestId('volume-slider')
      fireEvent.keyDown(slider, { key: 'ArrowRight' })

      expect(mockOnVolumeChange).toHaveBeenCalledWith(0.75) // 0.7 + 0.05
    })

    it('handles keyboard down/left for volume decrease', () => {
      render(<VolumeControl {...defaultProps} />)

      const slider = screen.getByTestId('volume-slider')
      fireEvent.keyDown(slider, { key: 'ArrowLeft' })

      // Use toBeCloseTo for floating point comparison
      expect(mockOnVolumeChange).toHaveBeenCalledTimes(1)
      const calledValue = mockOnVolumeChange.mock.calls[0][0]
      expect(calledValue).toBeCloseTo(0.65, 10) // 0.7 - 0.05
    })
  })

  describe('Accessibility', () => {
    it('slider has role="slider"', () => {
      render(<VolumeControl {...defaultProps} />)

      const slider = screen.getByTestId('volume-slider')
      expect(slider).toHaveAttribute('role', 'slider')
    })

    it('slider has correct aria attributes', () => {
      render(<VolumeControl {...defaultProps} />)

      const slider = screen.getByTestId('volume-slider')
      expect(slider).toHaveAttribute('aria-label', 'Volume')
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '100')
      expect(slider).toHaveAttribute('aria-valuenow', '70')
    })

    it('mute button has minimum 44px touch target', () => {
      render(<VolumeControl {...defaultProps} />)

      expect(screen.getByTestId('mute-button')).toHaveClass('min-w-[44px]')
      expect(screen.getByTestId('mute-button')).toHaveClass('min-h-[44px]')
    })
  })
})
