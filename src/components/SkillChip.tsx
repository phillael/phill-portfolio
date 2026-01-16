'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * Sparkle type definition for hover effect
 */
interface Sparkle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

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
  // Gravity simulation: particle goes up first, then falls
  peakY: number  // highest point (negative = up)
  hasGravity: boolean
}

/**
 * Color map for cyberpunk particle colors
 * Uses CSS variables to match site theme
 * - primary: cyan
 * - secondary: magenta/purple
 * - accent: green
 */
const PARTICLE_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
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
 * Generate sparkles for hover effect
 */
const generateSparkles = (count: number = 8): Sparkle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 4 + Math.random() * 5,
    delay: Math.random() * 0.8,
    duration: 0.8 + Math.random() * 0.6,
  }))
}

/**
 * CSS keyframes for sparkle animation
 */
const sparkleKeyframes = `
@keyframes sparkle-pop {
  0%, 100% {
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  50% {
    transform: scale(1) rotate(180deg);
    opacity: 1;
  }
}
`

/**
 * Generate particles for normal burst effect
 * Creates 21-29 particles with wide spread (+15% from original)
 */
const generateParticles = (): Particle[] => {
  const count = Math.floor(randomBetween(21, 29))
  return Array.from({ length: count }, (_, index) => ({
    id: Date.now() + index,
    x: randomBetween(-173, 173),
    y: randomBetween(-173, 173),
    size: randomBetween(4, 9),
    color: getRandomColor(),
    duration: randomBetween(0.25, 0.4),
    peakY: 0,
    hasGravity: false, // normal burst doesn't need gravity
  }))
}

/**
 * Generate particles for mega explosion (destruction)
 * Creates 30-40 larger particles with radial spread
 */
const generateMegaExplosion = (): Particle[] => {
  const count = Math.floor(randomBetween(30, 40))
  return Array.from({ length: count }, (_, index) => ({
    id: Date.now() + index,
    x: randomBetween(-1100, 1100),
    y: randomBetween(-1100, 1100),
    size: randomBetween(10, 22),
    color: getRandomColor(),
    duration: randomBetween(0.25, 1),
    peakY: 0,
    hasGravity: false,
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
 * - Optional gravity: particles arc up then fall down
 * - Uses easeOut easing for natural deceleration
 */
const ParticleComponent = ({ particle }: ParticleComponentProps) => {
  // For gravity, use keyframes: start -> peak (up) -> final (down)
  const yAnimation = particle.hasGravity
    ? [0, particle.peakY, particle.y]
    : particle.y

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
        y: yAnimation,
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        duration: particle.duration,
        x: { duration: particle.duration, ease: 'easeOut' },
        y: { duration: particle.duration, ease: 'easeOut' },
        scale: { duration: particle.duration, ease: 'easeOut' },
        opacity: { duration: particle.duration, ease: 'easeIn', delay: particle.duration * 0.5 },
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
  const [shouldCollapse, setShouldCollapse] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [sparkles, setSparkles] = useState<Sparkle[]>([])
  const shouldReduceMotion = useReducedMotion()
  const chipRef = useRef<HTMLSpanElement>(null)

  const CLICKS_TO_DESTROY = 5

  // Generate sparkles when hovered
  useEffect(() => {
    if (isHovered && !shouldReduceMotion) {
      setSparkles(generateSparkles(8))
    }
  }, [isHovered, shouldReduceMotion])

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
      const element = chipRef.current || undefined
      // Hide chip and show points, but component stays mounted for particles
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

  /**
   * Trigger collapse animation shortly after destruction
   * This allows chips to rearrange while particles are still falling
   */
  useEffect(() => {
    if (isDestroyed && !shouldCollapse) {
      const timer = setTimeout(() => {
        setShouldCollapse(true)
      }, 1800) // Collapse after 1.8s, chips rearrange smoothly

      return () => clearTimeout(timer)
    }
  }, [isDestroyed, shouldCollapse])

  // Calculate damage level for visual feedback (0-4 = healthy, warning, danger, critical)
  const damageLevel = Math.min(clickCount, CLICKS_TO_DESTROY - 1)

  // Shake intensity increases with damage
  const shakeIntensity = damageLevel * 1.5

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sparkleKeyframes }} />
      <motion.div
        className={`relative inline-block overflow-visible ${isDestroyed ? 'pointer-events-none' : ''}`}
        layout
        initial={false}
        animate={shouldCollapse ? {
          width: 0,
          height: 0,
          marginRight: -8, // compensate for gap
        } : {}}
        transition={{
          layout: { duration: 0.3, ease: 'easeOut' },
          width: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
          height: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
          marginRight: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
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
            overflow-visible
            border border-primary/30
            ${damageLevel === 0 ? 'text-accent bg-card/80' : ''}
            ${damageLevel === 1 ? 'text-accent bg-card/70' : ''}
            ${damageLevel === 2 ? 'text-[hsl(40,100%,70%)] bg-card/60' : ''}
            ${damageLevel === 3 ? 'text-[hsl(20,100%,65%)] bg-card/50' : ''}
            ${damageLevel >= 4 ? 'text-[hsl(0,100%,65%)] bg-card/40' : ''}
          `}
          style={{
            textShadow: damageLevel === 0
              ? '0 0 4px hsl(var(--accent) / 0.6)'
              : undefined,
            boxShadow: damageLevel > 0
              ? `0 0 ${4 + damageLevel * 3}px hsl(${40 - damageLevel * 10}, 100%, 50%)`
              : '0 0 8px hsl(var(--primary) / 0.2)',
          }}
          whileHover={{
            scale: 1.05,
            textShadow: '0 0 8px hsl(var(--accent)), 0 0 16px hsl(var(--accent) / 0.6)',
          }}
          whileTap={{
            scale: 0.97,
          }}
          animate={isDestroyed ? {
            opacity: 0,
            scale: 0,
            transition: { duration: 0.15, ease: 'easeOut' }
          } : damageLevel > 0 ? {
            x: [0, -shakeIntensity, shakeIntensity, -shakeIntensity, shakeIntensity, 0],
            transition: { duration: 0.4, ease: 'easeOut' }
          } : {}}
          transition={{ duration: 0.15 }}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="button"
          tabIndex={0}
          aria-label={`${skill} skill - click ${CLICKS_TO_DESTROY - clickCount} more times to destroy`}
        >
          {/* Sparkles on hover - cyan color */}
          {isHovered && !shouldReduceMotion && sparkles.map((sparkle) => (
            <span
              key={sparkle.id}
              className="pointer-events-none absolute text-primary"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                width: sparkle.size,
                height: sparkle.size,
                animation: `sparkle-pop ${sparkle.duration}s ease-in-out infinite`,
                animationDelay: `${sparkle.delay}s`,
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            </span>
          ))}
          {skill}
        </motion.span>

        {/* Particle container - absolutely positioned over the chip with high z-index */}
        <div className="absolute inset-0 z-50 pointer-events-none">
          <AnimatePresence>
            {particles.map((particle) => (
              <ParticleComponent key={particle.id} particle={particle} />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}

export default SkillChip
