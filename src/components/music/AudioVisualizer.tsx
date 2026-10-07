'use client'

import { useRef, type ComponentRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, MeshWobbleMaterial } from '@react-three/drei'
import * as THREE from 'three'
import type { FrequencyData } from '@/lib/audio-utils'

const CYAN = new THREE.Color(0x00ffff)
const MAGENTA = new THREE.Color(0xff00ff)

interface VisualizerProps {
  frequencyData: FrequencyData
}

/**
 * Animated sphere that responds to audio frequency data.
 * Everything audio-driven is applied inside useFrame from the live
 * frequencyData object, so playback never re-renders React.
 */
const VisualizerSphere = ({ frequencyData }: VisualizerProps) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<ComponentRef<typeof MeshWobbleMaterial>>(null)

  useFrame(() => {
    const { bass, treble, intensity } = frequencyData
    const mesh = meshRef.current
    if (mesh) {
      // Scale slightly with bass, rotate faster with treble
      mesh.scale.setScalar(1 + bass * 0.3)
      mesh.rotation.x += 0.01 + treble * 0.02
      mesh.rotation.y += 0.01 + treble * 0.015
    }
    const material = materialRef.current
    if (material) {
      // Wobble driven by bass (0.5 - 3), color shifts cyan -> magenta with intensity
      material.factor = 0.5 + bass * 2.5
      material.color.lerpColors(CYAN, MAGENTA, intensity)
      material.emissive.copy(material.color)
      material.emissiveIntensity = 0.3 + intensity * 0.4
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.8, 32, 32]} />
      <MeshWobbleMaterial
        ref={materialRef}
        color={CYAN}
        factor={0.5}
        speed={2.5}
        emissive={CYAN}
        emissiveIntensity={0.3}
        metalness={0.6}
        roughness={0.2}
      />
    </mesh>
  )
}

/**
 * Sparkles pulse with treble. The particle count stays fixed: changing it
 * makes drei rebuild every particle buffer.
 */
const VisualizerSparkles = ({ frequencyData }: VisualizerProps) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.scale.setScalar(1 + frequencyData.treble * 0.4)
    }
  })

  return (
    <group ref={groupRef}>
      <Sparkles count={30} scale={2.5} size={3} speed={1.2} color="#80ffff" opacity={0.8} />
    </group>
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
 * - Sparkles particles pulsing with treble
 * - Color shifts from cyan to magenta based on intensity
 * - Only renders when audio is playing for performance
 *
 * @param isPlaying - Whether audio is currently playing
 * @param frequencyData - Live object with bass, treble, and intensity (0-1)
 * @param className - Additional CSS classes
 */
const AudioVisualizer = ({
  isPlaying,
  frequencyData,
  className = ''
}: AudioVisualizerProps) => {
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

        <VisualizerSphere frequencyData={frequencyData} />
        <VisualizerSparkles frequencyData={frequencyData} />
      </Canvas>
    </div>
  )
}

export default AudioVisualizer
