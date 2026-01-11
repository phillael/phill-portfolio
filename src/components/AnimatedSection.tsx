'use client'

import { motion, Variants, useReducedMotion } from 'framer-motion'
import { ReactNode } from 'react'

/**
 * Animation variant types for scroll reveal animations
 * - fade-up: y: 50 -> 0, opacity: 0 -> 1 (default)
 * - fade-in: opacity: 0 -> 1 only (no transform)
 * - slide-from-left: x: -50 -> 0, opacity: 0 -> 1
 * - slide-from-right: x: 50 -> 0, opacity: 0 -> 1
 * - scale-up: scale: 0.9 -> 1, opacity: 0 -> 1
 */
type AnimationVariant =
  | 'fade-up'
  | 'fade-in'
  | 'slide-from-left'
  | 'slide-from-right'
  | 'scale-up'

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  delay?: number
  variant?: AnimationVariant
}

/**
 * Creates animation variants based on the selected animation type
 * All animations are subtle and use GPU-accelerated properties (transform, opacity)
 */
const createVariants = (
  variant: AnimationVariant,
  delay: number,
  shouldReduceMotion: boolean
): Variants => {
  // When reduced motion is preferred, show content immediately
  if (shouldReduceMotion) {
    return {
      offscreen: {
        opacity: 1,
      },
      onscreen: {
        opacity: 1,
        transition: {
          duration: 0,
          delay: 0,
        },
      },
    }
  }

  // Base transition settings for all variants
  const baseTransition = {
    duration: 0.6,
    ease: 'easeOut' as const,
    delay,
  }

  // Animation variant configurations
  const variantConfigs: Record<AnimationVariant, Variants> = {
    'fade-up': {
      offscreen: {
        opacity: 0,
        y: 50,
      },
      onscreen: {
        opacity: 1,
        y: 0,
        transition: baseTransition,
      },
    },
    'fade-in': {
      offscreen: {
        opacity: 0,
      },
      onscreen: {
        opacity: 1,
        transition: baseTransition,
      },
    },
    'slide-from-left': {
      offscreen: {
        opacity: 0,
        x: -50,
      },
      onscreen: {
        opacity: 1,
        x: 0,
        transition: baseTransition,
      },
    },
    'slide-from-right': {
      offscreen: {
        opacity: 0,
        x: 50,
      },
      onscreen: {
        opacity: 1,
        x: 0,
        transition: baseTransition,
      },
    },
    'scale-up': {
      offscreen: {
        opacity: 0,
        scale: 0.9,
      },
      onscreen: {
        opacity: 1,
        scale: 1,
        transition: baseTransition,
      },
    },
  }

  return variantConfigs[variant]
}

/**
 * AnimatedSection - Reusable scroll-triggered animation wrapper
 *
 * Wraps content with Framer Motion animations that trigger when the element
 * enters the viewport. Supports multiple animation variants for visual variety.
 *
 * Features:
 * - Multiple animation variants (fade-up, fade-in, slide-from-left, slide-from-right, scale-up)
 * - Respects prefers-reduced-motion accessibility preference
 * - Viewport trigger: once: true, amount: 0.2 for single trigger at 20% visibility
 * - GPU-accelerated transforms for smooth performance
 */
const AnimatedSection = ({
  children,
  className = '',
  delay = 0,
  variant = 'fade-up',
}: AnimatedSectionProps) => {
  const shouldReduceMotion = useReducedMotion() ?? false

  const variants = createVariants(variant, delay, shouldReduceMotion)

  return (
    <motion.div
      className={className}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedSection
