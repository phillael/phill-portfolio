'use client'

import { motion } from 'framer-motion'
import AnimatedSection from '@/components/AnimatedSection'
import SkillCategory from '@/components/SkillCategory'
import skillsData from '@/data/skills.json'
import { SkillCategory as SkillCategoryType } from '@/types/content'

/**
 * SkillsSection - Skills showcase section with grouped chips
 *
 * Features:
 * - Section ID for navigation anchor (#skills)
 * - Proper accessibility attributes (role, aria-label)
 * - Section heading with neon-text-purple effect
 * - Data imported from /src/data/skills.json
 * - SkillCategory for each category (Technical, Professional, Other)
 * - AnimatedSection wrapper for section heading
 * - Responsive chip layout with flex-wrap
 */
const SkillsSection = () => {
  const skills = skillsData as SkillCategoryType[]

  return (
    <section
      id="skills"
      aria-label="Skills"
      role="region"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Section Heading */}
        <AnimatedSection>
          <motion.h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center neon-text-purple mb-12 md:mb-16">
            Skills
          </motion.h2>
        </AnimatedSection>

        {/* Skill Categories */}
        <div className="space-y-6 md:space-y-8">
          {skills.map((category, index) => (
            <SkillCategory
              key={category.category}
              category={category.category}
              skills={category.skills}
              delay={0.1 * (index + 1)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default SkillsSection
