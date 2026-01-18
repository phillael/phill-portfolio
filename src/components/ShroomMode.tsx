'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useShroomMode } from '@/context/ShroomModeContext'
import { X } from 'lucide-react'

// Dynamically import 3D component to avoid SSR issues with Three.js
const ShroomWizard3D = dynamic(() => import('./ShroomWizard3D'), {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-2 left-2 md:bottom-4 md:left-4 z-50 w-[120px] h-[150px]" />
  ),
})

/**
 * MushroomIcon - Custom SVG mushroom icon
 */
const MushroomIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Mushroom cap */}
    <path
      d="M12 2C6 2 2 6 2 10C2 12 3 13 5 13H19C21 13 22 12 22 10C22 6 18 2 12 2Z"
      fill="currentColor"
      opacity="0.9"
    />
    {/* Cap spots */}
    <circle cx="8" cy="7" r="1.5" fill="white" opacity="0.6" />
    <circle cx="14" cy="6" r="1" fill="white" opacity="0.6" />
    <circle cx="11" cy="9" r="1.2" fill="white" opacity="0.6" />
    {/* Stem */}
    <path
      d="M8 13H16V18C16 20 14.5 22 12 22C9.5 22 8 20 8 18V13Z"
      fill="currentColor"
      opacity="0.7"
    />
  </svg>
)

/**
 * ShroomMode - Psychedelic mode that makes the page melt and warp
 *
 * Features:
 * - Small mushroom icon by default, click to summon wizard
 * - 3D animated shroom wizard character
 * - SVG displacement filter for melting/warping effect
 * - Animated turbulence for organic movement
 * - CSS hue-rotate for color cycling
 * - Confirmation modal before activation
 * - Clear escape button always visible
 * - Respects prefers-reduced-motion
 */
const ShroomMode = () => {
  const [showWizard, setShowWizard] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const { isActive, setIsActive } = useShroomMode()
  const [intensity, setIntensity] = useState(0)
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)
  const animationRef = useRef<number | null>(null)

  const handleShroomClick = () => {
    if (isActive) {
      // If already active, deactivate and dismiss wizard
      setIsActive(false)
      setShowWizard(false)
    } else {
      // Show confirmation modal
      setShowModal(true)
    }
  }

  const handleConfirm = () => {
    setShowModal(false)
    setIsActive(true)
  }

  const handleCancel = () => {
    setShowModal(false)
  }

  // ESC key to exit shroom mode and dismiss wizard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isActive) {
          setIsActive(false)
          setShowWizard(false)
        } else if (showWizard) {
          setShowWizard(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, showWizard, setIsActive])

  // Animate the turbulence for organic melting effect
  useEffect(() => {
    const target = document.getElementById('shroom-target')

    if (!isActive || !turbulenceRef.current || !target) {
      // Reset when deactivated
      if (target) {
        target.style.filter = ''
        target.style.animation = ''
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      setIntensity(0)
      return
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      return
    }

    // Apply the filter to the content wrapper (not body, so buttons stay visible)
    target.style.filter = 'url(#shroom-filter)'
    target.style.animation = 'shroom-hue-cycle 6s linear infinite' // Start slow

    // Gradually increase intensity AND speed over 30 seconds
    let currentIntensity = 0
    const maxIntensity = 40 // Slightly higher max
    const rampUpDuration = 30000 // 30 seconds to full effect
    const startTime = Date.now()

    let seed = 0
    const animate = () => {
      if (!turbulenceRef.current || !isActive) return

      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / rampUpDuration) // 0 to 1 over 30s

      // Ramp up intensity
      currentIntensity = progress * maxIntensity
      setIntensity(currentIntensity)

      // Speed increases over time: starts at 0.1, ends at 0.8
      const speedMultiplier = 0.1 + (progress * 0.7)
      seed += speedMultiplier
      turbulenceRef.current.setAttribute('seed', String(seed))

      // Wider ripples - lower base frequency (0.003 = very wide waves)
      // Frequency increases slightly as trip intensifies
      const baseFreq = 0.003 + (progress * 0.004) // 0.003 to 0.007
      const freqVariation = Math.sin(seed * 0.015) * 0.002
      turbulenceRef.current.setAttribute('baseFrequency', String(baseFreq + freqVariation))

      // Speed up hue cycle as trip intensifies (6s down to 2s)
      const hueDuration = 6 - (progress * 4)
      target.style.animation = `shroom-hue-cycle ${hueDuration}s linear infinite`

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      document.body.style.filter = ''
      document.body.style.animation = ''
    }
  }, [isActive])

  return (
    <>
      {/* SVG Filter Definition - Always in DOM but only used when active */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="shroom-filter" x="-20%" y="-20%" width="140%" height="140%">
            {/* Turbulence creates organic noise pattern */}
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.008"
              numOctaves="3"
              seed="0"
              result="noise"
            />
            {/* Displacement uses noise to warp the image */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={intensity}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Mushroom Icon - shown when wizard is hidden */}
      <AnimatePresence>
        {!showWizard && !isActive && (
          <motion.button
            className="fixed bottom-16 right-4 md:bottom-24 md:right-6 z-40 w-10 h-10 md:w-14 md:h-14 rounded-full bg-card border-2 border-secondary/50 flex items-center justify-center hover:border-secondary transition-shadow duration-300"
            style={{
              boxShadow: '0 0 15px hsl(var(--secondary)), 0 0 30px hsl(var(--secondary) / 0.5), 0 0 45px hsl(var(--secondary) / 0.3)',
            }}
            onClick={() => setShowWizard(true)}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Summon the Shroom Wizard"
          >
            <MushroomIcon className="w-5 h-5 md:w-7 md:h-7 text-secondary" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 3D Shroom Wizard - shown when summoned */}
      {(showWizard || isActive) && (
        <div>
          <ShroomWizard3D
            key={showWizard ? 'wizard-visible' : 'wizard-hidden'}
            onClick={handleShroomClick}
            isActive={isActive}
            showModal={showModal}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* X button to dismiss wizard / exit shroom mode */}
      <AnimatePresence>
        {(showWizard || isActive) && (
          <motion.button
            className="fixed bottom-16 right-4 md:bottom-24 md:right-6 z-40 w-10 h-10 md:w-14 md:h-14 rounded-full bg-card border-2 border-destructive/50 flex items-center justify-center hover:border-destructive hover:bg-destructive/20 transition-colors"
            style={{
              boxShadow: '0 0 8px hsl(var(--destructive) / 0.4), 0 0 16px hsl(var(--destructive) / 0.2)',
            }}
            onClick={() => {
              setIsActive(false)
              setShowWizard(false)
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isActive ? "Exit Shroom Mode" : "Dismiss the Shroom Wizard"}
          >
            <X className="w-4 h-4 md:w-5 md:h-5 text-destructive" />
          </motion.button>
        )}
      </AnimatePresence>

</>
  )
}

export default ShroomMode
