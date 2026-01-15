'use client'

import { Canvas } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { useReducedMotion } from 'framer-motion'

/**
 * Cyberpunk particle colors matching the site's color palette.
 * - Cyan: primary color (hsl(190, 100%, 75%))
 * - Magenta: secondary color (hsl(280, 100%, 85%))
 */
const PARTICLE_COLORS = {
  cyan: '#00ffff',
  magenta: '#ff00ff',
} as const

interface ParticleBackgroundProps {
  className?: string
}

/**
 * ParticleBackground - Ambient floating particles using React Three Fiber
 *
 * Features:
 * - Uses @react-three/drei Sparkles for subtle ambient particle effect
 * - Cyberpunk color scheme with cyan and magenta particles
 * - Low opacity (0.3-0.4) for subtle background effect
 * - Positioned as absolute background layer with pointer-events-none
 * - Respects prefers-reduced-motion accessibility preference
 * - Uses Canvas setup pattern from AudioVisualizer: dpr={[1, 2]}, gl={{ antialias: true, alpha: true }}
 *
 * @param className - Additional CSS classes to apply to the container
 */
const ParticleBackground = ({ className = '' }: ParticleBackgroundProps) => {
  const shouldReduceMotion = useReducedMotion()

  // Return null when reduced motion is preferred for accessibility
  if (shouldReduceMotion) {
    return null
  }

  return (
    <div
      data-testid="particle-background"
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Ambient lighting - low intensity for dark atmosphere */}
        <ambientLight intensity={0.2} />

        {/* Cyan point light */}
        <pointLight
          position={[5, 5, 5]}
          intensity={50}
          color={PARTICLE_COLORS.cyan}
        />

        {/* Magenta point light */}
        <pointLight
          position={[-5, -5, 5]}
          intensity={30}
          color={PARTICLE_COLORS.magenta}
        />

        {/* Cyan sparkles - subtle ambient particles */}
        <Sparkles
          count={60}
          scale={8}
          size={1.5}
          speed={0.3}
          color={PARTICLE_COLORS.cyan}
          opacity={0.35}
        />

        {/* Magenta sparkles - complementary particles */}
        <Sparkles
          count={40}
          scale={8}
          size={1.2}
          speed={0.25}
          color={PARTICLE_COLORS.magenta}
          opacity={0.3}
        />
      </Canvas>
    </div>
  )
}

export default ParticleBackground
