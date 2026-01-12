/**
 * Audio Engine Tests
 *
 * Tests for the useAudioPlayer hook functionality including
 * playback controls, track navigation, and audio state management.
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import type { Track } from '@/types/content'

// Mock tracks for testing
const mockTracks: Track[] = [
  {
    id: 'track-1',
    title: 'Test Track 1',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 180,
    audioUrl: '/audio/test-1.mp3'
  },
  {
    id: 'track-2',
    title: 'Test Track 2',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 240,
    audioUrl: '/audio/test-2.mp3'
  },
  {
    id: 'track-3',
    title: 'Test Track 3',
    artist: 'Another Artist',
    album: 'Another Album',
    duration: 200,
    audioUrl: '/audio/test-3.mp3'
  }
]

// Mock HTMLAudioElement
const mockAudioPlay = jest.fn().mockResolvedValue(undefined)
const mockAudioPause = jest.fn()
const mockAudioLoad = jest.fn()

class MockAudioElement {
  src = ''
  volume = 1
  currentTime = 0
  duration = 0
  preload = 'metadata'
  private eventListeners: Record<string, EventListener[]> = {}

  play = mockAudioPlay
  pause = mockAudioPause
  load = mockAudioLoad

  addEventListener(event: string, handler: EventListener) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = []
    }
    this.eventListeners[event].push(handler)
  }

  removeEventListener(event: string, handler: EventListener) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (h) => h !== handler
      )
    }
  }

  dispatchEvent(event: Event) {
    const handlers = this.eventListeners[event.type]
    if (handlers) {
      handlers.forEach((h) => h(event))
    }
    return true
  }

  // Helper to simulate metadata loaded
  simulateMetadataLoaded(dur: number) {
    this.duration = dur
    this.dispatchEvent(new Event('loadedmetadata'))
  }

  // Helper to simulate time update
  simulateTimeUpdate(time: number) {
    this.currentTime = time
    this.dispatchEvent(new Event('timeupdate'))
  }

  // Helper to simulate track ended
  simulateEnded() {
    this.dispatchEvent(new Event('ended'))
  }
}

let mockAudioInstance: MockAudioElement

// Mock window.Audio
beforeAll(() => {
  global.Audio = jest.fn().mockImplementation(() => {
    mockAudioInstance = new MockAudioElement()
    return mockAudioInstance
  }) as unknown as typeof Audio

  // Mock AudioContext
  global.AudioContext = jest.fn().mockImplementation(() => ({
    state: 'running',
    createAnalyser: () => ({
      fftSize: 256,
      frequencyBinCount: 128,
      smoothingTimeConstant: 0.8,
      getByteFrequencyData: jest.fn(),
      connect: jest.fn()
    }),
    createMediaElementSource: () => ({
      connect: jest.fn()
    }),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn()
  }))
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Audio Engine - useAudioPlayer Hook', () => {
  describe('Initial State', () => {
    it('initializes with correct default values', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      expect(result.current.isPlaying).toBe(false)
      expect(result.current.currentTrack).toEqual(mockTracks[0])
      expect(result.current.currentTime).toBe(0)
      expect(result.current.volume).toBe(0.7)
      expect(result.current.isMuted).toBe(false)
    })

    it('sets currentTrack to first track in array', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      expect(result.current.currentTrack?.id).toBe('track-1')
      expect(result.current.currentTrack?.title).toBe('Test Track 1')
    })

    it('handles empty tracks array', () => {
      const { result } = renderHook(() => useAudioPlayer([]))

      expect(result.current.currentTrack).toBeNull()
    })
  })

  describe('Play/Pause Controls', () => {
    it('toggle() switches isPlaying state', async () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      expect(result.current.isPlaying).toBe(false)

      await act(async () => {
        await result.current.toggle()
      })

      expect(result.current.isPlaying).toBe(true)

      await act(async () => {
        await result.current.toggle()
      })

      expect(result.current.isPlaying).toBe(false)
    })

    it('play() sets isPlaying to true', async () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      await act(async () => {
        await result.current.play()
      })

      expect(result.current.isPlaying).toBe(true)
      expect(mockAudioPlay).toHaveBeenCalled()
    })

    it('pause() sets isPlaying to false', async () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      await act(async () => {
        await result.current.play()
      })

      expect(result.current.isPlaying).toBe(true)

      act(() => {
        result.current.pause()
      })

      expect(result.current.isPlaying).toBe(false)
      expect(mockAudioPause).toHaveBeenCalled()
    })
  })

  describe('Track Navigation', () => {
    it('nextTrack() advances to next track', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      expect(result.current.currentTrack?.id).toBe('track-1')

      act(() => {
        result.current.nextTrack()
      })

      expect(result.current.currentTrack?.id).toBe('track-2')
    })

    it('nextTrack() wraps around to first track at end', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      act(() => {
        result.current.nextTrack() // track-2
        result.current.nextTrack() // track-3
        result.current.nextTrack() // wrap to track-1
      })

      expect(result.current.currentTrack?.id).toBe('track-1')
    })

    it('prevTrack() goes to previous track', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      act(() => {
        result.current.nextTrack() // track-2
      })

      expect(result.current.currentTrack?.id).toBe('track-2')

      act(() => {
        result.current.prevTrack()
      })

      expect(result.current.currentTrack?.id).toBe('track-1')
    })

    it('prevTrack() wraps around to last track from first', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      act(() => {
        result.current.prevTrack()
      })

      expect(result.current.currentTrack?.id).toBe('track-3')
    })

    it('setTrack() changes to specified track', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      act(() => {
        result.current.setTrack(mockTracks[2])
      })

      expect(result.current.currentTrack?.id).toBe('track-3')
    })
  })

  describe('Volume Controls', () => {
    it('setVolume() updates volume state', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      act(() => {
        result.current.setVolume(0.5)
      })

      expect(result.current.volume).toBe(0.5)
    })

    it('setVolume() clamps values between 0 and 1', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      act(() => {
        result.current.setVolume(1.5)
      })

      expect(result.current.volume).toBe(1)

      act(() => {
        result.current.setVolume(-0.5)
      })

      expect(result.current.volume).toBe(0)
    })

    it('toggleMute() toggles muted state', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      expect(result.current.isMuted).toBe(false)

      act(() => {
        result.current.toggleMute()
      })

      expect(result.current.isMuted).toBe(true)

      act(() => {
        result.current.toggleMute()
      })

      expect(result.current.isMuted).toBe(false)
    })
  })

  describe('Seek Functionality', () => {
    it('seek() updates currentTime', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      // Simulate metadata loaded with duration
      act(() => {
        if (mockAudioInstance) {
          mockAudioInstance.simulateMetadataLoaded(180)
        }
      })

      act(() => {
        result.current.seek(60)
      })

      expect(result.current.currentTime).toBe(60)
    })
  })

  describe('Frequency Data', () => {
    it('getFrequencyData() returns null when not initialized', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      const data = result.current.getFrequencyData()
      // Will be null since AudioContext is not fully initialized in this test
      expect(data === null || data instanceof Uint8Array).toBe(true)
    })

    it('frequencyData defaults to zero values', () => {
      const { result } = renderHook(() => useAudioPlayer(mockTracks))

      expect(result.current.frequencyData).toEqual({
        bass: 0,
        treble: 0,
        intensity: 0
      })
    })
  })
})
