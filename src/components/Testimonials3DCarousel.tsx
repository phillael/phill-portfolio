'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Center } from '@react-three/drei'
import { useReducedMotion, motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { testimonials } from '@/data/testimonials'
import {
  COLORS,
  FONTS,
  drawGradientBackground,
  drawCardBorder,
  drawText,
  drawWrappedText,
  drawImage,
  loadImage,
  waitForFonts,
} from '@/lib/canvas-utils'
import type { Testimonial } from '@/types/testimonial'

// Canvas dimensions - taller cards with larger fonts for better readability
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 1330
const PADDING = 60

/**
 * Gap between carousel panels
 */
const GAP = 0.12

/**
 * Rotation speed for auto-rotate
 */
const AUTO_ROTATE_SPEED = 0.003

/**
 * Drag sensitivity
 */
const DRAG_SENSITIVITY = 0.004

/**
 * Render a testimonial to canvas with larger text
 */
async function renderTestimonialCanvas(testimonial: Testimonial): Promise<HTMLCanvasElement> {
  await waitForFonts()

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Background
  drawGradientBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Card border with glow
  drawCardBorder(ctx, 12, 12, CANVAS_WIDTH - 24, CANVAS_HEIGHT - 24, COLORS.primary, 16)

  // Avatar in upper left corner
  const avatarSize = 154
  const avatarX = PADDING
  const avatarY = PADDING + 20

  let avatarImg: HTMLImageElement | null = null
  try {
    avatarImg = await loadImage(testimonial.image)

    // Draw multiple glow layers for extreme cyberpunk effect
    const centerX = avatarX + avatarSize / 2
    const centerY = avatarY + avatarSize / 2
    const radius = avatarSize / 2

    // Outer glow layers
    ctx.save()
    ctx.shadowColor = COLORS.primary
    ctx.shadowBlur = 60
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2)
    ctx.strokeStyle = COLORS.primary
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.shadowBlur = 40
    ctx.stroke()
    ctx.shadowBlur = 20
    ctx.stroke()
    ctx.restore()

    drawImage(ctx, avatarImg, {
      x: avatarX,
      y: avatarY,
      width: avatarSize,
      height: avatarSize,
      circular: true,
      borderColor: COLORS.primary,
      borderWidth: 6,
      glow: { color: COLORS.primary, blur: 50 },
    })
  } catch {
    // Fallback initial
    ctx.fillStyle = COLORS.backgroundGradientEnd
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowColor = COLORS.primary
    ctx.shadowBlur = 40
    ctx.strokeStyle = COLORS.primary
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.fillStyle = COLORS.text
    ctx.font = `36px ${FONTS.heading}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(testimonial.name.charAt(0), avatarX + avatarSize / 2, avatarY + avatarSize / 2)
  }

  // Text wrap around avatar - custom word wrapping
  const bodyTextWithQuotes = `"${testimonial.body}"`
  const fontSize = 34
  const lineHeight = 50
  const avatarRightEdge = avatarX + avatarSize + 25
  const avatarBottomEdge = avatarY + avatarSize + 15
  const fullWidth = CANVAS_WIDTH - PADDING * 2
  const wrappedWidth = CANVAS_WIDTH - PADDING - avatarRightEdge

  ctx.font = `${fontSize}px ${FONTS.body}`
  ctx.fillStyle = COLORS.text
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  // Split text into words
  const words = bodyTextWithQuotes.split(' ')
  let currentLine = ''
  let currentY = PADDING + 30
  let totalTextHeight = 0

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? ' ' : '') + words[i]
    const isNextToAvatar = currentY < avatarBottomEdge
    const maxWidth = isNextToAvatar ? wrappedWidth : fullWidth
    const startX = isNextToAvatar ? avatarRightEdge : PADDING

    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && currentLine) {
      // Draw current line
      ctx.fillText(currentLine, startX, currentY)
      currentLine = words[i]
      currentY += lineHeight
      totalTextHeight += lineHeight
    } else {
      currentLine = testLine
    }
  }

  // Draw remaining text
  if (currentLine) {
    const isNextToAvatar = currentY < avatarBottomEdge
    const startX = isNextToAvatar ? avatarRightEdge : PADDING
    ctx.fillText(currentLine, startX, currentY)
    totalTextHeight += lineHeight
  }

  // Author section at bottom
  const authorY = Math.max(currentY + lineHeight + 40, CANVAS_HEIGHT - 160)

  // Divider line
  ctx.strokeStyle = `${COLORS.primary}50`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PADDING, authorY - 20)
  ctx.lineTo(CANVAS_WIDTH - PADDING, authorY - 20)
  ctx.stroke()

  // Name - no glow for better readability
  drawText(ctx, testimonial.name, PADDING, authorY, {
    font: FONTS.heading,
    size: 40,
    color: COLORS.primary,
  })

  // Position
  drawText(ctx, testimonial.position, PADDING, authorY + 50, {
    font: FONTS.body,
    size: 26,
    color: '#b0b0b0',
  })

  // Date
  drawText(ctx, testimonial.date, PADDING, authorY + 85, {
    font: FONTS.body,
    size: 24,
    color: '#a0a0a0',
  })

  return canvas
}

/**
 * Preload and cache PBR textures at module level
 * This ensures textures are loaded when the page loads, not when carousel expands
 */
let pbrTexturesCache: {
  normal: THREE.Texture | null
  roughness: THREE.Texture | null
  metalness: THREE.Texture | null
} = { normal: null, roughness: null, metalness: null }

function preloadPBRTextures() {
  if (pbrTexturesCache.normal) return pbrTexturesCache

  const loader = new THREE.TextureLoader()
  const normal = loader.load('/textures/rusty_metal_04_nor_gl_1k.jpg')
  const roughness = loader.load('/textures/rusty_metal_04_rough_1k.jpg')
  const metalness = loader.load('/textures/rusty_metal_04_metal_1k.jpg')

  ;[normal, roughness, metalness].forEach(tex => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(2, 3)
  })

  pbrTexturesCache = { normal, roughness, metalness }
  return pbrTexturesCache
}

// Start preloading immediately when module loads
if (typeof window !== 'undefined') {
  preloadPBRTextures()
}

/**
 * Individual carousel panel
 */
interface CarouselPanelProps {
  texture: THREE.CanvasTexture
  radius: number
  thetaStart: number
  thetaLength: number
}

const CarouselPanel = ({ texture, radius, thetaStart, thetaLength }: CarouselPanelProps) => {
  const geometry = useMemo(() => {
    return new THREE.CylinderGeometry(
      radius,
      radius,
      1, // Keep at 1 to match canvas aspect ratio
      36, // More segments for smoother curve
      1,
      true,
      0,
      thetaLength
    )
  }, [radius, thetaLength])

  // Get preloaded PBR textures
  const { normal: normalMap, roughness: roughnessMap, metalness: metalnessMap } = preloadPBRTextures()

  return (
    <mesh geometry={geometry} rotation={[0, thetaStart, 0]}>
      <meshStandardMaterial
        map={texture}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.3, 0.3)}
        roughnessMap={roughnessMap}
        roughness={0.6}
        metalnessMap={metalnessMap}
        metalness={0.4}
        side={THREE.DoubleSide}
        transparent
        envMapIntensity={0.5}
      />
    </mesh>
  )
}

/**
 * The rotating carousel group - free rotation with drag
 */
interface CarouselGroupProps {
  textures: THREE.CanvasTexture[]
  isAutoRotating: boolean
}

const CarouselGroup = ({ textures, isAutoRotating }: CarouselGroupProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const isDragging = useRef(false)
  const previousX = useRef(0)
  const currentRotation = useRef(0)
  const velocity = useRef(0)

  const numPanels = textures.length
  const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT

  // Calculate panel positions
  const panelData = useMemo(() => {
    const ratioWithGap = aspectRatio + GAP
    const totalLength = ratioWithGap * numPanels
    const radius = totalLength / (Math.PI * 2)
    const anglePerPanel = (Math.PI * 2) / numPanels

    return { radius, totalLength, anglePerPanel, ratioWithGap }
  }, [numPanels, aspectRatio])

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

    if (isDragging.current) return

    // Apply momentum decay after drag (smooth deceleration)
    if (Math.abs(velocity.current) > 0.0001) {
      velocity.current *= 0.95
      currentRotation.current += velocity.current
      groupRef.current.rotation.y = currentRotation.current
    } else if (isAutoRotating) {
      // Slow auto rotate when not dragging
      currentRotation.current += AUTO_ROTATE_SPEED
      groupRef.current.rotation.y = currentRotation.current
    }
  })

  return (
    <group ref={groupRef}>
      {textures.map((texture, index) => {
        const thetaLength = aspectRatio / panelData.radius
        const thetaStart = index * panelData.anglePerPanel

        return (
          <CarouselPanel
            key={index}
            texture={texture}
            radius={panelData.radius}
            thetaStart={thetaStart}
            thetaLength={thetaLength}
          />
        )
      })}
    </group>
  )
}

/**
 * Cyberpunk Neon Lighting
 * Multiple colored lights positioned to create neon sign reflection effect
 */
const CyberpunkLighting = () => (
  <>
    {/* Soft ambient for base visibility */}
    <ambientLight intensity={1} />

    {/* Neon Cyan - soft main light from right side */}
    <pointLight
      position={[6, 0, 2]}
      intensity={20}
      color="#00ffff"
      distance={25}
      decay={1.5}
    />

    {/* Neon Magenta - soft accent from top-left */}
    <pointLight
      position={[-5, 3, 2]}
      intensity={20}
      color="#ff00ff"
      distance={20}
      decay={1.5}
    />

    {/* Neon Green - subtle from below */}
    <pointLight
      position={[0, -3, 2]}
      intensity={80}
      color="#00ff88"
      distance={10}
      decay={2}
    />

    {/* Warm accent from back for depth */}
    <pointLight
      position={[0, 2, -4]}
      intensity={20}
      color="#ff6600"
      distance={8}
      decay={2}
    />
  </>
)

/**
 * Forces canvas to remeasure on mount - fixes initial sizing issue
 */
const ResizeFix = () => {
  const { gl, setSize } = useThree()

  useEffect(() => {
    // Get the actual container dimensions and force resize
    const container = gl.domElement.parentElement
    if (container) {
      const { clientWidth, clientHeight } = container
      if (clientWidth > 0 && clientHeight > 0) {
        setSize(clientWidth, clientHeight)
      }
    }
  }, [gl, setSize])

  return null
}

/**
 * 3D Testimonials Carousel Component
 * Compact preview that expands to fullscreen on click
 */
const Testimonials3DCarousel = () => {
  const [textures, setTextures] = useState<THREE.CanvasTexture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Generate textures
  useEffect(() => {
    let mounted = true

    const loadTextures = async () => {
      try {
        setIsLoading(true)
        const canvases = await Promise.all(
          testimonials.map((t) => renderTestimonialCanvas(t))
        )

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
        console.error('Failed to load testimonial textures:', err)
        setIsLoading(false)
      }
    }

    loadTextures()

    return () => {
      mounted = false
    }
  }, [])

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      textures.forEach((tex) => tex.dispose())
    }
  }, [textures])

  // Handle escape key to close expanded view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isExpanded])

  // Fallback for reduced motion
  if (shouldReduceMotion) {
    return (
      <div className="mt-8 text-center">
        <p className="text-foreground/70 text-sm">Testimonials available (motion reduced)</p>
      </div>
    )
  }

  const handleExpand = () => {
    setIsExpanded(true)
    setIsAutoRotating(false)
  }

  const handleClose = () => {
    setIsExpanded(false)
    setIsAutoRotating(true)
  }

  // Shared canvas component
  const CarouselCanvas = ({ isPreview = false }: { isPreview?: boolean }) => (
    <Canvas
      camera={{ position: [0, 0, isPreview ? 3.8 : 1.8], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      resize={{ debounce: 0 }}
    >
      <ResizeFix />
      <CyberpunkLighting />
      <Center>
        <CarouselGroup
          textures={textures}
          isAutoRotating={isAutoRotating}
        />
      </Center>
    </Canvas>
  )

  return (
    <>
      {/* Compact Preview - clickable to expand */}
      <div className="mt-8 flex flex-col items-center">
        <button
          onClick={handleExpand}
          className="group relative w-[280px] h-[180px] md:w-[320px] md:h-[200px] rounded-lg border-2 border-primary/30 overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Click to expand testimonials carousel"
        >
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card/50">
              <div className="text-primary animate-pulse text-sm">Loading...</div>
            </div>
          ) : textures.length > 0 ? (
            <div className="w-full h-full" onPointerDown={(e) => e.stopPropagation()}>
              <CarouselCanvas isPreview />
            </div>
          ) : null}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-primary font-heading text-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              View Testimonials
            </span>
          </div>
        </button>

        <p className="text-foreground/40 text-xs mt-2">Click to expand</p>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
            onClick={handleClose}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary/50 bg-card/80 text-primary transition-all duration-150 hover:border-primary hover:bg-primary/10 hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close testimonials"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* ARIA description for screen readers */}
            <div className="sr-only">
              Interactive 3D carousel showing {testimonials.length} testimonials from colleagues.
              Drag left or right to rotate and view different testimonials.
              Press Escape or click the close button to exit.
            </div>

            {/* Fullscreen Canvas */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="w-[95vw] h-[75vh] md:w-[85vw] md:h-[75vh] pointer-events-auto"
                onPointerDown={() => setIsAutoRotating(false)}
              >
                {textures.length > 0 && <CarouselCanvas />}
              </div>

              {/* Instruction */}
              <p className="text-foreground/50 text-sm mt-4 pointer-events-auto">
                Drag to rotate • Press Escape to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Testimonials3DCarousel
