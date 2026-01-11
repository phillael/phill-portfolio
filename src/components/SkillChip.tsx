'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * Particle type definition for burst effect
 */
interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: 'primary' | 'secondary' | 'accent'
  duration: number
}

/**
 * Color map for cyberpunk particle colors
 * - primary: cyan (hsl(190 100% 75%))
 * - secondary: magenta (hsl(280 100% 85%))
 * - accent: green (hsl(130 100% 50%))
 */
const PARTICLE_COLORS = {
  primary: 'hsl(190, 100%, 75%)',
  secondary: 'hsl(280, 100%, 85%)',
  accent: 'hsl(130, 100%, 50%)',
} as const

/**
 * Generate random number between min and max (inclusive)
 */
const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min
}

/**
 * Generate random color from cyberpunk palette
 */
const getRandomColor = (): 'primary' | 'secondary' | 'accent' => {
  const colors: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent']
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Generate particles for normal burst effect
 * Creates 18-25 particles with wide spread
 */
const generateParticles = (): Particle[] => {
  const count = Math.floor(randomBetween(18, 25))
  return Array.from({ length: count }, (_, index) => ({
    id: Date.now() + index,
    x: randomBetween(-150, 150),
    y: randomBetween(-150, 150),
    size: randomBetween(4, 8),
    color: getRandomColor(),
    duration: randomBetween(0.5, 0.8),
  }))
}

/**
 * Generate particles for mega explosion (destruction)
 * Creates 50-70 particles with massive spread for dramatic effect
 */
const generateMegaExplosion = (): Particle[] => {
  const count = Math.floor(randomBetween(50, 70))
  return Array.from({ length: count }, (_, index) => ({
    id: Date.now() + index,
    x: randomBetween(-300, 300),
    y: randomBetween(-300, 300),
    size: randomBetween(4, 10),
    color: getRandomColor(),
    duration: randomBetween(0.7, 1.2),
  }))
}

interface ParticleComponentProps {
  particle: Particle
}

/**
 * Particle - Individual particle for burst effect
 *
 * Features:
 * - Animates outward from center with random x/y offset
 * - Variable size based on particle config
 * - Fades from opacity 1 to 0
 * - Scales from 1.5 to 0 for dramatic effect
 * - Uses easeOut easing for natural deceleration
 */
const ParticleComponent = ({ particle }: ParticleComponentProps) => {
  return (
    <motion.div
      data-testid="particle"
      className="absolute rounded-full pointer-events-none"
      style={{
        width: particle.size,
        height: particle.size,
        backgroundColor: PARTICLE_COLORS[particle.color],
        left: '50%',
        top: '50%',
        marginLeft: -particle.size / 2,
        marginTop: -particle.size / 2,
        boxShadow: `0 0 ${particle.size}px ${PARTICLE_COLORS[particle.color]}, 0 0 ${particle.size * 2}px ${PARTICLE_COLORS[particle.color]}`,
      }}
      initial={{
        scale: 1.5,
        opacity: 1,
        x: 0,
        y: 0,
      }}
      animate={{
        scale: 0,
        opacity: 0,
        x: particle.x,
        y: particle.y,
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        duration: particle.duration,
        ease: 'easeOut',
      }}
    />
  )
}

interface SkillChipProps {
  skill: string
  onDestroy?: (skill: string, element?: HTMLElement) => void
}

/**
 * SkillChip - Interactive skill badge with hover effects and particle burst
 *
 * Features:
 * - Badge pattern with text-accent bg-muted styling
 * - Hover effect: scale(1.05) transform
 * - Hover effect: enhanced text-shadow glow
 * - Smooth 150-200ms transition
 * - Click triggers particle burst animation (18-25 particles)
 * - 5 clicks triggers mega explosion (50-70 particles) and destroys the chip
 * - Visual feedback showing damage level (shake, color shift)
 * - whileTap scale feedback (0.97)
 * - Respects prefers-reduced-motion
 */
const SkillChip = ({ skill, onDestroy }: SkillChipProps) => {
  const [particles, setParticles] = useState<Particle[]>([])
  const [clickCount, setClickCount] = useState(0)
  const [isDestroyed, setIsDestroyed] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const chipRef = useRef<HTMLSpanElement>(null)

  const CLICKS_TO_DESTROY = 5

  /**
   * Handle click to trigger particle burst or destruction
   * Skips animation if reduced motion is preferred
   */
  const handleClick = useCallback(() => {
    if (shouldReduceMotion || isDestroyed) {
      return
    }

    const newClickCount = clickCount + 1
    setClickCount(newClickCount)

    if (newClickCount >= CLICKS_TO_DESTROY) {
      // Mega explosion!
      setParticles(generateMegaExplosion())
      // Delay destruction slightly so explosion is visible
      const element = chipRef.current || undefined
      setTimeout(() => {
        setIsDestroyed(true)
        onDestroy?.(skill, element)
      }, 150)
    } else {
      // Normal particle burst
      setParticles(generateParticles())
    }
  }, [shouldReduceMotion, isDestroyed, clickCount, onDestroy, skill])

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleClick()
      }
    },
    [handleClick]
  )

  /**
   * Clear particles after animation completes to prevent memory buildup
   */
  useEffect(() => {
    if (particles.length > 0) {
      const maxDuration = Math.max(...particles.map(p => p.duration)) * 1000 + 100
      const timer = setTimeout(() => {
        setParticles([])
      }, maxDuration)

      return () => clearTimeout(timer)
    }
  }, [particles])

  // Calculate damage level for visual feedback (0-4 = healthy, warning, danger, critical)
  const damageLevel = Math.min(clickCount, CLICKS_TO_DESTROY - 1)

  // Shake intensity increases with damage
  const shakeIntensity = damageLevel * 1.5

  if (isDestroyed) {
    return null
  }

  return (
    <motion.div
      className="relative inline-block"
      layout
      transition={{
        layout: { duration: 0.3, ease: 'easeOut' }
      }}
    >
      {/* The chip itself - fades out during explosion */}
      <motion.span
        ref={chipRef}
        className={`
          inline-flex items-center
          px-3 py-1.5 md:px-4 md:py-2
          text-sm md:text-base
          font-medium
          rounded-md
          cursor-pointer
          select-none
          transition-colors duration-150 ease-out
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-accent
          focus-visible:ring-offset-2
          focus-visible:ring-offset-background
          ${damageLevel === 0 ? 'text-accent bg-muted' : ''}
          ${damageLevel === 1 ? 'text-accent bg-muted/90' : ''}
          ${damageLevel === 2 ? 'text-[hsl(40,100%,70%)] bg-muted/80' : ''}
          ${damageLevel === 3 ? 'text-[hsl(20,100%,65%)] bg-muted/70' : ''}
          ${damageLevel >= 4 ? 'text-[hsl(0,100%,65%)] bg-muted/60' : ''}
        `}
        style={{
          boxShadow: damageLevel > 0
            ? `0 0 ${4 + damageLevel * 3}px hsl(${40 - damageLevel * 10}, 100%, 50%)`
            : undefined,
        }}
        whileHover={{
          scale: 1.05,
          textShadow: '0 0 8px hsl(var(--accent)), 0 0 16px hsl(var(--accent) / 0.6)',
        }}
        whileTap={{
          scale: 0.97,
        }}
        animate={damageLevel > 0 ? {
          x: [0, -shakeIntensity, shakeIntensity, -shakeIntensity, shakeIntensity, 0],
          transition: { duration: 0.4, ease: 'easeOut' }
        } : {}}
        transition={{ duration: 0.15 }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`${skill} skill - click ${CLICKS_TO_DESTROY - clickCount} more times to destroy`}
      >
        {skill}
      </motion.span>

      {/* Particle container - absolutely positioned over the chip */}
      <AnimatePresence>
        {particles.map((particle) => (
          <ParticleComponent key={particle.id} particle={particle} />
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

export default SkillChip
