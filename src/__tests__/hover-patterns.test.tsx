/**
 * Hover Patterns Consistency Tests
 *
 * Tests for standardized hover effects across interactive elements including:
 * - NavLinks have consistent scale (1.05-1.1) on hover
 * - SocialLinks maintain existing scale and glow pattern
 * - All interactive elements have smooth 150-200ms transitions
 * - Button hover includes background color shift
 */

import { render, screen } from '@testing-library/react'
import NavLinks from '@/components/NavLinks'
import SocialLinks from '@/components/SocialLinks'
import ResumeDownloadButton from '@/components/ResumeDownloadButton'
import ProjectCard from '@/components/ProjectCard'

// Mock framer-motion to capture whileHover and whileTap props
const mockMotionProps: Record<string, unknown>[] = []

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
    >) => {
      mockMotionProps.push({ whileHover, whileTap, transition, type: 'a' })
      return <a {...props}>{children}</a>
    },
    span: ({
      children,
      whileHover,
      whileTap,
      transition,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLSpanElement> & {
        whileHover?: object
        whileTap?: object
        transition?: object
      }
    >) => {
      mockMotionProps.push({ whileHover, whileTap, transition, type: 'span' })
      return <span {...props}>{children}</span>
    },
    article: ({
      children,
      initial,
      whileInView,
      viewport,
      transition,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLElement> & {
        initial?: object
        whileInView?: object
        viewport?: object
        transition?: object
      }
    >) => <article {...props}>{children}</article>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
}))

// Mock next/image for ProjectCard
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage(props: Record<string, unknown>) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt as string} src={props.src as string} />
  },
}))

const mockProject = {
  id: 'test-project',
  title: 'Test Project',
  description: 'A test project description',
  imageUrl: '/test-image.jpg',
  techStack: ['React', 'TypeScript'],
  liveUrl: 'https://example.com',
  repoUrl: 'https://github.com/test/repo',
  featured: true,
}

describe('Hover Pattern Consistency', () => {
  beforeEach(() => {
    mockMotionProps.length = 0
  })

  describe('NavLinks hover effects', () => {
    it('has consistent scale (1.05) on hover for all nav links', () => {
      render(<NavLinks />)

      // Get all captured motion props for anchor elements
      const navLinkProps = mockMotionProps.filter((p) => p.type === 'a')

      // Should have 6 nav links (Home, About, Experience, Skills, Projects, Contact)
      expect(navLinkProps.length).toBe(6)

      // Each should have scale 1.05 in whileHover
      navLinkProps.forEach((props) => {
        expect(props.whileHover).toMatchObject({
          scale: 1.05,
        })
      })
    })

    it('has neon glow effect matching SocialLinks pattern', () => {
      render(<NavLinks />)

      const navLinkProps = mockMotionProps.filter((p) => p.type === 'a')

      // Each should have textShadow or filter for glow effect
      navLinkProps.forEach((props) => {
        const whileHover = props.whileHover as Record<string, unknown>
        // Should have textShadow for neon glow effect
        expect(whileHover.textShadow).toBeDefined()
        expect(whileHover.textShadow).toContain('0 0 8px')
      })
    })

    it('has smooth transitions (150-200ms)', () => {
      render(<NavLinks />)

      // Check that links have appropriate transition duration in class
      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        // Should have duration-150 or duration-200 class
        const hasTransition =
          link.className.includes('duration-150') ||
          link.className.includes('duration-200')
        expect(hasTransition).toBe(true)
      })
    })
  })

  describe('SocialLinks hover effects', () => {
    it('maintains scale 1.1 and glow pattern on hover', () => {
      mockMotionProps.length = 0
      render(<SocialLinks />)

      const socialLinkProps = mockMotionProps.filter((p) => p.type === 'a')

      // Should have 2 social links (GitHub, LinkedIn)
      expect(socialLinkProps.length).toBe(2)

      // Each should have scale 1.1 and drop-shadow filter
      socialLinkProps.forEach((props) => {
        expect(props.whileHover).toMatchObject({
          scale: 1.1,
          filter: expect.stringContaining('drop-shadow'),
        })
      })
    })

    it('has whileTap scale 0.95 for click feedback', () => {
      mockMotionProps.length = 0
      render(<SocialLinks />)

      const socialLinkProps = mockMotionProps.filter((p) => p.type === 'a')

      socialLinkProps.forEach((props) => {
        expect(props.whileTap).toMatchObject({
          scale: 0.95,
        })
      })
    })
  })

  describe('Button hover states', () => {
    it('ResumeDownloadButton has consistent hover pattern with background shift', () => {
      mockMotionProps.length = 0
      render(<ResumeDownloadButton />)

      const buttonProps = mockMotionProps.filter((p) => p.type === 'a')

      expect(buttonProps.length).toBe(1)
      expect(buttonProps[0].whileHover).toMatchObject({
        scale: 1.05,
        filter: expect.stringContaining('drop-shadow'),
      })

      // Check for background color shift in className
      const link = screen.getByRole('link')
      expect(link.className).toContain('hover:bg-primary/10')
    })

    it('buttons have whileTap scale 0.95 for click feedback', () => {
      mockMotionProps.length = 0
      render(<ResumeDownloadButton />)

      const buttonProps = mockMotionProps.filter((p) => p.type === 'a')

      expect(buttonProps[0].whileTap).toMatchObject({
        scale: 0.95,
      })
    })
  })

  describe('ProjectCard hover states', () => {
    it('action buttons have scale 1.05 and whileTap 0.95', () => {
      mockMotionProps.length = 0
      render(<ProjectCard project={mockProject} />)

      // Filter for the action button motion props (Live Demo, View Code)
      const buttonProps = mockMotionProps.filter((p) => p.type === 'a')

      // Should have 2 action buttons
      expect(buttonProps.length).toBe(2)

      // Each should have scale 1.05 on hover
      buttonProps.forEach((props) => {
        expect(props.whileHover).toMatchObject({
          scale: 1.05,
        })
      })

      // Each should have whileTap 0.95
      buttonProps.forEach((props) => {
        expect(props.whileTap).toMatchObject({
          scale: 0.95,
        })
      })
    })

    it('action buttons have smooth 150-200ms transitions', () => {
      render(<ProjectCard project={mockProject} />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        const hasTransition =
          link.className.includes('duration-150') ||
          link.className.includes('duration-200')
        expect(hasTransition).toBe(true)
      })
    })
  })
})
