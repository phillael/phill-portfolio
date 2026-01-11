'use client'

import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import AnimatedSection from '@/components/AnimatedSection'
import SkillChip from '@/components/SkillChip'

interface SkillCategoryProps {
  category: string
  skills: string[]
  delay?: number
  onSkillDestroyed?: (skill: string, element?: HTMLElement) => void
}

/**
 * SkillCategory - Skill category grouping with heading and chips
 *
 * Features:
 * - Category heading with neon-text-blue effect
 * - Horizontal divider line below heading
 * - SkillChip components in flex-wrap layout
 * - AnimatedSection wrapper for staggered entrance animation
 * - LayoutGroup for smooth layout transitions when skills are destroyed
 * - Tracks destroyed skills locally
 */
const SkillCategory = ({ category, skills, delay = 0, onSkillDestroyed }: SkillCategoryProps) => {
  const [destroyedSkills, setDestroyedSkills] = useState<Set<string>>(new Set())

  const handleSkillDestroy = (skill: string, element?: HTMLElement) => {
    setDestroyedSkills(prev => new Set([...prev, skill]))
    // Notify parent for scoring
    onSkillDestroyed?.(skill, element)
  }

  const activeSkills = skills.filter(skill => !destroyedSkills.has(skill))

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

        {/* Skills Chips in Flex-Wrap Layout with smooth transitions */}
        <LayoutGroup>
          <motion.div
            className="flex flex-wrap gap-2 md:gap-3"
            layout
          >
            <AnimatePresence mode="popLayout">
              {activeSkills.map((skill) => (
                <motion.div
                  key={skill}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                    transition: { duration: 0.2 }
                  }}
                  transition={{
                    layout: { duration: 0.3, ease: 'easeOut' }
                  }}
                >
                  <SkillChip
                    skill={skill}
                    onDestroy={handleSkillDestroy}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        {/* Show message when all skills are destroyed */}
        <AnimatePresence>
          {activeSkills.length === 0 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-muted-foreground text-sm italic mt-4"
            >
              All {category.toLowerCase()} have been vanquished! 💥
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </AnimatedSection>
  )
}

export default SkillCategory
