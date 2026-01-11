/**
 * About Section Tests
 *
 * Tests for the About section components including:
 * - AboutSection has correct ID for navigation
 * - Bio content paragraphs are present
 * - Section uses semantic HTML
 * - Animated elements have proper structure
 */

import { render, screen } from '@testing-library/react'
import AboutSection from '@/components/AboutSection'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
    section: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <section {...props}>{children}</section>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <p {...props}>{children}</p>
    ),
    h2: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <h2 {...props}>{children}</h2>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

describe('About Section', () => {
  it('has correct ID (#about) for navigation', () => {
    render(<AboutSection />)

    const aboutSection = screen.getByRole('region', { name: /about/i })
    expect(aboutSection).toBeInTheDocument()
    expect(aboutSection).toHaveAttribute('id', 'about')
  })

  it('displays bio content paragraphs', () => {
    render(<AboutSection />)

    // Check for key content from each paragraph using getAllByText for terms that appear multiple times
    expect(screen.getByText(/Minneapolis, MN/i)).toBeInTheDocument()
    expect(screen.getByText(/University of North Texas/i)).toBeInTheDocument()
    expect(screen.getByText(/The Funky Knuckles/i)).toBeInTheDocument()
    // Use getAllByText for terms that might appear multiple times, check at least one exists
    expect(screen.getAllByText(/Eco/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Microsoft/i)).toBeInTheDocument()
    expect(screen.getByText(/TimelyCare/i)).toBeInTheDocument()
  })

  it('uses semantic HTML with proper heading structure', () => {
    render(<AboutSection />)

    const heading = screen.getByRole('heading', { level: 2, name: /about/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders all four bio paragraphs', () => {
    render(<AboutSection />)

    // Use getAllByRole to find paragraphs with bio content
    const paragraphs = screen.getAllByRole('paragraph')
    expect(paragraphs.length).toBeGreaterThanOrEqual(4)
  })
})
