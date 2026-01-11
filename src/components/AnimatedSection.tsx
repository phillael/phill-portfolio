'use client'

import { motion, Variants } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * AnimatedSection - Reusable scroll-triggered animation wrapper
 *
 * Wraps content with Framer Motion animations that trigger when the element
 * enters the viewport. Uses fade-in and slide-up animation by default.
 */
const AnimatedSection = ({
  children,
  className = '',
  delay = 0,
}: AnimatedSectionProps) => {
  const variants: Variants = {
    offscreen: {
      opacity: 0,
      y: 50,
    },
    onscreen: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
        delay,
      },
    },
  }

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
