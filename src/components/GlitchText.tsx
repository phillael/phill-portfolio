'use client'

import { motion, useReducedMotion, Variants } from 'framer-motion'
import { ReactNode, ElementType, ComponentPropsWithoutRef } from 'react'

/**
 * Allowed HTML elements for the GlitchText component
 */
type AllowedElements = 'h1' | 'h2' | 'h3' | 'span'

interface GlitchTextProps {
  children: ReactNode
  className?: string
  as?: AllowedElements
}

/**
 * Glitch animation variants for hover/focus effects
 *
 * Effect: rapid x-offset jitter (-2px to 2px), opacity flicker (0.8-1.0)
 * Uses GPU-accelerated transforms only (translateX, opacity)
 * Duration: 200-300ms (0.25s)
 */
const glitchVariants: Variants = {
  idle: {
    x: 0,
    opacity: 1,
    filter: 'hue-rotate(0deg)',
  },
  glitch: {
    x: [0, -2, 2, -1, 1, 0],
    opacity: [1, 0.8, 1, 0.9, 1, 1],
    filter: [
      'hue-rotate(0deg)',
      'hue-rotate(10deg)',
      'hue-rotate(-10deg)',
      'hue-rotate(5deg)',
      'hue-rotate(0deg)',
      'hue-rotate(0deg)',
    ],
  },
}

/**
 * Reduced motion fallback - no animation, just static state
 */
const reducedMotionVariants: Variants = {
  idle: {
    x: 0,
    opacity: 1,
    filter: 'hue-rotate(0deg)',
  },
  glitch: {
    x: 0,
    opacity: 1,
    filter: 'hue-rotate(0deg)',
  },
}

/**
 * GlitchText - Wrapper component for heading hover effects
 *
 * Creates a cyberpunk-style glitch effect on hover/focus with:
 * - Rapid x-offset jitter (-2px to 2px)
 * - Opacity flicker (0.8-1.0)
 * - Subtle hue-rotate filter shift for color distortion
 *
 * Features:
 * - Configurable HTML element (h1, h2, h3, span)
 * - Keyboard focus triggers the same glitch effect (accessibility)
 * - Respects prefers-reduced-motion preference
 * - GPU-accelerated transforms for smooth performance
 * - Short duration (250ms) for tasteful, non-distracting effect
 *
 * @example
 * ```tsx
 * <GlitchText as="h2" className="neon-text-purple">
 *   Experience
 * </GlitchText>
 * ```
 */
const GlitchText = ({
  children,
  className = '',
  as = 'span',
}: GlitchTextProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false

  // Select appropriate variants based on reduced motion preference
  const variants = shouldReduceMotion ? reducedMotionVariants : glitchVariants

  // Animation trigger state - same for hover and focus
  const animationTrigger = shouldReduceMotion ? undefined : 'glitch'

  // Transition settings - duration 250ms (within 200-300ms range)
  const transition = {
    duration: 0.25,
    ease: 'easeInOut' as const,
  }

  // Common props for all element types
  const commonProps = {
    className,
    variants,
    initial: 'idle',
    whileHover: animationTrigger,
    whileFocus: animationTrigger,
    transition,
    tabIndex: 0, // Make element focusable for keyboard accessibility
  }

  // Render the appropriate motion element based on 'as' prop
  switch (as) {
    case 'h1':
      return <motion.h1 {...commonProps}>{children}</motion.h1>
    case 'h2':
      return <motion.h2 {...commonProps}>{children}</motion.h2>
    case 'h3':
      return <motion.h3 {...commonProps}>{children}</motion.h3>
    case 'span':
    default:
      return <motion.span {...commonProps}>{children}</motion.span>
  }
}

export default GlitchText
