'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'
import * as THREE from 'three'
import { testimonials } from '@/data/testimonials'
import { generateAllSlides } from '@/lib/carousel-slides'
import AnimatedSection from '@/components/AnimatedSection'
import GlitchText from '@/components/GlitchText'

/**
 * Gap between carousel panels (in the same units as panel width ratio)
 */
const GAP = 0.15

/**
 * Rotation speed for auto-rotate (radians per frame)
 */
const AUTO_ROTATE_SPEED = 0.002

/**
 * Drag sensitivity multiplier
 */
const DRAG_SENSITIVITY = 0.005

/**
 * Individual carousel panel (cylinder segment)
 */
interface CarouselPanelProps {
  texture: THREE.CanvasTexture
  radius: number
  thetaStart: number
  thetaLength: number
  index: number
}

const CarouselPanel = ({ texture, radius, thetaStart, thetaLength, index }: CarouselPanelProps) => {
  const meshRef = useRef<THREE.Mesh>(null)

  // Create cylinder geometry for this panel
  const geometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(
      radius,
      radius,
      1, // height
      32, // radial segments - more for smoother curve
      1, // height segments
      true, // open ended
      0, // theta start (we'll rotate the mesh instead)
      thetaLength
    )
    return geo
  }, [radius, thetaLength])

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      rotation={[0, thetaStart, 0]}
    >
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  )
}

/**
 * The rotating carousel group
 */
interface CarouselGroupProps {
  textures: THREE.CanvasTexture[]
  autoRotate: boolean
  targetRotation: number
  onRotationChange: (rotation: number) => void
}

const CarouselGroup = ({ textures, autoRotate, targetRotation, onRotationChange }: CarouselGroupProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const isDragging = useRef(false)
  const previousX = useRef(0)
  const currentRotation = useRef(0)
  const velocity = useRef(0)

  // Calculate panel dimensions and positions
  const panelData = useMemo(() => {
    // All panels have the same aspect ratio (800/500 = 1.6)
    const aspectRatio = 800 / 500
    let totalLength = 0

    const panels = textures.map((_, index) => {
      const ratioWithGap = aspectRatio + GAP
      const start = totalLength
      totalLength += ratioWithGap
      return { start, ratio: aspectRatio, ratioWithGap }
    })

    const radius = totalLength / (Math.PI * 2)

    return { panels, radius, totalLength }
  }, [textures])

  // Handle mouse/touch drag
  useEffect(() => {
    const canvas = gl.domElement

    const handlePointerDown = (e: PointerEvent) => {
      isDragging.current = true
      previousX.current = e.clientX
      velocity.current = 0
      canvas.style.cursor = 'grabbing'
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return

      const deltaX = e.clientX - previousX.current
      velocity.current = deltaX * DRAG_SENSITIVITY
      currentRotation.current += velocity.current
      previousX.current = e.clientX

      if (groupRef.current) {
        groupRef.current.rotation.y = currentRotation.current
      }
    }

    const handlePointerUp = () => {
      isDragging.current = false
      canvas.style.cursor = 'grab'
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    canvas.style.cursor = 'grab'

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [gl])

  // Animation loop
  useFrame(() => {
    if (!groupRef.current) return

    if (isDragging.current) {
      // Already handled in pointer move
      return
    }

    // Apply momentum decay
    if (Math.abs(velocity.current) > 0.0001) {
      velocity.current *= 0.95
      currentRotation.current += velocity.current
      groupRef.current.rotation.y = currentRotation.current
    } else if (autoRotate) {
      // Auto rotate when not dragging and no momentum
      currentRotation.current += AUTO_ROTATE_SPEED
      groupRef.current.rotation.y = currentRotation.current
    }

    // Smooth interpolation to target rotation (when using nav buttons)
    if (targetRotation !== 0) {
      const diff = targetRotation - currentRotation.current
      if (Math.abs(diff) > 0.01) {
        currentRotation.current += diff * 0.05
        groupRef.current.rotation.y = currentRotation.current
      }
    }

    onRotationChange(currentRotation.current)
  })

  return (
    <group ref={groupRef}>
      {textures.map((texture, index) => {
        const panel = panelData.panels[index]
        const thetaLength = panel.ratio / panelData.radius
        const thetaStart = (panel.start / panelData.totalLength) * Math.PI * 2

        return (
          <CarouselPanel
            key={index}
            texture={texture}
            radius={panelData.radius}
            thetaStart={thetaStart}
            thetaLength={thetaLength}
            index={index}
          />
        )
      })}
    </group>
  )
}

/**
 * Cyberpunk ambient lighting
 */
const CyberpunkLighting = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={100} color="#00ffff" />
      <pointLight position={[-10, -10, 10]} intensity={60} color="#ff00ff" />
      <pointLight position={[0, 10, -10]} intensity={40} color="#00ff88" />
    </>
  )
}

/**
 * Main 3D Carousel Component
 */
