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
 * MushroomIcon - Clean mushroom icon with spots
 */
const MushroomIcon = ({ className = '', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Mushroom cap */}
    <path
      d="M12 2C5.5 2 1 6.5 1 11C1 12.5 2 13 3 13H21C22 13 23 12.5 23 11C23 6.5 18.5 2 12 2Z"
      fill="currentColor"
    />
    {/* Spots (lighter) */}
    <ellipse cx="7" cy="7.5" rx="2" ry="1.8" fill="white" opacity="0.3" />
    <ellipse cx="12.5" cy="6" rx="2.2" ry="2" fill="white" opacity="0.3" />
    <ellipse cx="17" cy="8.5" rx="1.6" ry="1.5" fill="white" opacity="0.3" />
    <circle cx="9.5" cy="10.5" r="1" fill="white" opacity="0.25" />
    {/* Stem */}
    <path
      d="M8.5 13H15.5C15.5 13 16.5 15 16.5 17.5C16.5 20 14.5 22 12 22C9.5 22 7.5 20 7.5 17.5C7.5 15 8.5 13 8.5 13Z"
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
  const [isLoading, setIsLoading] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const { isActive, setIsActive } = useShroomMode()
  const [intensity, setIntensity] = useState(0)
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)
  const animationRef = useRef<number | null>(null)

  // Called when the wizard model has loaded (but still walking on)
  const handleWizardLoaded = () => {
    // Model is loaded but keep loading state until walk-on completes
  }

  // Called when the wizard has finished walking onto the screen
  const handleEnterComplete = () => {
    setIsLoading(false)
  }

  const handleShroomClick = () => {
    if (isActive) {
      // If already active, deactivate and start exit animation
      setIsActive(false)
      setIsExiting(true)
      setIsLoading(true)
    } else {
      // Show confirmation modal
      setShowModal(true)
    }
  }

  // Called when wizard walk-off animation completes
  const handleExitComplete = () => {
    setIsExiting(false)
    setShowWizard(false)
    setIsLoading(false)
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
          setIsExiting(true)
          setIsLoading(true)
        } else if (showWizard && !isExiting) {
          setIsExiting(true)
          setIsLoading(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, showWizard, isExiting, setIsActive])

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

      {/* Mushroom Icon - shown when wizard is hidden OR when loading (shows spinner) */}
      <AnimatePresence>
        {((!showWizard && !isActive) || isLoading) && (
          <motion.button
            className="fixed bottom-16 right-4 md:bottom-24 md:right-6 z-40 w-10 h-10 md:w-14 md:h-14 rounded-full bg-card border-2 border-secondary/50 flex items-center justify-center hover:border-secondary transition-shadow duration-300"
            style={{
              boxShadow: '0 0 8px hsl(var(--secondary) / 0.5), 0 0 15px hsl(var(--secondary) / 0.25), 0 0 22px hsl(var(--secondary) / 0.15)',
            }}
            onClick={() => {
              setIsLoading(true)
              setShowWizard(true)
            }}
            disabled={isLoading}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={isLoading ? {} : { scale: 1.1 }}
            whileTap={isLoading ? {} : { scale: 0.95 }}
            aria-label={isLoading ? "Loading wizard..." : "Summon the Shroom Wizard"}
          >
            {isLoading ? (
              <motion.div
                className="w-5 h-5 md:w-7 md:h-7 border-2 border-secondary/30 border-t-secondary rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            ) : (
              <MushroomIcon
                className="w-5 h-5 md:w-7 md:h-7 text-secondary"
                style={{
                  filter: 'drop-shadow(0 0 2px hsl(var(--secondary) / 0.8)) drop-shadow(0 0 5px hsl(var(--secondary) / 0.6)) drop-shadow(0 0 8px hsl(var(--secondary) / 0.4))',
                }}
              />
            )}
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
            onLoaded={handleWizardLoaded}
            isExiting={isExiting}
            onExitComplete={handleExitComplete}
            onEnterComplete={handleEnterComplete}
          />
        </div>
      )}

      {/* X button to dismiss wizard / exit shroom mode */}
      <AnimatePresence>
        {(showWizard || isActive) && !isExiting && !isLoading && (
          <motion.button
            className="fixed bottom-16 right-4 md:bottom-24 md:right-6 z-40 w-10 h-10 md:w-14 md:h-14 rounded-full bg-card border-2 border-destructive/50 flex items-center justify-center hover:border-destructive hover:bg-destructive/20 transition-colors"
            style={{
              boxShadow: '0 0 8px hsl(var(--destructive) / 0.4), 0 0 16px hsl(var(--destructive) / 0.2)',
            }}
            onClick={() => {
              setIsActive(false)
              setIsExiting(true)
              setIsLoading(true)
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
