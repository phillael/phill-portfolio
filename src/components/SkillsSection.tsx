'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import AnimatedSection from '@/components/AnimatedSection'
import SkillCategory from '@/components/SkillCategory'
import GlitchText from '@/components/GlitchText'
import { ScoreCounter, calculatePoints } from '@/components/SkillScore'
import skillsData from '@/data/skills.json'
import { SkillCategory as SkillCategoryType } from '@/types/content'
import { motion, AnimatePresence } from 'framer-motion'

interface PointPopup {
  id: number
  points: number
  x: number
  y: number
}

/**
 * SkillsSection - Skills showcase section with grouped chips and scoring
 *
 * Features:
 * - Section ID for navigation anchor (#skills)
 * - Proper accessibility attributes (role, aria-label)
 * - Section heading with neon-text-purple effect
 * - Data imported from /src/data/skills.json
 * - SkillCategory for each category (Technical, Professional, Other)
 * - AnimatedSection wrapper with slide-from-left variant for heading
 * - GlitchText effect on heading for hover interaction
 * - Responsive chip layout with flex-wrap
 * - overflow-x-hidden to prevent particle effects from causing horizontal scroll
 * - Skill Slayer scoring system with combo multipliers
 */
const SkillsSection = () => {
  const skills = skillsData as SkillCategoryType[]
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [pointPopups, setPointPopups] = useState<PointPopup[]>([])
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const popupIdRef = useRef(0)

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current)
      }
    }
  }, [])

  const handleSkillDestroyed = useCallback((skill: string, element?: HTMLElement) => {
    // Calculate base points
    const basePoints = calculatePoints(skill)

    // Increase combo
    const newCombo = combo + 1
    setCombo(newCombo)

    // Apply combo multiplier (1x, 1.5x, 2x, 2.5x, etc.)
    const comboMultiplier = 1 + (newCombo - 1) * 0.5
    const totalPoints = Math.round(basePoints * comboMultiplier)

    // Add points to score
    setScore(prev => prev + totalPoints)

    // Create floating point popup
    const popupId = popupIdRef.current++
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2

    if (element) {
      const rect = element.getBoundingClientRect()
      x = rect.left + rect.width / 2
      y = rect.top
    }

    setPointPopups(prev => [...prev, { id: popupId, points: totalPoints, x, y }])

    // Remove popup after animation
    setTimeout(() => {
      setPointPopups(prev => prev.filter(p => p.id !== popupId))
    }, 1000)

    // Reset combo after 2 seconds of inactivity
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current)
    }
    comboTimeoutRef.current = setTimeout(() => {
      setCombo(0)
    }, 2000)
  }, [combo])

  return (
    <section
      id="skills"
      aria-label="Skills"
      role="region"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6 overflow-x-hidden"
    >
      {/* Score Counter - Fixed position */}
      <ScoreCounter score={score} combo={combo} />

      {/* Floating Point Popups */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {pointPopups.map((popup) => (
            <motion.div
              key={popup.id}
              className="absolute pointer-events-none font-heading text-2xl md:text-3xl font-bold"
              style={{
                left: popup.x,
                top: popup.y,
                textShadow: '0 0 10px hsl(130, 100%, 50%), 0 0 20px hsl(130, 100%, 50%), 0 0 30px hsl(130, 100%, 50%)',
                color: 'hsl(130, 100%, 60%)',
              }}
              initial={{ opacity: 1, y: 0, x: '-50%', scale: 0.5 }}
              animate={{ opacity: 0, y: -100, x: '-50%', scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              +{popup.points.toLocaleString()}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Section Heading - slide-from-left animation variant with glitch effect */}
        <AnimatedSection variant="slide-from-left">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center mb-12 md:mb-16">
            <GlitchText as="span" className="neon-text-purple">
              Skills
            </GlitchText>
          </h2>
        </AnimatedSection>

        {/* Skill Categories */}
        <div className="space-y-6 md:space-y-8">
          {skills.map((category, index) => (
            <SkillCategory
              key={category.category}
              category={category.category}
              skills={category.skills}
              delay={0.1 * (index + 1)}
              onSkillDestroyed={handleSkillDestroyed}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default SkillsSection
