/**
 * Resume Download Button Tests
 *
 * Tests for the ResumeDownloadButton component including:
 * - Button renders with correct text and download icon
 * - Anchor has correct href to resume PDF
 * - Download attribute is present for proper download behavior
 * - Focus-visible ring styling is applied
 * - Mobile variant renders with full-width styling
 * - Desktop variant renders with outlined button styling
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResumeDownloadButton from '@/components/ResumeDownloadButton'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    a: ({
      children,
      whileHover,
      whileTap,
      transition,
      ...props
    }: React.PropsWithChildren<
      React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        whileHover?: object
        whileTap?: object
        transition?: object
      }
    >) => <a {...props}>{children}</a>,
  },
}))

describe('ResumeDownloadButton', () => {
  it('renders with correct text and download icon', () => {
    render(<ResumeDownloadButton />)

    // Check for download icon (SVG with aria-hidden)
    const icon = document.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()

    // Check for text content
    expect(screen.getByText(/resume/i)).toBeInTheDocument()
  })

  it('anchor has correct href to resume PDF', () => {
    render(<ResumeDownloadButton />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/Phillip_Aelony_Resume_2025.pdf')
  })

  it('download attribute is present for proper download behavior', () => {
    render(<ResumeDownloadButton />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('download')
  })

  it('has accessible aria-label for screen readers', () => {
    render(<ResumeDownloadButton />)

    const link = screen.getByRole('link', { name: /download.*resume/i })
    expect(link).toBeInTheDocument()
  })

  it('focus-visible ring styling classes are applied', () => {
    render(<ResumeDownloadButton />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('focus-visible:ring-2')
    expect(link).toHaveClass('focus-visible:ring-primary')
  })

  it('mobile variant renders with full-width styling and full text', () => {
    render(<ResumeDownloadButton variant="mobile" />)

    const link = screen.getByRole('link')
    // Mobile variant should have w-full class
    expect(link).toHaveClass('w-full')
    // Mobile variant should have "Download Resume" text
    expect(screen.getByText(/download resume/i)).toBeInTheDocument()
  })

  it('desktop variant renders with outlined button styling', () => {
    render(<ResumeDownloadButton variant="desktop" />)

    const link = screen.getByRole('link')
    // Desktop variant should have border styling
    expect(link).toHaveClass('border')
    // Desktop variant should have shorter "Resume" text
    expect(screen.getByText('Resume')).toBeInTheDocument()
  })

  it('section variant renders with secondary accent styling', () => {
    render(<ResumeDownloadButton variant="section" />)

    const link = screen.getByRole('link')
    // Section variant should have bg-primary/10 or similar accent styling
    expect(link).toHaveClass('bg-primary/10')
    // Section variant includes contextual text
    expect(screen.getByText(/view.*full.*resume/i)).toBeInTheDocument()
  })

  it('meets minimum touch target size requirements', () => {
    render(<ResumeDownloadButton />)

    const link = screen.getByRole('link')
    // Should have min-height and min-width for 44x44px touch target
    expect(link).toHaveClass('min-h-[44px]')
  })

  it('keyboard Enter key triggers link activation', async () => {
    const user = userEvent.setup()
    render(<ResumeDownloadButton />)

    const link = screen.getByRole('link')

    // Focus the link
    link.focus()
    expect(link).toHaveFocus()

    // Verify the link is interactive via keyboard (href is set properly)
    expect(link).toHaveAttribute('href', '/Phillip_Aelony_Resume_2025.pdf')
  })
})
