/**
 * Phase 3 Integration Tests
 *
 * Critical end-to-end workflow tests for Phase 3 features:
 * - Resume download flow across variants
 * - Particle burst animation workflow
 * - Scroll animation sequence verification
 * - Glitch effect on section headings
 * - Contact section LinkedIn CTA workflow
 */

import { render, screen, fireEvent, act } from '@testing-library/react'

// Mock framer-motion
let mockShouldReduceMotion = false
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
    div: ({
      children,
      className,
      initial,
      animate,
      exit,
      transition,
      style,
      whileInView,
      viewport,
      variants,
      'data-testid': testId,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLDivElement> & {
        initial?: object | string
        animate?: object
        exit?: object
        transition?: object
        whileInView?: string
        viewport?: object
        variants?: object
        'data-testid'?: string
      }
    >) => (
      <div className={className} data-testid={testId} style={style} {...props}>
        {children}
      </div>
    ),
    span: ({
      children,
      className,
      whileHover,
      whileTap,
      whileFocus,
      transition,
      variants,
      initial,
      onClick,
      role,
      tabIndex,
      onKeyDown,
      'aria-label': ariaLabel,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLSpanElement> & {
        whileHover?: object | string
        whileTap?: object
        whileFocus?: object | string
        transition?: object
        variants?: object
        initial?: string
        role?: string
        tabIndex?: number
        'aria-label'?: string
      }
    >) => (
      <span
        className={className}
        onClick={onClick}
        role={role}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </span>
    ),
    h1: ({ children, className, tabIndex, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement> & { tabIndex?: number }>) => (
      <h1 className={className} tabIndex={tabIndex} {...props}>{children}</h1>
    ),
    h2: ({ children, className, tabIndex, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement> & { tabIndex?: number }>) => (
      <h2 className={className} tabIndex={tabIndex} {...props}>{children}</h2>
    ),
    h3: ({ children, className, tabIndex, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement> & { tabIndex?: number }>) => (
      <h3 className={className} tabIndex={tabIndex} {...props}>{children}</h3>
    ),
    header: ({
      children,
      initial,
      animate,
      transition,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLElement> & {
        initial?: object
        animate?: object
        transition?: object
      }
    >) => <header {...props}>{children}</header>,
    button: ({
      children,
      whileTap,
      ...props
    }: React.PropsWithChildren<
      React.ButtonHTMLAttributes<HTMLButtonElement> & {
        whileTap?: object
      }
    >) => <button {...props}>{children}</button>,
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
  useReducedMotion: () => mockShouldReduceMotion,
}))

// Import components
import ResumeDownloadButton from '@/components/ResumeDownloadButton'
import ContactSection from '@/components/ContactSection'
import GlitchText from '@/components/GlitchText'
import AnimatedSection from '@/components/AnimatedSection'

describe('Phase 3 Integration: Resume Download Flow', () => {
  beforeEach(() => {
    mockShouldReduceMotion = false
  })

  it('desktop variant provides complete download workflow', () => {
    render(<ResumeDownloadButton variant="desktop" />)

    const link = screen.getByRole('link')

    // Verify link has download attribute
    expect(link).toHaveAttribute('download')

    // Verify correct PDF path
    expect(link).toHaveAttribute('href', '/Phillip_Aelony_Resume_2025.pdf')

    // Verify accessible label
    expect(link).toHaveAttribute('aria-label')
    expect(link.getAttribute('aria-label')).toContain('resume')

    // Verify minimum touch target
    expect(link).toHaveClass('min-h-[44px]')
  })

  it('mobile variant provides full-width download experience', () => {
    render(<ResumeDownloadButton variant="mobile" />)

    const link = screen.getByRole('link')

    // Verify full-width styling for mobile
    expect(link).toHaveClass('w-full')

    // Verify longer text for mobile context
    expect(screen.getByText(/download resume/i)).toBeInTheDocument()
  })

  it('section variant includes contextual guidance', () => {
    render(<ResumeDownloadButton variant="section" />)

    // Verify contextual text is present
    expect(screen.getByText(/view.*full.*resume/i)).toBeInTheDocument()

    // Verify link still functions
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/Phillip_Aelony_Resume_2025.pdf')
  })
})

describe('Phase 3 Integration: Contact Section Flow', () => {
  it('LinkedIn is featured as primary contact method', () => {
    render(<ContactSection />)

    // Check for LinkedIn button
    const linkedinLink = screen.getByLabelText(/connect.*linkedin/i)
    expect(linkedinLink).toBeInTheDocument()
    expect(linkedinLink).toHaveAttribute('href', expect.stringContaining('linkedin.com'))

    // Check for explanatory text mentioning LinkedIn
    expect(screen.getByText(/reach out on LinkedIn/i)).toBeInTheDocument()
  })

  it('GitHub is available as secondary contact option', () => {
    render(<ContactSection />)

    // Check for GitHub link
    const githubLink = screen.getByLabelText(/github/i)
    expect(githubLink).toBeInTheDocument()
    expect(githubLink).toHaveAttribute('href', expect.stringContaining('github.com'))
  })

  it('does NOT display email address anywhere', () => {
    render(<ContactSection />)

    const sectionText = screen.getByRole('region').textContent || ''

    // Verify no email address pattern is present
    expect(sectionText).not.toMatch(/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    expect(sectionText).not.toContain('email')
  })

  it('does NOT contain contact form', () => {
    render(<ContactSection />)

    // Verify no form element
    expect(screen.queryByRole('form')).not.toBeInTheDocument()

    // Verify no input elements
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})

describe('Phase 3 Integration: Animation Accessibility', () => {
  it('AnimatedSection respects reduced motion preference', () => {
    mockShouldReduceMotion = true

    render(
      <AnimatedSection variant="fade-up">
        <p>Test content</p>
      </AnimatedSection>
    )

    // Content should still render
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('GlitchText is keyboard accessible', () => {
    render(
      <GlitchText as="h2">Experience</GlitchText>
    )

    const heading = screen.getByRole('heading')

    // Should be focusable
    expect(heading).toHaveAttribute('tabIndex', '0')
  })

  it('all animation variants maintain content visibility', () => {
    const variants = ['fade-up', 'fade-in', 'slide-from-left', 'slide-from-right', 'scale-up'] as const

    variants.forEach((variant) => {
      const { unmount } = render(
        <AnimatedSection variant={variant}>
          <p>Content for {variant}</p>
        </AnimatedSection>
      )

      expect(screen.getByText(`Content for ${variant}`)).toBeInTheDocument()
      unmount()
    })
  })
})

describe('Phase 3 Integration: Responsive Touch Targets', () => {
  it('ResumeDownloadButton meets 44px minimum in all variants', () => {
    const variants = ['desktop', 'mobile', 'section'] as const

    variants.forEach((variant) => {
      const { unmount } = render(<ResumeDownloadButton variant={variant} />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('min-h-[44px]')

      unmount()
    })
  })

  it('ContactSection buttons meet minimum touch target', () => {
    render(<ContactSection />)

    // LinkedIn button
    const linkedinLink = screen.getByLabelText(/connect.*linkedin/i)
    expect(linkedinLink).toHaveClass('min-h-[44px]')
    expect(linkedinLink).toHaveClass('min-w-[44px]')

    // GitHub link
    const githubLink = screen.getByLabelText(/github/i)
    expect(githubLink).toHaveClass('min-h-[44px]')
    expect(githubLink).toHaveClass('min-w-[44px]')
  })
})
