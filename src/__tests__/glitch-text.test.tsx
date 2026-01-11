/**
 * GlitchText Component Tests
 *
 * Tests for the GlitchText hover effect component:
 * - GlitchText renders children correctly
 * - Hover triggers glitch animation (class or style change)
 * - Animation duration is 200-300ms
 * - Reduced motion preference provides non-glitch fallback
 * - Keyboard focus triggers glitch effect (accessibility)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import GlitchText from '@/components/GlitchText'

// Store original useReducedMotion return value for mocking
let mockShouldReduceMotion = false

// Track if whileHover or whileFocus variants were set
let lastWhileHover: object | string | undefined
let lastWhileFocus: object | string | undefined
let lastTransition: { duration?: number } | undefined

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    h1: ({
      children,
      className,
      whileHover,
      whileFocus,
      variants,
      transition,
      tabIndex,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLHeadingElement> & {
        whileHover?: object | string
        whileFocus?: object | string
        variants?: object
        transition?: { duration?: number }
        tabIndex?: number
      }
    >) => {
      lastWhileHover = whileHover
      lastWhileFocus = whileFocus
      lastTransition = transition
      return (
        <h1
          className={className}
          data-testid="glitch-text"
          data-while-hover={whileHover ? JSON.stringify(whileHover) : undefined}
          data-while-focus={whileFocus ? JSON.stringify(whileFocus) : undefined}
          data-transition={transition ? JSON.stringify(transition) : undefined}
          data-variants={variants ? JSON.stringify(variants) : undefined}
          tabIndex={tabIndex}
          {...props}
        >
          {children}
        </h1>
      )
    },
    h2: ({
      children,
      className,
      whileHover,
      whileFocus,
      variants,
      transition,
      tabIndex,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLHeadingElement> & {
        whileHover?: object | string
        whileFocus?: object | string
        variants?: object
        transition?: { duration?: number }
        tabIndex?: number
      }
    >) => {
      lastWhileHover = whileHover
      lastWhileFocus = whileFocus
      lastTransition = transition
      return (
        <h2
          className={className}
          data-testid="glitch-text"
          data-while-hover={whileHover ? JSON.stringify(whileHover) : undefined}
          data-while-focus={whileFocus ? JSON.stringify(whileFocus) : undefined}
          data-transition={transition ? JSON.stringify(transition) : undefined}
          data-variants={variants ? JSON.stringify(variants) : undefined}
          tabIndex={tabIndex}
          {...props}
        >
          {children}
        </h2>
      )
    },
    h3: ({
      children,
      className,
      whileHover,
      whileFocus,
      variants,
      transition,
      tabIndex,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLHeadingElement> & {
        whileHover?: object | string
        whileFocus?: object | string
        variants?: object
        transition?: { duration?: number }
        tabIndex?: number
      }
    >) => {
      lastWhileHover = whileHover
      lastWhileFocus = whileFocus
      lastTransition = transition
      return (
        <h3
          className={className}
          data-testid="glitch-text"
          data-while-hover={whileHover ? JSON.stringify(whileHover) : undefined}
          data-while-focus={whileFocus ? JSON.stringify(whileFocus) : undefined}
          data-transition={transition ? JSON.stringify(transition) : undefined}
          data-variants={variants ? JSON.stringify(variants) : undefined}
          tabIndex={tabIndex}
          {...props}
        >
          {children}
        </h3>
      )
    },
    span: ({
      children,
      className,
      whileHover,
      whileFocus,
      variants,
      transition,
      tabIndex,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLSpanElement> & {
        whileHover?: object | string
        whileFocus?: object | string
        variants?: object
        transition?: { duration?: number }
        tabIndex?: number
      }
    >) => {
      lastWhileHover = whileHover
      lastWhileFocus = whileFocus
      lastTransition = transition
      return (
        <span
          className={className}
          data-testid="glitch-text"
          data-while-hover={whileHover ? JSON.stringify(whileHover) : undefined}
          data-while-focus={whileFocus ? JSON.stringify(whileFocus) : undefined}
          data-transition={transition ? JSON.stringify(transition) : undefined}
          data-variants={variants ? JSON.stringify(variants) : undefined}
          tabIndex={tabIndex}
          {...props}
        >
          {children}
        </span>
      )
    },
  },
  useReducedMotion: () => mockShouldReduceMotion,
}))

describe('GlitchText Component', () => {
  beforeEach(() => {
    mockShouldReduceMotion = false
    lastWhileHover = undefined
    lastWhileFocus = undefined
    lastTransition = undefined
  })

  it('renders children correctly', () => {
    render(<GlitchText>Experience</GlitchText>)

    expect(screen.getByText('Experience')).toBeInTheDocument()
  })

  it('renders as different HTML elements based on "as" prop', () => {
    const { rerender } = render(<GlitchText as="h1">Heading 1</GlitchText>)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

    rerender(<GlitchText as="h2">Heading 2</GlitchText>)
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()

    rerender(<GlitchText as="h3">Heading 3</GlitchText>)
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()

    rerender(<GlitchText as="span">Span text</GlitchText>)
    expect(screen.getByText('Span text')).toBeInTheDocument()
  })

  it('hover triggers glitch animation (whileHover is defined)', () => {
    render(<GlitchText>Skills</GlitchText>)

    const element = screen.getByTestId('glitch-text')

    // Verify whileHover animation is defined
    expect(lastWhileHover).toBeDefined()

    // Check that the element has the whileHover data attribute
    const whileHoverAttr = element.getAttribute('data-while-hover')
    expect(whileHoverAttr).not.toBeNull()
  })

  it('animation duration is between 200-300ms', () => {
    render(<GlitchText>Projects</GlitchText>)

    // The transition duration should be within the specified range
    expect(lastTransition).toBeDefined()
    expect(lastTransition?.duration).toBeGreaterThanOrEqual(0.2)
    expect(lastTransition?.duration).toBeLessThanOrEqual(0.3)
  })

  it('reduced motion preference provides non-glitch fallback', () => {
    mockShouldReduceMotion = true

    render(<GlitchText>About</GlitchText>)

    // When reduced motion is preferred, whileHover should be undefined or have no animation
    // The component should either not set whileHover or set it to an empty/static state
    const element = screen.getByTestId('glitch-text')
    const whileHoverAttr = element.getAttribute('data-while-hover')

    // With reduced motion, either whileHover is undefined/null or it's a static object
    if (whileHoverAttr) {
      const whileHover = JSON.parse(whileHoverAttr)
      // If whileHover exists, it should not include x animation for reduced motion
      // Could be empty object or undefined x property
      expect(
        whileHover.x === undefined || Array.isArray(whileHover.x) === false
      ).toBe(true)
    } else {
      // whileHover is undefined which is fine for reduced motion
      expect(whileHoverAttr).toBeNull()
    }
  })

  it('keyboard focus triggers glitch effect (accessibility)', () => {
    render(<GlitchText>Experience</GlitchText>)

    const element = screen.getByTestId('glitch-text')

    // Verify whileFocus animation is defined for keyboard accessibility
    expect(lastWhileFocus).toBeDefined()

    // Check that the element has the whileFocus data attribute
    const whileFocusAttr = element.getAttribute('data-while-focus')
    expect(whileFocusAttr).not.toBeNull()

    // Verify element is focusable (has tabIndex)
    expect(element.getAttribute('tabIndex')).toBe('0')
  })

  it('applies custom className to the element', () => {
    render(<GlitchText className="neon-text-purple">Custom Class</GlitchText>)

    const element = screen.getByTestId('glitch-text')
    expect(element).toHaveClass('neon-text-purple')
  })
})
