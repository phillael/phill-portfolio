/**
 * Audio utility functions for the music player.
 */

/**
 * Format duration from seconds to MM:SS format.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string in MM:SS format
 *
 * @example
 * formatDuration(125) // "2:05"
 * formatDuration(0) // "0:00"
 * formatDuration(3661) // "61:01"
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }

  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Frequency band ranges for audio analysis.
 * Values are indices into FFT data array (assuming 128-band FFT).
 */
export const FREQUENCY_BANDS = {
  bass: { start: 0, end: 8 },       // ~20-250Hz
  mid: { start: 8, end: 32 },       // ~250Hz-2kHz
  treble: { start: 32, end: 64 },   // ~2kHz-8kHz
  presence: { start: 64, end: 128 } // ~8kHz-20kHz
} as const

/**
 * Extract bass frequency level from FFT data.
 * Returns normalized value between 0 and 1.
 *
 * @param frequencyData - Uint8Array from AnalyserNode.getByteFrequencyData()
 * @returns Normalized bass level (0-1)
 */
export function extractBass(frequencyData: Uint8Array): number {
  if (!frequencyData || frequencyData.length === 0) {
    return 0
  }

  const { start, end } = FREQUENCY_BANDS.bass
  const endIndex = Math.min(end, frequencyData.length)
  let sum = 0

  for (let i = start; i < endIndex; i++) {
    sum += frequencyData[i]
  }

  const average = sum / (endIndex - start)
  return average / 255
}

/**
 * Extract treble frequency level from FFT data.
 * Returns normalized value between 0 and 1.
 *
 * @param frequencyData - Uint8Array from AnalyserNode.getByteFrequencyData()
 * @returns Normalized treble level (0-1)
 */
export function extractTreble(frequencyData: Uint8Array): number {
  if (!frequencyData || frequencyData.length === 0) {
    return 0
  }

  const { start, end } = FREQUENCY_BANDS.treble
  const endIndex = Math.min(end, frequencyData.length)
  let sum = 0

  for (let i = start; i < endIndex; i++) {
    sum += frequencyData[i]
  }

  const average = sum / (endIndex - start)
  return average / 255
}

/**
 * Calculate overall audio intensity from FFT data.
 * Returns normalized value between 0 and 1.
 *
 * @param frequencyData - Uint8Array from AnalyserNode.getByteFrequencyData()
 * @returns Normalized intensity level (0-1)
 */
export function calculateIntensity(frequencyData: Uint8Array): number {
  if (!frequencyData || frequencyData.length === 0) {
    return 0
  }

  let sum = 0
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i]
  }

  const average = sum / frequencyData.length
  return average / 255
}

/**
 * Frequency data structure for visualizer consumption.
 */
export interface FrequencyData {
  bass: number
  treble: number
  intensity: number
}

/**
 * Extract all frequency bands from FFT data.
 * Returns normalized values for bass, treble, and overall intensity.
 *
 * @param frequencyData - Uint8Array from AnalyserNode.getByteFrequencyData()
 * @returns Object with bass, treble, and intensity values (0-1)
 */
export function extractFrequencyBands(frequencyData: Uint8Array): FrequencyData {
  return {
    bass: extractBass(frequencyData),
    treble: extractTreble(frequencyData),
    intensity: calculateIntensity(frequencyData)
  }
}
