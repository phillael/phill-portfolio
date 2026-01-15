'use client'

/**
 * GlowEffect - Animated multi-color glow effect
 *
 * Creates a smooth morphing glow using 3 layered gradients (cyan, magenta, purple)
 * that fade in/out with staggered timing for a continuous color blend effect.
 *
 * Uses pure CSS animations for optimal performance on both web and mobile.
 */

interface GlowEffectProps {
  /** Additional CSS classes for the container */
  className?: string
  /** Size of the glow relative to container */
  size?: 'sm' | 'md' | 'lg'
  /** Custom inset classes (overrides size) */
  inset?: string
}

const sizeClasses = {
  sm: '-inset-2',
  md: '-inset-4',
  lg: '-inset-8',
}

const GlowEffect = ({ className = '', size = 'md', inset }: GlowEffectProps) => {
  const insetClass = inset ?? sizeClasses[size]

  return (
    <div
      className={`absolute ${insetClass} pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <div className="glow-layer glow-layer-magenta" />
      <div className="glow-layer glow-layer-purple" />
      <div className="glow-layer glow-layer-cyan" />
    </div>
  )
}

export default GlowEffect
