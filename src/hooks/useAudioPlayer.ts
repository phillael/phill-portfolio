'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Track } from '@/types/content'
import { extractFrequencyBands, type FrequencyData } from '@/lib/audio-utils'

/**
 * Audio player state returned by the hook.
 */
export interface AudioPlayerState {
  isPlaying: boolean
  currentTrack: Track | null
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  frequencyData: FrequencyData
}

/**
 * Audio player actions for controlling playback.
 */
export interface AudioPlayerActions {
  play: () => void
  pause: () => void
  toggle: () => void
  setTrack: (track: Track) => void
  nextTrack: () => void
  prevTrack: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  getFrequencyData: () => Uint8Array<ArrayBuffer> | null
}

/**
 * Combined return type for useAudioPlayer hook.
 */
export type UseAudioPlayerReturn = AudioPlayerState & AudioPlayerActions

/**
 * Custom hook for managing audio playback with Web Audio API integration.
 *
 * Features:
 * - Play/pause/seek controls
 * - Track navigation (next/previous)
 * - Volume and mute controls
 * - Web Audio API analyser for frequency data
 * - Automatic track advancement on end
 * - Handles browser autoplay restrictions
 *
 * @param tracks - Array of tracks to manage
 * @returns Audio player state and control actions
 */
export function useAudioPlayer(tracks: Track[]): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [frequencyData, setFrequencyData] = useState<FrequencyData>({
    bass: 0,
    treble: 0,
    intensity: 0
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const frequencyArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const currentTrack = tracks.length > 0 ? tracks[currentTrackIndex] : null

  /**
   * Initialize Web Audio API components.
   */
  const initializeAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return

    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      const ctx = new AudioContextClass()
      audioContextRef.current = ctx

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      analyserRef.current = analyser

      frequencyArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>

      const source = ctx.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(ctx.destination)
      sourceRef.current = source
    } catch (error) {
      console.error('Failed to initialize Web Audio API:', error)
    }
  }, [])

  /**
   * Update frequency data for visualizer.
   */
  const updateFrequencyData = useCallback(() => {
    if (!analyserRef.current || !frequencyArrayRef.current || !isPlaying) {
      return
    }

    analyserRef.current.getByteFrequencyData(frequencyArrayRef.current)
    setFrequencyData(extractFrequencyBands(frequencyArrayRef.current))

    animationFrameRef.current = requestAnimationFrame(updateFrequencyData)
  }, [isPlaying])

  /**
   * Start the frequency data update loop.
   */
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateFrequencyData)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      setFrequencyData({ bass: 0, treble: 0, intensity: 0 })
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateFrequencyData])

  /**
   * Initialize audio element and event listeners.
   */
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = volume
    audioRef.current = audio

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      // Auto-advance to next track
      if (currentTrackIndex < tracks.length - 1) {
        setCurrentTrackIndex((prev) => prev + 1)
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e)
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.pause()
      audio.src = ''

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Load track when currentTrackIndex or tracks change.
   */
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return

    const wasPlaying = isPlaying
    audioRef.current.src = currentTrack.audioUrl
    audioRef.current.load()

    if (wasPlaying) {
      audioRef.current.play().catch(() => {
        setIsPlaying(false)
      })
    }
  }, [currentTrackIndex, currentTrack]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Sync volume state with audio element.
   */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  /**
   * Play audio.
   */
  const play = useCallback(async () => {
    if (!audioRef.current) return

    // Initialize audio context on first user interaction (browser autoplay policy)
    if (!audioContextRef.current) {
      initializeAudioContext()
    }

    // Resume audio context if suspended
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume()
    }

    try {
      await audioRef.current.play()
      setIsPlaying(true)
    } catch (error) {
      console.error('Playback failed:', error)
    }
  }, [initializeAudioContext])

  /**
   * Pause audio.
   */
  const pause = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }, [])

  /**
   * Toggle play/pause.
   */
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  /**
   * Set and play a specific track.
   */
  const setTrack = useCallback(
    (track: Track) => {
      const index = tracks.findIndex((t) => t.id === track.id)
      if (index !== -1) {
        setCurrentTrackIndex(index)
        setCurrentTime(0)
      }
    },
    [tracks]
  )

  /**
   * Go to next track.
   */
  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return
    setCurrentTrackIndex((prev) => (prev + 1) % tracks.length)
    setCurrentTime(0)
  }, [tracks.length])

  /**
   * Go to previous track.
   */
  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length)
    setCurrentTime(0)
  }, [tracks.length])

  /**
   * Seek to a specific time.
   */
  const seek = useCallback((time: number) => {
    if (!audioRef.current) return
    const clampedTime = Math.max(0, Math.min(time, audioRef.current.duration || 0))
    audioRef.current.currentTime = clampedTime
    setCurrentTime(clampedTime)
  }, [])

  /**
   * Set volume (0-1).
   */
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolumeState(clampedVolume)
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false)
    }
  }, [isMuted])

  /**
   * Toggle mute.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  /**
   * Get raw frequency data for external use.
   */
  const getFrequencyData = useCallback((): Uint8Array<ArrayBuffer> | null => {
    if (!analyserRef.current || !frequencyArrayRef.current) return null
    analyserRef.current.getByteFrequencyData(frequencyArrayRef.current)
    return frequencyArrayRef.current
  }, [])

  return {
    // State
    isPlaying,
    currentTrack,
    currentTime,
    duration,
    volume,
    isMuted,
    frequencyData,
    // Actions
    play,
    pause,
    toggle,
    setTrack,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    getFrequencyData
  }
}

export default useAudioPlayer
