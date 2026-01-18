'use client'

import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, useCursor } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
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
}

function WizardModel({ isActive, onSpellComplete, testAnimIndex = 0, onClick }: WizardModelProps) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF('/models/shroom_wizard_merged_animations.glb')
  const { actions } = useAnimations(animations, group)
  const [hovered, setHovered] = useState(false)

  // Use Drei's useCursor hook for clean cursor management
  useCursor(hovered, 'pointer', 'auto')

  const currentAnimRef = useRef<string>('')

  // Play an animation
  const playAnimation = (name: string) => {
    const action = actions[name]
    if (!action) {
      console.warn('Animation not found:', name)
      return
    }

    // Stop all animations
    Object.values(actions).forEach(a => a?.stop())

    action.reset()
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.play()
    currentAnimRef.current = name

    console.log('Playing animation:', name)
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

  // NORMAL MODE: Handle animations based on isActive
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return
    if (TEST_MODE) return // Skip in test mode

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
  }, [isActive, actions])

  // Gentle floating + slow rotation animation
  useFrame((state) => {
    if (group.current) {
      // Floating
      const floatSpeed = isActive ? 2 : 0.8
      const floatAmount = isActive ? 0.1 : 0.05
      group.current.position.y = Math.sin(state.clock.elapsedTime * floatSpeed) * floatAmount - 1.2

      // Slow rotation: Base rotation to face forward + gentle oscillation
      const baseRotation = Math.PI * 0.25 // 45 degrees - face more center
      const rotationSpeed = (2 * Math.PI) / 20 // Full cycle in 20 seconds
      const oscillation = Math.sin(state.clock.elapsedTime * rotationSpeed) * (Math.PI * 0.2) // ±36 degrees
      group.current.rotation.y = baseRotation + oscillation
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
}

const ShroomWizard3D = ({ onClick, isActive = false, showModal = false, onConfirm, onCancel }: ShroomWizard3DProps) => {
  const [hasError, setHasError] = useState(false)
  const [testAnimIndex, setTestAnimIndex] = useState(0)

  const nextAnim = () => setTestAnimIndex((i) => (i + 1) % ALL_ANIMS.length)
  const prevAnim = () => setTestAnimIndex((i) => (i - 1 + ALL_ANIMS.length) % ALL_ANIMS.length)

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

  return (
    <div
      className="fixed bottom-0 -left-[41px] md:-left-[49px] z-50"
      style={{ filter: 'none' }}
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
                  You want to go on a journey with me?
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
                    className="px-3 md:px-4 py-1 md:py-1.5 rounded-md bg-secondary text-secondary-foreground font-heading text-xs md:text-sm hover:bg-secondary/80 transition-colors"
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
    </div>
  )
}

export default ShroomWizard3D
