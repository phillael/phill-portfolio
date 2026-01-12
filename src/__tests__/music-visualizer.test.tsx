/**
 * Audio Visualizer Tests
 *
 * Tests for the 3D audio visualizer component behavior.
 */

import { render, screen } from '@testing-library/react'
import AudioVisualizer from '@/components/music/AudioVisualizer'
import type { FrequencyData } from '@/lib/audio-utils'

// Mock React Three Fiber since it requires WebGL
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: jest.fn()
}))

// Mock Drei components
jest.mock('@react-three/drei', () => ({
  Sparkles: () => <div data-testid="sparkles" />,
  MeshWobbleMaterial: () => <div data-testid="wobble-material" />
}))

// Mock THREE
jest.mock('three', () => ({
  Color: jest.fn().mockImplementation(() => ({
    clone: jest.fn().mockReturnThis(),
    lerp: jest.fn().mockReturnThis(),
    getHexString: jest.fn().mockReturnValue('00ffff')
  }))
}))

const defaultFrequencyData: FrequencyData = {
  bass: 0.5,
  treble: 0.3,
  intensity: 0.4
}

describe('Audio Visualizer Component', () => {
  describe('Conditional Rendering', () => {
    it('renders canvas when isPlaying is true', () => {
      render(
        <AudioVisualizer
          isPlaying={true}
          frequencyData={defaultFrequencyData}
        />
      )

      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()
      expect(screen.getByTestId('three-canvas')).toBeInTheDocument()
    })

    it('does not render when isPlaying is false', () => {
      render(
        <AudioVisualizer
          isPlaying={false}
          frequencyData={defaultFrequencyData}
        />
      )

      expect(screen.queryByTestId('audio-visualizer')).not.toBeInTheDocument()
      expect(screen.queryByTestId('three-canvas')).not.toBeInTheDocument()
    })

    it('shows visualizer when playing, hides when stopped', () => {
      const { rerender } = render(
        <AudioVisualizer
          isPlaying={true}
          frequencyData={defaultFrequencyData}
        />
      )

      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()

      rerender(
        <AudioVisualizer
          isPlaying={false}
          frequencyData={defaultFrequencyData}
        />
      )

      expect(screen.queryByTestId('audio-visualizer')).not.toBeInTheDocument()
    })
  })

  describe('Props Handling', () => {
    it('accepts frequency data with bass, treble, and intensity', () => {
      const customData: FrequencyData = {
        bass: 0.8,
        treble: 0.6,
        intensity: 0.7
      }

      render(
        <AudioVisualizer
          isPlaying={true}
          frequencyData={customData}
        />
      )

      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()
    })

    it('handles zero frequency data gracefully', () => {
      const zeroData: FrequencyData = {
        bass: 0,
        treble: 0,
        intensity: 0
      }

      render(
        <AudioVisualizer
          isPlaying={true}
          frequencyData={zeroData}
        />
      )

      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()
    })

    it('handles maximum frequency data values', () => {
      const maxData: FrequencyData = {
        bass: 1,
        treble: 1,
        intensity: 1
      }

      render(
        <AudioVisualizer
          isPlaying={true}
          frequencyData={maxData}
        />
      )

      expect(screen.getByTestId('audio-visualizer')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AudioVisualizer
          isPlaying={true}
          frequencyData={defaultFrequencyData}
          className="custom-class"
        />
      )

      const visualizer = screen.getByTestId('audio-visualizer')
      expect(visualizer).toHaveClass('custom-class')
    })
  })

  describe('Scene Elements', () => {
    it('renders sparkles effect', () => {
      render(
        <AudioVisualizer
          isPlaying={true}
          frequencyData={defaultFrequencyData}
        />
      )

      expect(screen.getByTestId('sparkles')).toBeInTheDocument()
    })
  })
})
