'use client'

import { motion } from 'framer-motion'
import AnimatedSection from '@/components/AnimatedSection'
import SkillChip from '@/components/SkillChip'

interface SkillCategoryProps {
  category: string
  skills: string[]
  delay?: number
}

/**
 * SkillCategory - Skill category grouping with heading and chips
 *
 * Features:
 * - Category heading with neon-text-blue effect
 * - Horizontal divider line below heading
 * - SkillChip components in flex-wrap layout
 * - AnimatedSection wrapper for staggered entrance animation
 */
const SkillCategory = ({ category, skills, delay = 0 }: SkillCategoryProps) => {
  return (
    <AnimatedSection delay={delay}>
      <div className="mb-8 md:mb-12">
        {/* Category Heading */}
        <motion.h3 className="text-xl md:text-2xl font-heading neon-text-blue mb-3">
          {category}
        </motion.h3>

        {/* Horizontal Divider */}
        <div
          className="w-full h-px mb-4 md:mb-6 bg-gradient-to-r from-[hsl(var(--primary)/0.8)] via-[hsl(var(--primary)/0.4)] to-transparent"
          aria-hidden="true"
        />

        {/* Skills Chips in Flex-Wrap Layout */}
        <div className="flex flex-wrap gap-2 md:gap-3">
          {skills.map((skill) => (
            <SkillChip key={skill} skill={skill} />
          ))}
        </div>
      </div>
    </AnimatedSection>
  )
}

export default SkillCategory
