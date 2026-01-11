'use client'

import { useState, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Experience } from '@/types/content'

interface TimelineCardProps {
  experience: Experience
}

/**
 * ChevronIcon - Expand/collapse indicator
 */
const ChevronIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <svg
    className={`w-5 h-5 transition-transform duration-300 ${
      isExpanded ? 'rotate-180' : ''
    }`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
)

/**
 * TechBadge - Individual tech stack badge
 */
const TechBadge = ({ tech }: { tech: string }) => (
  <span className="inline-block px-3 py-1 text-sm text-[hsl(var(--accent))] bg-[hsl(var(--muted))] rounded-sm font-medium">
    {tech}
  </span>
)

/**
 * TimelineCard - Expandable experience card with HUD styling
 *
 * Features:
 * - Collapsed state shows date, title, company, and expand indicator
 * - Expanded state reveals description, bullet points, and tech stack
 * - Smooth height transition animation with Framer Motion
 * - HUD aesthetic with angled corners and scanline effect
 * - Full keyboard accessibility (Enter/Space to toggle)
 */
const TimelineCard = ({ experience }: TimelineCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggleExpand()
      }
    },
    [toggleExpand]
  )

  const isMusicCareer = experience.type === 'music'
  const isEducation = experience.type === 'education'

  return (
    <motion.div
      layout
      className={`gradient-card hud-card p-4 md:p-6 cursor-pointer ${
        isMusicCareer ? 'border-l-4 border-l-[hsl(var(--secondary))]' : ''
      } ${isEducation ? 'border-l-4 border-l-[hsl(var(--accent))]' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${experience.title}${experience.company ? ` at ${experience.company}` : ''}. ${isExpanded ? 'Click to collapse' : 'Click to expand'}`}
      onClick={toggleExpand}
      onKeyDown={handleKeyDown}
    >
      {/* Collapsed State Header - Always Visible */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div className="flex-1">
          {/* Date Range - only show if present */}
          {experience.dateRange && (
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">
              {experience.dateRange}
            </p>
          )}

          {/* Title */}
          <h3
            className={`text-lg md:text-xl font-heading ${
              isEducation ? 'neon-text-green' : isMusicCareer ? 'neon-text-purple' : 'neon-text-blue'
            }`}
          >
            {experience.title}
          </h3>

          {/* Company - only show if present */}
          {experience.company && (
            <p className="text-base text-[hsl(var(--foreground))] opacity-90">
              {experience.company}
            </p>
          )}
        </div>

        {/* Expand Indicator */}
        <div
          className={`flex items-center gap-2 text-[hsl(var(--primary))] ${
            isExpanded ? 'text-[hsl(var(--accent))]' : ''
          }`}
        >
          <span className="text-sm hidden md:inline">
            {isExpanded ? 'Collapse' : 'Expand'}
          </span>
          <ChevronIcon isExpanded={isExpanded} />
        </div>
      </div>

      {/* Expanded State Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-[hsl(var(--primary)/0.2)]">
              {/* Description - only show if present */}
              {experience.description && (
                <p className="text-base text-[hsl(var(--foreground))] mb-4 leading-relaxed">
                  {experience.description}
                </p>
              )}

              {/* Bullet Points */}
              {experience.bulletPoints.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {experience.bulletPoints.map((bullet, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-[hsl(var(--foreground))] opacity-90"
                    >
                      <span
                        className="text-[hsl(var(--primary))] mt-1.5 flex-shrink-0"
                        aria-hidden="true"
                      >
                        *
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Tech Stack */}
              {experience.techStack.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {experience.techStack.map((tech) => (
                    <TechBadge key={tech} tech={tech} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TimelineCard
