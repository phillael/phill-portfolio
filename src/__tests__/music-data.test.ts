/**
 * Music Data Layer Tests
 *
 * Verifies that Track type and tracks.json data are properly formatted
 * and that audio utility functions work correctly.
 */

import tracksData from '@/data/tracks.json'
import type { Track } from '@/types/content'
import {
  formatDuration,
  extractBass,
  extractTreble,
  calculateIntensity,
  extractFrequencyBands
} from '@/lib/audio-utils'

describe('Music Data Layer', () => {
  describe('Track Interface and Data', () => {
    it('imports tracks.json without errors', () => {
      expect(tracksData).toBeDefined()
      expect(Array.isArray(tracksData)).toBe(true)
    })

    it('each track has required fields (id, title, artist, album, duration, audioUrl)', () => {
      tracksData.forEach((track) => {
        const t = track as Track
        expect(t.id).toBeDefined()
        expect(typeof t.id).toBe('string')
        expect(t.title).toBeDefined()
        expect(typeof t.title).toBe('string')
        expect(t.artist).toBeDefined()
        expect(typeof t.artist).toBe('string')
        expect(t.album).toBeDefined()
        expect(typeof t.album).toBe('string')
        expect(t.duration).toBeDefined()
        expect(typeof t.duration).toBe('number')
        expect(t.duration).toBeGreaterThan(0)
        expect(t.audioUrl).toBeDefined()
        expect(typeof t.audioUrl).toBe('string')
        expect(t.audioUrl.startsWith('/audio/')).toBe(true)
      })
    })

    it('optional fields (description, artworkUrl) handle missing values gracefully', () => {
      // All tracks should have descriptions
      const trackWithDescription = tracksData.find((t) => t.description !== undefined)
      expect(trackWithDescription).toBeDefined()
      if (trackWithDescription) {
        expect(typeof trackWithDescription.description).toBe('string')
      }

      // artworkUrl is optional - tracks without it should still work
      tracksData.forEach((track) => {
        if ('artworkUrl' in track && track.artworkUrl !== undefined) {
          expect(typeof track.artworkUrl).toBe('string')
        }
      })
    })

    it('contains tracks', () => {
      expect(tracksData.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Duration Formatting', () => {
    it('formats seconds to MM:SS format correctly', () => {
      expect(formatDuration(125)).toBe('2:05')
      expect(formatDuration(60)).toBe('1:00')
      expect(formatDuration(59)).toBe('0:59')
      expect(formatDuration(245)).toBe('4:05')
    })

    it('handles edge case of 0 duration', () => {
      expect(formatDuration(0)).toBe('0:00')
    })

    it('handles very long tracks correctly', () => {
      expect(formatDuration(3661)).toBe('61:01')
      expect(formatDuration(7200)).toBe('120:00')
    })

    it('handles invalid inputs gracefully', () => {
      expect(formatDuration(-10)).toBe('0:00')
      expect(formatDuration(NaN)).toBe('0:00')
      expect(formatDuration(Infinity)).toBe('0:00')
    })
  })

  describe('Frequency Band Extraction', () => {
    const mockFrequencyData = new Uint8Array(128)

    beforeEach(() => {
      // Fill with test data - bass frequencies high, treble lower
      for (let i = 0; i < 128; i++) {
        if (i < 8) {
          mockFrequencyData[i] = 200 // High bass
        } else if (i < 32) {
          mockFrequencyData[i] = 150 // Medium mid
        } else if (i < 64) {
          mockFrequencyData[i] = 100 // Lower treble
        } else {
          mockFrequencyData[i] = 50 // Low presence
        }
      }
    })

    it('extracts bass frequency and returns normalized value (0-1)', () => {
      const bass = extractBass(mockFrequencyData)
      expect(bass).toBeGreaterThan(0)
      expect(bass).toBeLessThanOrEqual(1)
      expect(bass).toBeCloseTo(200 / 255, 2)
    })

    it('extracts treble frequency and returns normalized value (0-1)', () => {
      const treble = extractTreble(mockFrequencyData)
      expect(treble).toBeGreaterThan(0)
      expect(treble).toBeLessThanOrEqual(1)
      expect(treble).toBeCloseTo(100 / 255, 2)
    })

    it('calculates overall intensity correctly', () => {
      const intensity = calculateIntensity(mockFrequencyData)
      expect(intensity).toBeGreaterThan(0)
      expect(intensity).toBeLessThanOrEqual(1)
    })

    it('handles empty frequency data gracefully', () => {
      const emptyData = new Uint8Array(0)
      expect(extractBass(emptyData)).toBe(0)
      expect(extractTreble(emptyData)).toBe(0)
      expect(calculateIntensity(emptyData)).toBe(0)
    })

    it('extractFrequencyBands returns all three values', () => {
      const result = extractFrequencyBands(mockFrequencyData)
      expect(result).toHaveProperty('bass')
      expect(result).toHaveProperty('treble')
      expect(result).toHaveProperty('intensity')
      expect(result.bass).toBeGreaterThan(result.treble)
    })
  })
})
