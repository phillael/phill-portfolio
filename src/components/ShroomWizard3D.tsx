'use client'

import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, useCursor } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import TypingText from './TypingText'
import * as THREE from 'three'

// Animation names - CORRECTED MAPPING
// 0: All_Night_Dance = Spell Cast ✓
// 1: Boom_Dance = Boom Dance ✓
// 2: Bubble_Dance = Bubble Dance ✓
// 3: Combat_Stance = Combat Stance
// 4: Hip_Hop_Dance_3 = Idle ✓
// 5: Idle_13 = Run
// 6: Magic_Genie = Magic Genie ✓
// 7: Proud_Strut = Hip Hop Dance ✓
// 8: Running = All Night Dance ✓
// 9: Walking = Proud Strut ✓
// 10: mage_soell_cast_3 = Walking

const ANIMS = {
  IDLE: 'Hip_Hop_Dance_3',    // Index 4 - actually idle
  SPELL: 'All_Night_Dance',   // Index 0 - actually spell cast
  WALK: 'Walking',            // Index 9 - proud strut animation
  DANCES: [
    'Boom_Dance',      // Index 1 - boom dance
    'Bubble_Dance',    // Index 2 - bubble dance
    'Magic_Genie',     // Index 6 - magic genie
    'Proud_Strut',     // Index 7 - actually hip hop dance
    'Running',         // Index 8 - actually all night dance
  ],
}

// TEST MODE - set to true to enable animation cycling
const TEST_MODE = false

const ALL_ANIMS = [
  'All_Night_Dance',    // 0
  'Boom_Dance',         // 1
  'Bubble_Dance',       // 2
  'Combat_Stance',      // 3
  'Hip_Hop_Dance_3',    // 4
  'Idle_13',            // 5
  'Magic_Genie',        // 6
  'Proud_Strut',        // 7
  'Running',            // 8
  'Walking',            // 9
  'mage_soell_cast_3',  // 10
]

interface WizardModelProps {
  isActive: boolean
  onSpellComplete?: () => void
  testAnimIndex?: number
  onClick?: () => void
  onLoaded?: () => void
  isWalking?: boolean
  isExiting?: boolean
}