const About3DCarousel = () => {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [targetRotation, setTargetRotation] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  const totalSlides = 1 + testimonials.length // 1 about + 5 testimonials

  // Generate canvas textures on mount
  useEffect(() => {
    let mounted = true

    const loadTextures = async () => {
      try {
        setIsLoading(true)
        const canvases = await generateAllSlides(testimonials)

        if (!mounted) return

        const texs = canvases.map((canvas) => {
          const tex = new THREE.CanvasTexture(canvas)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.needsUpdate = true
          return tex
        })

        setTextures(texs)
        setIsLoading(false)
      } catch (err) {
        if (!mounted) return
        console.error('Failed to generate carousel textures:', err)
        setError('Failed to load carousel')
        setIsLoading(false)
      }
    }

    loadTextures()

    return () => {
      mounted = false
      // Cleanup textures
      textures.forEach((tex) => tex.dispose())
    }
  }, [])

  // Handle rotation changes to update current slide indicator
  const handleRotationChange = useCallback((rotation: number) => {
    // Calculate which slide is currently facing the camera
    const normalizedRotation = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const slideAngle = (Math.PI * 2) / totalSlides
    const slideIndex = Math.round(normalizedRotation / slideAngle) % totalSlides
    setCurrentSlide(slideIndex)
  }, [totalSlides])

  // Navigate to specific slide
  const navigateToSlide = useCallback((index: number) => {
    const slideAngle = (Math.PI * 2) / totalSlides
    setTargetRotation(index * slideAngle)
    setAutoRotate(false)
  }, [totalSlides])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      navigateToSlide((currentSlide - 1 + totalSlides) % totalSlides)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      navigateToSlide((currentSlide + 1) % totalSlides)
    }
  }, [currentSlide, totalSlides, navigateToSlide])

  // ARIA slide titles
  const slideTitles = [
    'About Me',
    ...testimonials.map((t) => `${t.name}'s Testimonial`),
  ]

  // If reduced motion is preferred, fall back to simple carousel
  if (shouldReduceMotion) {
    // Could render the existing 2D carousel here as fallback
    return (
      <section
        id="about"
        aria-label="About section"
        role="region"
        className="min-h-screen py-20 md:py-32 px-4 md:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-heading mb-8">
            <GlitchText as="span" className="neon-text-purple">About</GlitchText>
          </h2>
          <p className="text-foreground/70">
            3D carousel disabled for reduced motion preference.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      id="about"
      aria-label="About section"
      role="region"
      aria-roledescription="3D carousel"
      className="min-h-screen py-20 md:py-32 px-4 md:px-6 lg:px-8 relative"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ARIA Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Slide {currentSlide + 1} of {totalSlides}: {slideTitles[currentSlide]}
      </div>

      {/* Section Heading */}
      <div className="max-w-4xl mx-auto mb-8">
        <AnimatedSection>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading text-center">
            <GlitchText as="span" className="neon-text-purple">
              About
            </GlitchText>
          </h2>
        </AnimatedSection>
      </div>

      {/* 3D Canvas */}
      <div className="w-full h-[500px] md:h-[600px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-primary animate-pulse">Loading 3D carousel...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-red-500">{error}</div>
          </div>
        )}

        {!isLoading && !error && textures.length > 0 && (
          <Canvas
            camera={{ position: [0, 0.3, 4], fov: 45 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
          >
            <CyberpunkLighting />
            <CarouselGroup
              textures={textures}
              autoRotate={autoRotate}
              targetRotation={targetRotation}
              onRotationChange={handleRotationChange}
            />
          </Canvas>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4 mt-8">
        {/* Previous Button */}
        <button
          onClick={() => navigateToSlide((currentSlide - 1 + totalSlides) % totalSlides)}
          aria-label="Previous slide"
          className="
            flex items-center justify-center
            min-w-[44px] min-h-[44px]
            w-11 h-11
            rounded-full
            border-2 border-primary/50
            bg-card/80 backdrop-blur-sm
            transition-all duration-150
            hover:border-primary hover:bg-primary/10
            hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
          "
        >
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Dot Indicators */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => navigateToSlide(index)}
              aria-label={`Go to slide ${index + 1}: ${slideTitles[index]}`}
              aria-current={currentSlide === index ? 'true' : undefined}
              className={`
                min-w-[44px] min-h-[44px]
                flex items-center justify-center
                transition-transform duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                ${currentSlide !== index ? 'hover:scale-110' : ''}
              `}
            >
              <span
                className={`
                  w-3 h-3 rounded-full
                  transition-all duration-200
                  ${
                    currentSlide === index
                      ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)),0_0_16px_hsl(var(--primary))]'
                      : 'bg-muted hover:bg-muted-foreground/50'
                  }
                `}
              />
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={() => navigateToSlide((currentSlide + 1) % totalSlides)}
          aria-label="Next slide"
          className="
            flex items-center justify-center
            min-w-[44px] min-h-[44px]
            w-11 h-11
            rounded-full
            border-2 border-primary/50
            bg-card/80 backdrop-blur-sm
            transition-all duration-150
            hover:border-primary hover:bg-primary/10
            hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
          "
        >
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Auto-rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          aria-label={autoRotate ? 'Pause auto-rotation' : 'Resume auto-rotation'}
          aria-pressed={autoRotate}
          className={`
            ml-4
            flex items-center justify-center
            min-w-[44px] min-h-[44px]
            w-11 h-11
            rounded-full
            border-2
            bg-card/80 backdrop-blur-sm
            transition-all duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${
              autoRotate
                ? 'border-accent text-accent hover:bg-accent/10'
                : 'border-muted text-muted-foreground hover:border-primary hover:text-primary'
            }
          `}
        >
          {autoRotate ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
      </div>

      {/* Instructions */}
      <p className="text-center text-foreground/50 text-sm mt-4">
        Drag to rotate • Click dots to navigate • Arrow keys to browse
      </p>
    </section>
  )
}

export default About3DCarousel
