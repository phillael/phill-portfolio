/**
 * TypeScript interface for testimonial data structure.
 * Used by the AboutCarousel component to display colleague testimonials.
 */

/**
 * Testimonial - Colleague endorsement entry for the testimonials carousel
 */
export interface Testimonial {
  id: string
  image: string
  name: string
  position: string
  date: string
  relationship: string
  body: string
}
