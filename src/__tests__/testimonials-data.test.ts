/**
 * Testimonials Data Tests
 *
 * Verifies that testimonials data is properly structured
 * and conforms to the Testimonial TypeScript interface.
 */

import { testimonials } from '@/data/testimonials'
import type { Testimonial } from '@/types/testimonial'

describe('Testimonials Data', () => {
  it('exports a non-empty testimonials array', () => {
    expect(testimonials).toBeDefined()
    expect(Array.isArray(testimonials)).toBe(true)
    expect(testimonials.length).toBeGreaterThan(0)
  })

  it('each testimonial has all required fields with correct types', () => {
    testimonials.forEach((testimonial: Testimonial) => {
      // Required string fields
      expect(typeof testimonial.id).toBe('string')
      expect(typeof testimonial.image).toBe('string')
      expect(typeof testimonial.name).toBe('string')
      expect(typeof testimonial.position).toBe('string')
      expect(typeof testimonial.date).toBe('string')
      expect(typeof testimonial.relationship).toBe('string')
      expect(typeof testimonial.body).toBe('string')

      // Fields should not be empty
      expect(testimonial.id.length).toBeGreaterThan(0)
      expect(testimonial.name.length).toBeGreaterThan(0)
      expect(testimonial.body.length).toBeGreaterThan(0)
    })
  })
})
