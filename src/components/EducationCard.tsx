'use client'

import { motion } from 'framer-motion'
import { Education } from '@/types/content'

interface EducationCardProps {
  education: Education
  delay?: number
}

/**
 * EducationCard - Individual education/certification card
 *
 * Features:
 * - Displays credential name prominently with neon text effect
 * - Shows institution/platform name
 * - Shows year if available
 * - Subtle icon/badge indicating type (certificate vs degree)
 * - Gradient card base styling with hover hue-rotate effect
 * - Minimal design, less prominent than Experience/Projects
 */
const EducationCard = ({ education, delay = 0 }: EducationCardProps) => {
  // Determine if this is a degree (contains "BA", "BS", "MA", etc.) or certificate
  const isDegree = /\b(BA|BS|MA|MS|PhD|B\.A\.|B\.S\.|M\.A\.|M\.S\.)\b/i.test(education.credential)

  return (
    <motion.article
      className="gradient-card rounded-lg p-5 md:p-6 flex flex-col h-full"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay }}
    >
      {/* Type Badge */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={`
            inline-flex items-center gap-1.5
            px-2.5 py-1
            text-xs font-medium
            rounded-full
            ${isDegree
              ? 'text-secondary bg-secondary/10 border border-secondary/30'
              : 'text-primary bg-primary/10 border border-primary/30'
            }
          `}
        >
          {isDegree ? (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
                />
              </svg>
              Degree
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              Certificate
            </>
          )}
        </span>

        {/* Year Badge */}
        {education.year && (
          <span className="text-xs text-foreground/50 font-medium">
            {education.year}
          </span>
        )}
      </div>

      {/* Credential Name */}
      <h3 className="text-lg md:text-xl font-heading neon-text-blue mb-2">
        {education.credential}
      </h3>

      {/* Institution */}
      <p className="text-foreground/80 text-sm md:text-base mb-1">
        {education.institution}
      </p>

      {/* Platform (if applicable) */}
      {education.platform && (
        <p className="text-foreground/50 text-xs md:text-sm mt-auto">
          {education.platform}
        </p>
      )}
    </motion.article>
  )
}

export default EducationCard
