'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface FloatingPointsProps {
  points: number
  id: number
}

/**
 * FloatingPoints - Animated points popup that floats up and fades
 */
const FloatingPoints = ({ points, id }: FloatingPointsProps) => {
  return (
    <motion.div
      key={id}
      className="absolute left-1/2 top-0 pointer-events-none font-heading text-2xl md:text-3xl"
      style={{
        textShadow: '0 0 10px hsl(130, 100%, 50%), 0 0 20px hsl(130, 100%, 50%)',
        color: 'hsl(130, 100%, 50%)',
      }}
      initial={{ opacity: 1, y: 0, x: '-50%', scale: 0.5 }}
      animate={{ opacity: 0, y: -80, x: '-50%', scale: 1.2 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: 'easeOut' }}
    >
      +{points.toLocaleString()}
    </motion.div>
  )
}

interface ScoreCounterProps {
  score: number
  combo: number
  isVisible?: boolean
}

/**
 * ScoreCounter - Animated score display with combo multiplier
 *
 * Features:
 * - Animated number counting up
 * - Pulse effect on score increase
 * - Combo multiplier display
 * - Cyberpunk neon styling
 * - Auto-hides after inactivity (controlled by parent)
 */
export const ScoreCounter = ({ score, combo, isVisible = true }: ScoreCounterProps) => {
  const [displayScore, setDisplayScore] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Animate score counting up
  useEffect(() => {
    if (score === displayScore) return

    setIsAnimating(true)
    const difference = score - displayScore
    const steps = Math.min(Math.abs(difference), 20)
    const increment = difference / steps
    let current = displayScore
    let step = 0

    const timer = setInterval(() => {
      step++
      current += increment
      if (step >= steps) {
        setDisplayScore(score)
        setIsAnimating(false)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.round(current))
      }
    }, 30)

    return () => clearInterval(timer)
  }, [score, displayScore])

  const shouldShow = score > 0 && isVisible

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 py-2 md:py-3 bg-background/80 backdrop-blur-md border-t border-primary/30"
          style={{
            boxShadow: '0 -4px 20px hsl(var(--primary) / 0.2)',
          }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
        >
      <div className="flex items-center justify-start gap-3 md:gap-4">
        {/* Score Section */}
        <div className="flex items-center gap-3 md:gap-4">
          <span
            className="font-pixel text-[10px] md:text-xs uppercase tracking-wide"
            style={{
              color: 'hsl(var(--accent))',
              textShadow: '0 0 8px hsl(var(--accent))',
            }}
          >
            Skill Slayer:
          </span>
          <motion.span
            className="font-pixel text-sm md:text-base lg:text-lg tabular-nums"
            style={{
              color: 'hsl(var(--primary))',
              textShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary) / 0.5), 2px 2px 0px hsl(var(--primary) / 0.3)',
            }}
            animate={isAnimating ? {
              scale: [1, 1.1, 1],
              transition: { duration: 0.2 }
            } : {}}
          >
            {displayScore.toLocaleString()}
          </motion.span>
        </div>

        {/* Combo Multiplier */}
        <AnimatePresence>
          {combo > 1 && (
            <motion.div
              className="font-pixel text-[8px] md:text-[10px]"
              style={{
                color: 'hsl(var(--secondary))',
                textShadow: '0 0 8px hsl(var(--secondary)), 2px 2px 0px hsl(var(--secondary) / 0.3)',
              }}
              initial={{ opacity: 0, scale: 0.5, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.5, x: 20 }}
            >
              {combo}x COMBO!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

interface PointsPopupManagerProps {
  popups: Array<{ id: number; points: number }>
}

/**
 * PointsPopupManager - Manages floating point popups
 */
export const PointsPopupManager = ({ popups }: PointsPopupManagerProps) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence>
        {popups.map((popup) => (
          <FloatingPoints key={popup.id} points={popup.points} id={popup.id} />
        ))}
      </AnimatePresence>
    </div>
  )
}

/**
 * Calculate points for destroying a skill
 * Points = letters * random multiplier (100-200)
 */
export const calculatePoints = (skillName: string): number => {
  const letters = skillName.replace(/[^a-zA-Z]/g, '').length
  const multiplier = Math.floor(Math.random() * 101) + 100 // 100-200
  return letters * multiplier
}
