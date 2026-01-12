/**
 * Music Player Panel Tests
 *
 * Tests for the expanded player panel component behavior.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MusicPlayerPanel from '@/components/music/MusicPlayerPanel'

// Mock framer-motion to avoid animation timing issues in tests
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: {
      div: React.forwardRef(
        (
          { children, onClick, initial, animate, exit, variants, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
          ref: React.Ref<HTMLDivElement>
        ) => (
          <div ref={ref} onClick={onClick} {...props}>
            {children}
          </div>
        )
      ),
      button: React.forwardRef(
        (
          { children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>,
          ref: React.Ref<HTMLButtonElement>
        ) => (
          <button ref={ref} onClick={onClick} {...props}>
            {children}
          </button>
        )
      )
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Variants: {}
  }
})

describe('Music Player Panel Component', () => {
  const mockOnClose = jest.fn()
  const defaultProps = {
    isExpanded: true,
    onClose: mockOnClose,
    children: <div data-testid="panel-content">Test Content</div>
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders panel when isExpanded is true', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      expect(screen.getByTestId('music-player-panel')).toBeInTheDocument()
      expect(screen.getByTestId('panel-content')).toBeInTheDocument()
    })

    it('does not render when isExpanded is false', () => {
      render(<MusicPlayerPanel {...defaultProps} isExpanded={false} />)

      expect(screen.queryByTestId('music-player-panel')).not.toBeInTheDocument()
    })

    it('renders close button (X)', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      expect(screen.getByTestId('panel-close-button')).toBeInTheDocument()
      expect(screen.getByLabelText('Close music player')).toBeInTheDocument()
    })

    it('renders backdrop on mobile', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      expect(screen.getByTestId('panel-backdrop')).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(
        <MusicPlayerPanel {...defaultProps}>
          <span data-testid="custom-child">Custom Content</span>
        </MusicPlayerPanel>
      )

      expect(screen.getByTestId('custom-child')).toBeInTheDocument()
    })
  })

  describe('Close Functionality', () => {
    it('calls onClose when X button is clicked', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      fireEvent.click(screen.getByTestId('panel-close-button'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when backdrop is clicked', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      fireEvent.click(screen.getByTestId('panel-backdrop'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape key is pressed', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Panel Dimensions', () => {
    it('has 320px width class for desktop', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveClass('md:w-[320px]')
    })

    it('has full-width on mobile', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      // Mobile: full width with inset-x-0
      expect(panel).toHaveClass('w-full')
      expect(panel).toHaveClass('inset-x-0')
    })
  })

  describe('Accessibility', () => {
    it('has role="dialog"', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveAttribute('role', 'dialog')
    })

    it('has aria-modal="true"', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-label for the dialog', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveAttribute('aria-label', 'Music player')
    })

    it('close button has minimum 44x44px touch target', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const closeButton = screen.getByTestId('panel-close-button')
      expect(closeButton).toHaveClass('min-w-[44px]')
      expect(closeButton).toHaveClass('min-h-[44px]')
    })

    it('close button has focus-visible styling', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const closeButton = screen.getByTestId('panel-close-button')
      expect(closeButton).toHaveClass('focus-visible:ring-2')
    })

    it('backdrop has aria-hidden="true"', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const backdrop = screen.getByTestId('panel-backdrop')
      expect(backdrop).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Styling', () => {
    it('has gradient-card class on desktop', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveClass('md:gradient-card')
    })

    it('has solid background on mobile for better readability', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveClass('bg-background')
    })

    it('has max-height and scroll for mobile', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveClass('max-h-[85vh]')
      expect(panel).toHaveClass('overflow-y-auto')
    })

    it('has fixed positioning', () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      const panel = screen.getByTestId('music-player-panel')
      expect(panel).toHaveClass('fixed')
    })
  })

  describe('Focus Management', () => {
    it('focuses close button when panel opens', async () => {
      render(<MusicPlayerPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('panel-close-button')).toHaveFocus()
      }, { timeout: 200 })
    })
  })
})
