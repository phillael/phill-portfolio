'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useShroomMode } from '@/context/ShroomModeContext'
import { X } from 'lucide-react'
import WizardChat, { pickRandom, TRIUMPH_LINES, DECLINE_LINES } from '@/components/WizardChat'
import MushroomOfferBubble from '@/components/MushroomOfferBubble'

// Dynamically import 3D component to avoid SSR issues with Three.js
const loadShroomWizard3D = () => import('./ShroomWizard3D')
const ShroomWizard3D = dynamic(loadShroomWizard3D, {
  ssr: false,
  loading: () => (
    <div className="fixed bottom-2 left-2 md:bottom-4 md:left-4 z-50 w-[120px] h-[150px]" />
  ),
})

// Mobile breakpoint (matches Tailwind's md)
const MOBILE_BREAKPOINT = 768

// Desktop trip tuning
const MAX_DISPLACEMENT = 40
const RAMP_UP_MS = 30000 // 30 seconds to full effect
// The displacement filter repaints the whole page whenever it changes, so cap
// how often we touch it. feTurbulence rounds its seed to an integer anyway.
const WARP_UPDATE_MS = 1000 / 30
const HUE_KEYFRAMES: Keyframe[] = [
  { filter: 'hue-rotate(0deg) saturate(1.5)' },
  { filter: 'hue-rotate(90deg) saturate(2)' },
  { filter: 'hue-rotate(180deg) saturate(1.8)' },
  { filter: 'hue-rotate(270deg) saturate(2)' },
  { filter: 'hue-rotate(360deg) saturate(1.5)' },
]
const HUE_BASE_DURATION_MS = 6000

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
 * ShroomMode - Psychedelic mode with platform-specific effects
 *
 * Desktop: hue-rotate Web Animation on #shroom-target + SVG displacement
 *          filter on the inner #shroom-warp (throttled to 30 updates/s)
 * Mobile: CSS transforms + hue-rotate (GPU-accelerated for performance)
 */