function WizardModel({ isActive, onSpellComplete, testAnimIndex = 0, onClick, onLoaded, isWalking = false, isExiting = false }: WizardModelProps) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF('/models/shroom_wizard_merged_animations.glb')
  const { actions } = useAnimations(animations, group)
  const [hovered, setHovered] = useState(false)

  // Use Drei's useCursor hook for clean cursor management
  useCursor(hovered, 'pointer', 'auto')

  // Notify parent when model is loaded
  useEffect(() => {
    if (scene) {
      onLoaded?.()
    }
  }, [scene, onLoaded])

  const currentAnimRef = useRef<string>('')

  // Crossfade animation duration
  const FADE_DURATION = 0.3

  // Play an animation with smooth crossfade transition
  const playAnimation = (name: string) => {
    const action = actions[name]
    if (!action) {
      console.warn('Animation not found:', name)
      return
    }

    // Skip if already playing this animation
    if (currentAnimRef.current === name) return

    // Fade out all other animations
    Object.entries(actions).forEach(([animName, a]) => {
      if (a && animName !== name) {
        a.fadeOut(FADE_DURATION)
      }
    })

    // Reset and fade in the new animation
    action.reset()
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.fadeIn(FADE_DURATION).play()
    currentAnimRef.current = name
  }

  // TEST MODE: Play animation based on index
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return
    if (!TEST_MODE) return

    const animName = ALL_ANIMS[testAnimIndex]
    if (animName) {
      playAnimation(animName)
    }
  }, [testAnimIndex, actions])

  // NORMAL MODE: Handle animations based on isActive and isWalking
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return
    if (TEST_MODE) return // Skip in test mode

    // Walking takes priority
    if (isWalking) {
      playAnimation(ANIMS.WALK)
      return
    }

    if (isActive) {
      // Play spell cast, then dance after 5 seconds
      playAnimation(ANIMS.SPELL)
      setTimeout(() => {
        const randomDance = ANIMS.DANCES[Math.floor(Math.random() * ANIMS.DANCES.length)]
        playAnimation(randomDance)
      }, 5000)
    } else {
      // Return to idle
      playAnimation(ANIMS.IDLE)
    }
  }, [isActive, isWalking, actions])

  // Track target rotation for smooth interpolation
  const targetRotationRef = useRef(Math.PI * 0.25)

  // Gentle floating + rotation animation
  useFrame((state, delta) => {
    if (group.current) {
      // Floating
      const floatSpeed = isActive ? 2 : 0.8
      const floatAmount = isActive ? 0.1 : 0.05
      group.current.position.y = Math.sin(state.clock.elapsedTime * floatSpeed) * floatAmount - 1.2

      // Rotation behavior depends on state
      if (isExiting) {
        // When exiting: face left (negative direction) to walk off screen
        targetRotationRef.current = -Math.PI * 0.75 // -135 degrees (facing left)
      } else if (isWalking) {
        // When entering: face right (positive direction) to walk onto screen
        targetRotationRef.current = Math.PI * 0.75 // 135 degrees (facing right)
      } else {
        // Normal idle/active state: gentle oscillation facing forward
        const baseRotation = Math.PI * 0.25 // 45 degrees - face more center
        const rotationSpeed = (2 * Math.PI) / 20 // Full cycle in 20 seconds
        const oscillation = Math.sin(state.clock.elapsedTime * rotationSpeed) * (Math.PI * 0.2) // ±36 degrees
        targetRotationRef.current = baseRotation + oscillation
      }

      // Smoothly interpolate to target rotation
      const lerpSpeed = 5 // Higher = faster rotation
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        targetRotationRef.current,
        delta * lerpSpeed
      )
    }
  })

  return (
    <group ref={group} dispose={null}>
      <primitive
        object={scene}
        scale={1.3}
        position={[0, 0, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  )
}

interface ShroomWizard3DProps {
  onClick?: () => void
  isActive?: boolean
  showModal?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  onLoaded?: () => void
  isExiting?: boolean
  onExitComplete?: () => void
}

const WALK_DURATION = 1.5 // seconds for walk on/off animation

const ShroomWizard3D = ({ onClick, isActive = false, showModal = false, onConfirm, onCancel, onLoaded, isExiting = false, onExitComplete }: ShroomWizard3DProps) => {
  const [hasError, setHasError] = useState(false)
  const [testAnimIndex, setTestAnimIndex] = useState(0)
  const [isEntering, setIsEntering] = useState(true) // Start in entering state
  const [modelLoaded, setModelLoaded] = useState(false)

  const nextAnim = () => setTestAnimIndex((i) => (i + 1) % ALL_ANIMS.length)
  const prevAnim = () => setTestAnimIndex((i) => (i - 1 + ALL_ANIMS.length) % ALL_ANIMS.length)

  // Handle model loaded - start walk-on animation
  const handleModelLoaded = () => {
    setModelLoaded(true)
    onLoaded?.()
    // After walk duration, stop entering state
    setTimeout(() => {
      setIsEntering(false)
    }, WALK_DURATION * 1000)
  }

  // Determine if wizard should be walking
  const isWalking = isEntering || isExiting

  if (hasError) {
    return (
      <button
        className="fixed bottom-4 left-4 z-50 w-14 h-14 rounded-full bg-card border-2 border-secondary/50 flex items-center justify-center text-2xl"
        onClick={onClick}
      >
        {isActive ? '💊' : '🍄'}
      </button>
    )
  }

  // Calculate positions - off-screen is far left, on-screen is normal position
  const offScreenLeft = -300 // px - fully off screen
  const onScreenLeftMobile = -41 // px - normal position
  const onScreenLeftDesktop = -49 // px - normal position

  return (
    <motion.div
      className="fixed bottom-0 z-50"
      style={{ filter: 'none' }}
      initial={{ left: offScreenLeft }}
      animate={{
        left: isExiting ? offScreenLeft : (typeof window !== 'undefined' && window.innerWidth >= 768 ? onScreenLeftDesktop : onScreenLeftMobile)
      }}
      transition={{
        duration: WALK_DURATION,
        ease: 'easeInOut'
      }}
      onAnimationComplete={() => {
        if (isExiting) {
          onExitComplete?.()
        }
      }}
    >
      {/* Test Mode Controls */}
      {TEST_MODE && (
        <div className="absolute -top-24 left-0 bg-card/95 border border-primary/50 rounded-lg p-2 text-xs font-mono z-50 min-w-[200px]">
          <div className="text-primary mb-1">TEST MODE</div>
          <div className="text-foreground mb-2">
            [{testAnimIndex}] {ALL_ANIMS[testAnimIndex]}
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevAnim}
              className="px-3 py-1 bg-muted hover:bg-muted/80 rounded text-foreground"
            >
              ← Prev
            </button>
            <button
              onClick={nextAnim}
              className="px-3 py-1 bg-muted hover:bg-muted/80 rounded text-foreground"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Wizard Canvas - responsive sizing */}
      <div
        className="w-[192px] h-[144px] md:w-[360px] md:h-[280px]"
        role="button"
        aria-label={isActive ? 'Click to exit Shroom Mode' : 'Click the wizard to enter Shroom Mode'}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!TEST_MODE) onClick?.()
          }
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          style={{ background: 'transparent', cursor: 'inherit' }}
          gl={{ alpha: true, antialias: true }}
          onError={() => setHasError(true)}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-3, 2, 2]} intensity={0.5} color="#00ffff" />
          <pointLight position={[3, 2, -2]} intensity={0.5} color="#ff00ff" />

          <Suspense fallback={null}>
            <WizardModel
              isActive={isActive}
              testAnimIndex={testAnimIndex}
              onClick={TEST_MODE ? undefined : onClick}
              onLoaded={handleModelLoaded}
              isWalking={isWalking}
              isExiting={isExiting}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Speech Bubble - positioned relative to wizard */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop - click to dismiss */}
            <motion.div
              className="fixed inset-0 z-[100]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCancel}
            />
            {/* Speech bubble positioned above wizard */}
            <motion.div
              className="absolute bottom-full left-[60px] md:left-[80px] mb-2 w-[220px] md:w-[320px] z-[101]"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              style={{ filter: 'none' }}
            >
              {/* Bubble */}
              <div
                className="relative p-3 md:p-4 rounded-2xl bg-card border-2 border-secondary/50"
                style={{
                  boxShadow: '0 0 20px hsl(var(--secondary) / 0.4), 0 0 40px hsl(var(--secondary) / 0.2)',
                }}
              >
                {/* Speech bubble tail - pointing down toward wizard */}
                <div
                  className="absolute -bottom-3 left-12 md:left-16 w-0 h-0"
                  style={{
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '12px solid hsl(var(--card))',
                    filter: 'drop-shadow(0 2px 4px hsl(var(--secondary) / 0.3))',
                  }}
                />
                <div
                  className="absolute -bottom-[14px] left-12 md:left-16 w-0 h-0"
                  style={{
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '12px solid hsl(var(--secondary) / 0.5)',
                    zIndex: -1,
                  }}
                />

                <p className="font-heading text-sm md:text-lg text-secondary mb-3 md:mb-4">
                  <TypingText
                    text="You want to eat mushroom?"
                    speed={40}
                    showCursor={true}
                  />
                </p>
                <div className="flex gap-2 md:gap-3 justify-center">
                  <motion.button
                    className="px-3 md:px-4 py-1 md:py-1.5 rounded-md bg-muted text-foreground font-heading text-xs md:text-sm hover:bg-muted/80 transition-colors"
                    onClick={onCancel}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Ummm...no
                  </motion.button>
                  <motion.button
                    className="px-3 md:px-4 py-1 md:py-1.5 rounded-md bg-secondary text-background font-heading font-bold text-xs md:text-sm hover:bg-secondary/80 transition-colors"
                    style={{
                      boxShadow: '0 0 10px hsl(var(--secondary) / 0.5)',
                    }}
                    onClick={onConfirm}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sure!
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Preload the model so it's ready when the user clicks the shroom icon
useGLTF.preload('/models/shroom_wizard_merged_animations.glb')

export default ShroomWizard3D
