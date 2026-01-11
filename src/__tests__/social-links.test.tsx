/**
 * Social Links Tests
 *
 * Tests for the SocialLinks component including:
 * - Renders GitHub and LinkedIn icons
 * - Icons have proper aria-labels for accessibility
 * - Links have correct href values and target="_blank"
 */

import { render, screen } from '@testing-library/react'
import SocialLinks from '@/components/SocialLinks'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    a: ({ children, className, href, target, rel, 'aria-label': ariaLabel }: React.PropsWithChildren<{ className?: string; href?: string; target?: string; rel?: string; 'aria-label'?: string }>) => (
      <a className={className} href={href} target={target} rel={rel} aria-label={ariaLabel}>{children}</a>
    ),
  },
}))

describe('SocialLinks', () => {
  it('renders GitHub and LinkedIn icons', () => {
    render(<SocialLinks />)

    const githubLink = screen.getByRole('link', {
      name: /visit phill's github profile/i,
    })
    const linkedinLink = screen.getByRole('link', {
      name: /visit phill's linkedin profile/i,
    })

    expect(githubLink).toBeInTheDocument()
    expect(linkedinLink).toBeInTheDocument()
  })

  it('icons have proper aria-labels for accessibility', () => {
    render(<SocialLinks />)

    const githubLink = screen.getByLabelText(/visit phill's github profile/i)
    const linkedinLink = screen.getByLabelText(/visit phill's linkedin profile/i)

    expect(githubLink).toBeInTheDocument()
    expect(linkedinLink).toBeInTheDocument()
  })

  it('links have correct href values and target="_blank"', () => {
    render(<SocialLinks />)

    const githubLink = screen.getByRole('link', {
      name: /visit phill's github profile/i,
    })
    const linkedinLink = screen.getByRole('link', {
      name: /visit phill's linkedin profile/i,
    })

    expect(githubLink).toHaveAttribute('href', 'https://github.com/phillael')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer')

    expect(linkedinLink).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/phill-aelony'
    )
    expect(linkedinLink).toHaveAttribute('target', '_blank')
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
