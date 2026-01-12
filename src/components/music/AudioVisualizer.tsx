'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'
import type { FrequencyData } from '@/lib/audio-utils'

interface VisualizerSphereProps {
  bass: number
  treble: number
  intensity: number
}

/**
 * Animated sphere that responds to audio frequency data.
 * Uses MeshWobbleMaterial for dynamic wobble effect driven by bass.
 */
const VisualizerSphere = ({ bass, treble, intensity }: VisualizerSphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<typeof MeshWobbleMaterial.prototype>(null)

  // Color interpolation from cyan to magenta based on intensity
  const color = useMemo(() => {
    const cyan = new THREE.Color(0x00ffff)
    const magenta = new THREE.Color(0xff00ff)
    return cyan.clone().lerp(magenta, intensity)
  }, [intensity])

  // Update material properties based on audio
  useFrame(() => {
    if (meshRef.current) {
      // Scale slightly with bass
      const scale = 1 + bass * 0.3
      meshRef.current.scale.setScalar(scale)

      // Rotate based on treble
      meshRef.current.rotation.x += 0.01 + treble * 0.02
      meshRef.current.rotation.y += 0.01 + treble * 0.015
    }
  })

  // Map bass to wobble factor (0.5 - 3)
  const wobbleFactor = 0.5 + bass * 2.5

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <MeshWobbleMaterial
        ref={materialRef}
        color={color}
        factor={wobbleFactor}
        speed={2 + treble * 2}
        emissive={color}
        emissiveIntensity={0.3 + intensity * 0.4}
        metalness={0.6}
        roughness={0.2}
      />
    </mesh>
  )
}

interface AudioVisualizerProps {
  isPlaying: boolean
  frequencyData: FrequencyData
  className?: string
}

/**
 * Audio-reactive 3D visualizer component.
 *
 * Features:
 * - Wobbling sphere with MeshWobbleMaterial driven by bass frequency
 * - Sparkles particles driven by treble
 * - Color shifts from cyan to magenta based on intensity
 * - Only renders when audio is playing for performance
 *
 * @param isPlaying - Whether audio is currently playing
 * @param frequencyData - Object containing bass, treble, and intensity (0-1)
 * @param className - Additional CSS classes
 */
const AudioVisualizer = ({
  isPlaying,
  frequencyData,
  className = ''
}: AudioVisualizerProps) => {
  const { bass, treble, intensity } = frequencyData

  // Sparkles count and speed driven by treble (10-50 particles)
  const sparklesCount = Math.floor(10 + treble * 40)
  const sparklesSpeed = 0.5 + treble * 1.5

  // Color for sparkles - shifts with intensity
  const sparkleColor = useMemo(() => {
    const cyan = new THREE.Color(0x00ffff)
    const magenta = new THREE.Color(0xff00ff)
    return '#' + cyan.clone().lerp(magenta, intensity).getHexString()
  }, [intensity])

  if (!isPlaying) {
    return null
  }

  return (
    <div
      className={`w-full h-full ${className}`}
      data-testid="audio-visualizer"
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={100} color="#00ffff" />
        <pointLight position={[-5, -5, 5]} intensity={60} color="#ff00ff" />

        {/* Wobbling sphere */}
        <VisualizerSphere
          bass={bass}
          treble={treble}
          intensity={intensity}
        />

        {/* Sparkles particles */}
        <Sparkles
          count={sparklesCount}
          scale={2.5}
          size={2 + treble * 3}
          speed={sparklesSpeed}
          color={sparkleColor}
          opacity={0.6 + intensity * 0.4}
        />
      </Canvas>
    </div>
  )
}

export default AudioVisualizer
