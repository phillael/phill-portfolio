/**
 * AnimatedSection Variants Tests
 *
 * Tests for the AnimatedSection component scroll reveal animation variants:
 * - Default variant applies fade-up animation
 * - Each variant applies correct transform (fade-in, slide-from-left, slide-from-right, scale-up)
 * - Reduced motion preference disables animations
 * - Viewport trigger settings work correctly (once: true, amount: 0.2)
 */

import { render, screen } from '@testing-library/react'
import AnimatedSection from '@/components/AnimatedSection'

// Store original useReducedMotion return value for mocking
let mockShouldReduceMotion = false

// Store the last variants passed to motion.div for verification
let lastVariants: {
  offscreen?: Record<string, unknown>
  onscreen?: Record<string, unknown>
} = {}
let lastViewport: { once?: boolean; amount?: number } = {}

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      initial,
      whileInView,
      viewport,
      variants,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLDivElement> & {
        initial?: string
        whileInView?: string
        viewport?: { once?: boolean; amount?: number }
        variants?: {
          offscreen?: Record<string, unknown>
          onscreen?: Record<string, unknown>
        }
      }
    >) => {
      // Store variants and viewport for test verification
      if (variants) {
        lastVariants = variants
      }
      if (viewport) {
        lastViewport = viewport
      }
      return (
        <div
          className={className}
          data-testid="animated-section"
          data-initial={initial}
          data-while-in-view={whileInView}
          data-variants={variants ? JSON.stringify(variants) : undefined}
          data-viewport={viewport ? JSON.stringify(viewport) : undefined}
          {...props}
        >
          {children}
        </div>
      )
    },
  },
  useReducedMotion: () => mockShouldReduceMotion,
}))

describe('AnimatedSection Variants', () => {
  beforeEach(() => {
    mockShouldReduceMotion = false
    lastVariants = {}
    lastViewport = {}
  })

  it('default variant applies fade-up animation (y: 50 -> 0, opacity: 0 -> 1)', () => {
    render(
      <AnimatedSection>
        <p>Test content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()

    // Verify default fade-up animation values
    expect(lastVariants.offscreen).toBeDefined()
    expect(lastVariants.onscreen).toBeDefined()
    expect(lastVariants.offscreen?.y).toBe(50)
    expect(lastVariants.offscreen?.opacity).toBe(0)
    expect(lastVariants.onscreen?.y).toBe(0)
    expect(lastVariants.onscreen?.opacity).toBe(1)
  })

  it('fade-in variant applies opacity only animation (no transform)', () => {
    render(
      <AnimatedSection variant="fade-in">
        <p>Fade in content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Fade in content')).toBeInTheDocument()

    // fade-in should only animate opacity, no x or y transform
    expect(lastVariants.offscreen?.opacity).toBe(0)
    expect(lastVariants.onscreen?.opacity).toBe(1)
    expect(lastVariants.offscreen?.y).toBeUndefined()
    expect(lastVariants.offscreen?.x).toBeUndefined()
    expect(lastVariants.offscreen?.scale).toBeUndefined()
  })

  it('slide-from-left variant applies correct x transform (x: -50 -> 0)', () => {
    render(
      <AnimatedSection variant="slide-from-left">
        <p>Slide left content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Slide left content')).toBeInTheDocument()

    // slide-from-left should have negative x offset
    expect(lastVariants.offscreen?.x).toBe(-50)
    expect(lastVariants.offscreen?.opacity).toBe(0)
    expect(lastVariants.onscreen?.x).toBe(0)
    expect(lastVariants.onscreen?.opacity).toBe(1)
  })

  it('slide-from-right variant applies correct x transform (x: 50 -> 0)', () => {
    render(
      <AnimatedSection variant="slide-from-right">
        <p>Slide right content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Slide right content')).toBeInTheDocument()

    // slide-from-right should have positive x offset
    expect(lastVariants.offscreen?.x).toBe(50)
    expect(lastVariants.offscreen?.opacity).toBe(0)
    expect(lastVariants.onscreen?.x).toBe(0)
    expect(lastVariants.onscreen?.opacity).toBe(1)
  })

  it('scale-up variant applies correct scale transform (scale: 0.9 -> 1)', () => {
    render(
      <AnimatedSection variant="scale-up">
        <p>Scale up content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Scale up content')).toBeInTheDocument()

    // scale-up should animate scale
    expect(lastVariants.offscreen?.scale).toBe(0.9)
    expect(lastVariants.offscreen?.opacity).toBe(0)
    expect(lastVariants.onscreen?.scale).toBe(1)
    expect(lastVariants.onscreen?.opacity).toBe(1)
  })

  it('reduced motion preference shows content immediately without animation', () => {
    mockShouldReduceMotion = true

    render(
      <AnimatedSection variant="fade-up">
        <p>Reduced motion content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Reduced motion content')).toBeInTheDocument()

    // When reduced motion is preferred, there should be no offscreen state
    // Content should be immediately visible
    expect(lastVariants.offscreen?.opacity).toBe(1)
    expect(lastVariants.offscreen?.y).toBeUndefined()
    expect(lastVariants.offscreen?.x).toBeUndefined()
    expect(lastVariants.offscreen?.scale).toBeUndefined()
  })

  it('viewport trigger settings are correct (once: true, amount: 0.2)', () => {
    render(
      <AnimatedSection>
        <p>Viewport test content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Viewport test content')).toBeInTheDocument()

    // Verify viewport settings
    expect(lastViewport.once).toBe(true)
    expect(lastViewport.amount).toBe(0.2)
  })

  it('delay prop is passed to transition correctly', () => {
    render(
      <AnimatedSection delay={0.5}>
        <p>Delayed content</p>
      </AnimatedSection>
    )

    expect(screen.getByText('Delayed content')).toBeInTheDocument()

    // Verify delay is included in onscreen transition
    const transition = lastVariants.onscreen?.transition as Record<
      string,
      unknown
    >
    expect(transition?.delay).toBe(0.5)
  })
})
