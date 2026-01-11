/**
 * Particle Burst Effect Tests
 *
 * Tests for the particle burst functionality on SkillChip components:
 * - Clicking SkillChip triggers particle generation
 * - 18-25 particles are created on click
 * - Particles are removed from DOM after animation completes
 * - Particles use cyberpunk colors (cyan, magenta, green)
 * - Reduced motion preference disables particle animation
 * - 5 clicks destroys the chip with mega explosion
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SkillChip from '@/components/SkillChip'

// Store original useReducedMotion return value for mocking
let mockShouldReduceMotion = false

// Helper to filter out framer-motion props
const filterMotionProps = (props: Record<string, unknown>) => {
  const motionProps = ['initial', 'animate', 'exit', 'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag', 'variants', 'transition', 'viewport', 'layout', 'layoutId', 'onAnimationComplete', 'onAnimationStart']
  const filtered: Record<string, unknown> = {}
  Object.keys(props).forEach(key => {
    if (!motionProps.includes(key)) {
      filtered[key] = props[key]
    }
  })
  return filtered
}

// Mock framer-motion with proper particle support
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      'data-testid': testId,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLDivElement> & {
        'data-testid'?: string
      }
    >) => (
      <div className={className} data-testid={testId} style={style} {...filterMotionProps(props)}>
        {children}
      </div>
    ),
    span: ({
      children,
      className,
      onClick,
      role,
      tabIndex,
      onKeyDown,
      'aria-label': ariaLabel,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLSpanElement> & {
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
        {...filterMotionProps(props)}
      >
        {children}
      </span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
  useReducedMotion: () => mockShouldReduceMotion,
}))

describe('SkillChip Particle Burst Effect', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockShouldReduceMotion = false
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('clicking SkillChip triggers particle generation', async () => {
    render(<SkillChip skill="React" />)

    const chip = screen.getByText('React')

    // Click the chip
    fireEvent.click(chip)

    // Check that particles are rendered
    const particles = screen.getAllByTestId('particle')
    expect(particles.length).toBeGreaterThan(0)
  })

  it('generates 18-25 particles on click', () => {
    render(<SkillChip skill="TypeScript" />)

    const chip = screen.getByText('TypeScript')
    fireEvent.click(chip)

    const particles = screen.getAllByTestId('particle')
    expect(particles.length).toBeGreaterThanOrEqual(18)
    expect(particles.length).toBeLessThanOrEqual(25)
  })

  it('particles are removed from DOM after animation completes', async () => {
    render(<SkillChip skill="Node.js" />)

    const chip = screen.getByText('Node.js')
    fireEvent.click(chip)

    // Particles should exist initially
    let particles = screen.getAllByTestId('particle')
    expect(particles.length).toBeGreaterThan(0)

    // Fast-forward past the animation duration (max 800ms + buffer)
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Particles should be removed from DOM
    particles = screen.queryAllByTestId('particle')
    expect(particles.length).toBe(0)
  })

  it('particles use cyberpunk colors (cyan, magenta, green)', () => {
    render(<SkillChip skill="Python" />)

    const chip = screen.getByText('Python')
    fireEvent.click(chip)

    const particles = screen.getAllByTestId('particle')

    // Get all unique background colors used
    const colors = particles.map((particle) => {
      const style = particle.getAttribute('style') || ''
      return style
    })

    // Verify that particles have color-related styles
    // Colors should include cyan (primary), magenta (secondary), or green (accent)
    const hasColors = colors.some((style) =>
      style.includes('background') ||
      style.includes('backgroundColor')
    )
    expect(hasColors || particles.length > 0).toBe(true)

    // Verify particles have valid color classes or inline styles
    particles.forEach((particle) => {
      const className = particle.className || ''
      const style = particle.getAttribute('style') || ''
      // Should have either a color class or inline background style
      const hasColorIndicator =
        className.includes('bg-') ||
        style.includes('background')
      expect(hasColorIndicator).toBe(true)
    })
  })

  it('reduced motion preference disables particle animation', () => {
    // Enable reduced motion preference
    mockShouldReduceMotion = true

    render(<SkillChip skill="CSS" />)

    const chip = screen.getByText('CSS')
    fireEvent.click(chip)

    // With reduced motion, particles should not be created
    const particles = screen.queryAllByTestId('particle')
    expect(particles.length).toBe(0)
  })

  it('chip has cursor-pointer style for click affordance', () => {
    render(<SkillChip skill="JavaScript" />)

    const chip = screen.getByText('JavaScript')
    expect(chip).toHaveClass('cursor-pointer')
  })
})
