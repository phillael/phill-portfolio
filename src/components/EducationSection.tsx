'use client'

import { motion } from 'framer-motion'
import AnimatedSection from '@/components/AnimatedSection'
import EducationCard from '@/components/EducationCard'
import educationData from '@/data/education.json'
import { Education } from '@/types/content'

/**
 * EducationSection - Education and certifications section
 *
 * Features:
 * - Section ID for navigation anchor (#education)
 * - Proper accessibility attributes (role, aria-label)
 * - Section heading with neon-text-purple effect
 * - Data imported from /src/data/education.json
 * - EducationCard for each entry with staggered entrance animations
 * - Less visual prominence than Experience and Projects sections
 * - Responsive grid: single column on mobile, 3 columns on desktop (lg+)
 */
const EducationSection = () => {
  const education = educationData as Education[]

  return (
    <section
      id="education"
      aria-label="Education and Certifications"
      role="region"
      className="py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-5xl mx-auto">
        {/* Section Heading */}
        <AnimatedSection>
          <motion.h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center neon-text-purple mb-12 md:mb-16">
            Education
          </motion.h2>
        </AnimatedSection>

        {/* Education Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {education.map((entry, index) => (
            <EducationCard
              key={entry.id}
              education={entry}
              delay={0.1 * (index + 1)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default EducationSection
