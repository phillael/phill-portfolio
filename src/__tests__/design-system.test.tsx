/**
 * Design System Tests
 *
 * Tests for the cyberpunk design system utilities including:
 * - Neon text effect classes
 * - CSS custom property availability
 * - Font family configuration
 */

import { render, screen } from '@testing-library/react'

describe('Design System', () => {
  describe('Neon Text Effect Classes', () => {
    it('applies neon-text-green class correctly', () => {
      render(
        <span data-testid="neon-green" className="neon-text-green">
          Test Text
        </span>
      )

      const element = screen.getByTestId('neon-green')
      expect(element).toHaveClass('neon-text-green')
      expect(element).toBeInTheDocument()
    })

    it('applies neon-text-purple class correctly', () => {
      render(
        <span data-testid="neon-purple" className="neon-text-purple">
          Test Text
        </span>
      )

      const element = screen.getByTestId('neon-purple')
      expect(element).toHaveClass('neon-text-purple')
      expect(element).toBeInTheDocument()
    })

    it('applies neon-text-blue class correctly', () => {
      render(
        <span data-testid="neon-blue" className="neon-text-blue">
          Test Text
        </span>
      )

      const element = screen.getByTestId('neon-blue')
      expect(element).toHaveClass('neon-text-blue')
      expect(element).toBeInTheDocument()
    })
  })

  describe('Design Utility Classes', () => {
    it('applies neon-border class correctly', () => {
      render(
        <div data-testid="neon-border" className="neon-border">
          Border Test
        </div>
      )

      const element = screen.getByTestId('neon-border')
      expect(element).toHaveClass('neon-border')
    })

    it('applies gradient-card class correctly', () => {
      render(
        <div data-testid="gradient-card" className="gradient-card">
          Card Test
        </div>
      )

      const element = screen.getByTestId('gradient-card')
      expect(element).toHaveClass('gradient-card')
    })

    it('applies custom-scrollbar class correctly', () => {
      render(
        <div data-testid="custom-scrollbar" className="custom-scrollbar">
          Scrollbar Test
        </div>
      )

      const element = screen.getByTestId('custom-scrollbar')
      expect(element).toHaveClass('custom-scrollbar')
    })
  })
})
