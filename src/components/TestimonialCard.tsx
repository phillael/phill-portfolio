'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import type { Testimonial } from '@/types/testimonial'

interface TestimonialCardProps {
  testimonial: Testimonial
  isActive?: boolean
}

/**
 * Character limit for testimonial body before truncation.
 * Testimonials over this limit show expand/collapse toggle.
 */
const TRUNCATE_LIMIT = 200

/**
 * Truncates text at the specified limit and adds ellipsis.
 * Tries to break at a word boundary for cleaner truncation.
 */
const truncateText = (text: string, limit: number): string => {
  if (text.length <= limit) return text

  const truncated = text.slice(0, limit)
  const lastSpace = truncated.lastIndexOf(' ')

  // Break at word boundary if possible
  if (lastSpace > limit - 30) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * TestimonialCard - Displays a colleague testimonial with avatar and details
 *
 * Features:
 * - Next.js Image component for optimized avatar display
 * - Gradient card styling matching ProjectCard pattern
 * - Expand/collapse for long testimonials (>200 characters)
 * - AnimatePresence for smooth height transitions
 * - Cyberpunk neon text effects on name
 * - Quote marks with accent color styling
 * - Respects prefers-reduced-motion accessibility preference
 * - Error fallback for avatar images
 *
 * Responsive Design:
 * - Mobile: Reduced padding (p-4), smaller avatar (w-12 h-12), compact typography
 * - Tablet: Medium padding (p-5), medium avatar (w-14 h-14), medium typography
 * - Desktop: Full padding (p-6), larger avatar (w-16 h-16), full typography
 */
const TestimonialCard = ({ testimonial, isActive = false }: TestimonialCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const shouldReduceMotion = useReducedMotion() ?? false

  const shouldTruncate = testimonial.body.length > TRUNCATE_LIMIT
  const displayText = isExpanded ? testimonial.body : truncateText(testimonial.body, TRUNCATE_LIMIT)

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev)
  }

  // Animation variants for text expansion
  const textVariants = {
    collapsed: {
      height: 'auto',
      opacity: 1,
    },
    expanded: {
      height: 'auto',
      opacity: 1,
    },
  }

  return (
    <motion.article
      data-testid="testimonial-card"
      data-reduced-motion={shouldReduceMotion ? 'true' : 'false'}
      className="gradient-card rounded-lg overflow-hidden flex flex-col h-full p-4 md:p-5 lg:p-6"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.6 }}
    >
      {/* Quote mark decoration - responsive sizing */}
      <div className="text-4xl md:text-5xl lg:text-6xl text-accent/30 font-heading leading-none mb-1 md:mb-2 select-none">
        &ldquo;
      </div>

      {/* Testimonial Body */}
      <div className="flex-grow mb-4 md:mb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={isExpanded ? 'expanded' : 'collapsed'}
            variants={shouldReduceMotion ? undefined : textVariants}
            initial={shouldReduceMotion ? undefined : 'collapsed'}
            animate={shouldReduceMotion ? undefined : isExpanded ? 'expanded' : 'collapsed'}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
          >
            <p
              data-testid="testimonial-body"
              className="text-foreground/90 text-sm md:text-base lg:text-lg leading-relaxed italic"
            >
              {displayText}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Expand/Collapse Button */}
        {shouldTruncate && (
          <motion.button
            onClick={toggleExpand}
            className="
              mt-2 md:mt-3
              text-primary text-xs md:text-sm font-medium
              hover:text-accent
              transition-colors duration-150
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-primary
              focus-visible:ring-offset-2
              focus-visible:ring-offset-card
              min-h-[44px] min-w-[44px]
              inline-flex items-center
            "
            whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Read less' : 'Read more'}
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </motion.button>
        )}
      </div>

      {/* Author Info - responsive layout and sizing */}
      <div className="flex items-center gap-3 md:gap-4 pt-3 md:pt-4 border-t border-primary/20">
        {/* Avatar - responsive sizing */}
        <div className="relative w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex-shrink-0 rounded-full overflow-hidden border-2 border-primary/50">
          {!imageError ? (
            <Image
              src={testimonial.image}
              alt={`${testimonial.name} avatar`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 48px, (max-width: 1024px) 56px, 64px"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <span className="text-foreground/40 font-heading text-base md:text-lg">
                {testimonial.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Name, Position, Date - responsive typography */}
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <h4 className="text-sm md:text-base lg:text-lg font-heading neon-text-blue truncate">
            {testimonial.name}
          </h4>
          <p className="text-xs md:text-sm text-foreground/70 truncate">{testimonial.position}</p>
          <p className="text-xs text-foreground/50">{testimonial.date}</p>
        </div>
      </div>

      {/* Relationship Context - responsive typography */}
      <p className="mt-2 md:mt-3 text-xs text-foreground/50 italic">{testimonial.relationship}</p>
    </motion.article>
  )
}

export default TestimonialCard
