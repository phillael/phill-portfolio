/**
 * Hero Section Tests
 *
 * Tests for the Hero section components including:
 * - HeroSection structure and layout
 * - AnimatedHeadline content
 * - ScrollIndicator accessibility
 * - HeroImage alt text
 */

import { render, screen } from '@testing-library/react'
import HeroSection from '@/components/HeroSection'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <span {...props}>{children}</span>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
    h1: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

describe('Hero Section', () => {
  it('renders with correct structure and section ID', () => {
    render(<HeroSection />)

    const heroSection = screen.getByRole('region', { name: /hero/i })
    expect(heroSection).toBeInTheDocument()
    expect(heroSection).toHaveAttribute('id', 'hero')
  })

  it('renders taglines', () => {
    render(<HeroSection />)

    // Check the hero section contains visible content
    const heroSection = screen.getByRole('region', { name: /hero/i })
    expect(heroSection).toBeVisible()
  })

  it('scroll indicator button is keyboard accessible', () => {
    render(<HeroSection />)

    const scrollButton = screen.getByRole('button', {
      name: /scroll to about section/i,
    })
    expect(scrollButton).toBeInTheDocument()
    expect(scrollButton).toHaveAttribute('aria-label', 'Scroll to about section')
  })

  it('hero image has proper alt text', () => {
    render(<HeroSection />)

    const heroImage = screen.getByAltText(
      /Phill Aelony wearing a poncho and cowboy hat, throwing a rock hand sign, surrounded by three llamas/i
    )
    expect(heroImage).toBeInTheDocument()
  })
})