const ShroomMode = () => {
  const [showWizard, setShowWizard] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const { isActive, setIsActive } = useShroomMode()
  const toggleShroomMode = () => setIsActive((prev) => !prev)

  // WizardChat state
  const [chatOpen, setChatOpen] = useState(false)
  const [ceremonyOpen, setCeremonyOpen] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [injectedLine, setInjectedLine] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null)

  // Detect mobile vs desktop after mount
  useEffect(() => {
    setIsMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    } else if (fallback) {
      setCeremonyOpen(true)
    } else {
      setChatOpen(true)
    }
  }

  // Called when wizard walk-off animation completes
  const handleExitComplete = () => {
    setIsExiting(false)
    setShowWizard(false)
    setIsLoading(false)
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

  // Main effect - handles both desktop and mobile
  useEffect(() => {
    const target = document.getElementById('shroom-target')
    const warp = document.getElementById('shroom-warp')
    if (!isActive || !target || !warp) return

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    if (isMobile) {
      // Mobile: CSS transforms + hue-rotate animation (all handled by CSS class)
      target.classList.add('shroom-active', 'shroom-mobile')
      return () => target.classList.remove('shroom-active', 'shroom-mobile')
    }

    // Desktop: the hue cycle runs on the outer wrapper as a compositor-friendly
    // Web Animation; the SVG displacement warp runs on the inner wrapper.
    const turbulence = turbulenceRef.current
    const displacement = displacementRef.current
    if (!turbulence || !displacement) return

    const hue = target.animate(HUE_KEYFRAMES, {
      duration: HUE_BASE_DURATION_MS,
      iterations: Infinity,
    })
    warp.style.filter = 'url(#shroom-filter)'

    const startTime = performance.now()
    let lastFrame = startTime
    let lastWarpUpdate = -Infinity
    let seed = 0
    let frameId = 0

    const animate = (now: number) => {
      const progress = Math.min(1, (now - startTime) / RAMP_UP_MS)
      // Seed speed ramps from 0.1 to 0.8 per 60Hz frame, independent of refresh rate
      seed += (0.1 + progress * 0.7) * ((now - lastFrame) / (1000 / 60))
      lastFrame = now

      if (now - lastWarpUpdate >= WARP_UPDATE_MS) {
        lastWarpUpdate = now
        displacement.setAttribute('scale', String(progress * MAX_DISPLACEMENT))
        turbulence.setAttribute('seed', String(Math.round(seed)))
        // Wider ripples - lower base frequency
        const baseFreq = 0.003 + progress * 0.004 + Math.sin(seed * 0.015) * 0.002
        turbulence.setAttribute('baseFrequency', String(baseFreq))
        // Hue cycle speeds up as the trip intensifies (6s down to 2s);
        // updatePlaybackRate keeps the current hue so there's no jump
        const rate = HUE_BASE_DURATION_MS / (6000 - progress * 4000)
        if (Math.abs(hue.playbackRate - rate) > 0.05) hue.updatePlaybackRate(rate)
      }

      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      hue.cancel()
      warp.style.filter = ''
      displacement.setAttribute('scale', '0')
    }
  }, [isActive, isMobile])

  return (
    <>
      {/* SVG Filter Definition - Only rendered on desktop */}
      {isMounted && !isMobile && (
        <svg className="absolute w-0 h-0" aria-hidden="true">
          <defs>
            <filter id="shroom-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                ref={turbulenceRef}
                type="fractalNoise"
                baseFrequency="0.008"
                numOctaves="3"
                seed="0"
                result="noise"
              />
              <feDisplacementMap
                ref={displacementRef}
                in="SourceGraphic"
                in2="noise"
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* Mushroom Icon - shown when wizard is hidden OR when loading (shows spinner) */}
      <AnimatePresence>
        {((!showWizard && !isActive) || isLoading) && (
          <motion.button
            className="fixed bottom-16 right-4 md:bottom-24 md:right-6 z-40 w-11 h-11 md:w-14 md:h-14 rounded-full bg-card border-2 border-secondary/50 flex items-center justify-center hover:border-secondary transition-shadow duration-300"
            style={{
              boxShadow: '0 0 8px hsl(var(--secondary) / 0.5), 0 0 15px hsl(var(--secondary) / 0.25), 0 0 22px hsl(var(--secondary) / 0.15)',
            }}
            onClick={() => {
              setIsLoading(true)
              setShowWizard(true)
            }}
            // Warm the 3D chunk + model before the click lands
            onPointerEnter={() => void loadShroomWizard3D()}
            onFocus={() => void loadShroomWizard3D()}
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
            showModal={ceremonyOpen && fallback}
            onConfirm={() => {
              toggleShroomMode()
              setCeremonyOpen(false)
            }}
            onCancel={() => setCeremonyOpen(false)}
            onLoaded={handleWizardLoaded}
            isExiting={isExiting}
            onExitComplete={handleExitComplete}
            onEnterComplete={handleEnterComplete}
          />
        </div>
      )}

      {/* WizardChat HUD panel */}
      <AnimatePresence>
        {chatOpen && (
          <WizardChat
            onClose={() => setChatOpen(false)}
            onFallback={() => setFallback(true)}
            onOfferMushroom={() => setCeremonyOpen(true)}
            injectedLine={injectedLine}
            onInjectedLineConsumed={() => setInjectedLine(null)}
          />
        )}
      </AnimatePresence>

      {/* Centered ceremony modal */}
      <AnimatePresence>
        {ceremonyOpen && !fallback && (
          <MushroomOfferBubble
            position="centered"
            text="You want to eat mushroom?"
            onConfirm={() => {
              toggleShroomMode()
              setInjectedLine(pickRandom(TRIUMPH_LINES))
              setCeremonyOpen(false)
            }}
            onCancel={() => {
              setInjectedLine(pickRandom(DECLINE_LINES))
              setCeremonyOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* X button to dismiss wizard / exit shroom mode */}
      <AnimatePresence>
        {(showWizard || isActive) && !isExiting && !isLoading && (
          <motion.button
            className="fixed bottom-16 right-4 md:bottom-24 md:right-6 z-40 w-11 h-11 md:w-14 md:h-14 rounded-full bg-card border-2 border-destructive/50 flex items-center justify-center hover:border-destructive hover:bg-destructive/20 transition-colors"
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
