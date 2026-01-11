/**
 * Integration Tests
 *
 * Tests for Phase 1 and Phase 2 integration including:
 * - Full page renders without errors
 * - All interactive elements have accessible names
 * - Mobile menu flow works end-to-end
 * - All Phase 2 sections render correctly
 * - Navigation to new sections works
 */

import { render, screen, fireEvent } from '@testing-library/react'
import HomePage from '@/app/page'
import Nav from '@/components/Nav'

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
    h2: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <h2 {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <h3 {...props}>{children}</h3>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <p {...props}>{children}</p>
    ),
    nav: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <nav {...props}>{children}</nav>
    ),
    header: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <header {...props}>{children}</header>
    ),
    section: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <section {...props}>{children}</section>
    ),
    a: ({
      children,
      ...props
    }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a {...props}>{children}</a>
    ),
    article: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <article {...props}>{children}</article>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}))

describe('Integration Tests', () => {
  describe('Full Page Rendering', () => {
    it('renders the full page without errors', () => {
      expect(() => {
        render(<HomePage />)
      }).not.toThrow()
    })

    it('renders both Hero and About sections', () => {
      render(<HomePage />)

      const heroSection = screen.getByRole('region', { name: /hero/i })
      const aboutSection = screen.getByRole('region', { name: /about/i })

      expect(heroSection).toBeInTheDocument()
      expect(aboutSection).toBeInTheDocument()
    })
  })

  describe('Accessibility - Interactive Elements', () => {
    it('all buttons have accessible names', () => {
      render(<HomePage />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        // Each button should have accessible name via aria-label or text content
        expect(button).toHaveAccessibleName()
      })
    })

    it('all links have accessible names', () => {
      render(<Nav />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveAccessibleName()
      })
    })
  })

  describe('Mobile Menu Flow', () => {
    it('opens mobile menu when hamburger is clicked', () => {
      render(<Nav />)

      const menuButton = screen.getByRole('button', {
        name: /open navigation menu/i,
      })

      fireEvent.click(menuButton)

      // Menu should now be open - dialog should be visible
      const dialog = screen.getByRole('dialog', { name: /navigation menu/i })
      expect(dialog).toBeInTheDocument()
    })

    it('closes mobile menu when close button is clicked', () => {
      render(<Nav />)

      // Open the menu first
      const openButton = screen.getByRole('button', {
        name: /open navigation menu/i,
      })
      fireEvent.click(openButton)

      // Find and click close button (the one inside the dialog)
      const closeButtons = screen.getAllByRole('button', {
        name: /close navigation menu/i,
      })
      const dialogCloseButton = closeButtons.find(
        (btn) => btn.closest('[role="dialog"]')
      )

      if (dialogCloseButton) {
        fireEvent.click(dialogCloseButton)
      }

      // Dialog should no longer be visible after animation
      // Note: with mocked framer-motion, AnimatePresence removes immediately
      expect(
        screen.queryByRole('dialog', { name: /navigation menu/i })
      ).not.toBeInTheDocument()
    })

    it('closes mobile menu when Escape key is pressed', () => {
      render(<Nav />)

      // Open the menu
      const menuButton = screen.getByRole('button', {
        name: /open navigation menu/i,
      })
      fireEvent.click(menuButton)

      // Verify menu is open
      expect(
        screen.getByRole('dialog', { name: /navigation menu/i })
      ).toBeInTheDocument()

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' })

      // Menu should close
      expect(
        screen.queryByRole('dialog', { name: /navigation menu/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Phase 2 - All New Sections Render', () => {
    it('renders all Phase 2 sections without errors', () => {
      render(<HomePage />)

      // Experience Section
      const experienceSection = screen.getByRole('region', {
        name: /work experience/i,
      })
      expect(experienceSection).toBeInTheDocument()

      // Skills Section
      const skillsSection = screen.getByRole('region', { name: /skills/i })
      expect(skillsSection).toBeInTheDocument()

      // Projects Section
      const projectsSection = screen.getByRole('region', { name: /projects/i })
      expect(projectsSection).toBeInTheDocument()

      // Education Section
      const educationSection = screen.getByRole('region', {
        name: /education and certifications/i,
      })
      expect(educationSection).toBeInTheDocument()
    })

    it('all Phase 2 section anchors are present for navigation', () => {
      render(<HomePage />)

      // Verify each section ID exists for navigation anchors
      expect(document.getElementById('experience')).toBeInTheDocument()
      expect(document.getElementById('skills')).toBeInTheDocument()
      expect(document.getElementById('projects')).toBeInTheDocument()
      expect(document.getElementById('education')).toBeInTheDocument()
    })

    it('navigation includes links to all Phase 2 sections', () => {
      render(<Nav />)

      const experienceLink = screen.getByRole('link', { name: /experience/i })
      const skillsLink = screen.getByRole('link', { name: /skills/i })
      const projectsLink = screen.getByRole('link', { name: /projects/i })
      const educationLink = screen.getByRole('link', { name: /education/i })

      expect(experienceLink).toHaveAttribute('href', '#experience')
      expect(skillsLink).toHaveAttribute('href', '#skills')
      expect(projectsLink).toHaveAttribute('href', '#projects')
      expect(educationLink).toHaveAttribute('href', '#education')
    })
  })

  describe('Phase 2 - Content Integration', () => {
    it('Experience section displays data from JSON', () => {
      render(<HomePage />)

      // Check for experience titles from the JSON data
      expect(screen.getByText('Senior Software Engineer II')).toBeInTheDocument()
      // TimelyCare appears in both Experience and Projects sections
      const timelycareMentions = screen.getAllByText('TimelyCare')
      expect(timelycareMentions.length).toBeGreaterThanOrEqual(1)
    })

    it('Skills section displays all skill categories', () => {
      render(<HomePage />)

      expect(screen.getByText('Technical Skills')).toBeInTheDocument()
      expect(screen.getByText('Professional Skills')).toBeInTheDocument()
      expect(screen.getByText('Other Skills')).toBeInTheDocument()
    })

    it('Projects section displays all three projects', () => {
      render(<HomePage />)

      expect(screen.getByText('Number Slayers')).toBeInTheDocument()
      expect(screen.getByText('2D Pong Game')).toBeInTheDocument()
      // TimelyCare project uses title "TimelyCare" (shared with experience)
      const timelycareMentions = screen.getAllByText('TimelyCare')
      expect(timelycareMentions.length).toBeGreaterThanOrEqual(1)
    })

    it('Education section displays all credentials', () => {
      render(<HomePage />)

      expect(screen.getByText('MongoDB/Full-stack Certificate')).toBeInTheDocument()
      expect(screen.getByText('Ultimate Redux Course')).toBeInTheDocument()
      expect(screen.getByText('BA Jazz Studies')).toBeInTheDocument()
    })
  })

  describe('Phase 2 - Heading Hierarchy', () => {
    it('maintains proper heading hierarchy across all sections', () => {
      render(<HomePage />)

      // All section headings should be h2
      const h2Elements = document.querySelectorAll('h2')
      const h2Texts = Array.from(h2Elements).map((h2) => h2.textContent)

      expect(h2Texts).toContain('Experience')
      expect(h2Texts).toContain('Skills')
      expect(h2Texts).toContain('Projects')
      expect(h2Texts).toContain('Education')
    })
  })
})
