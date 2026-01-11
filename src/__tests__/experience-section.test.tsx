/**
 * Experience Section Tests
 *
 * Tests for the ExperienceSection and TimelineCard components:
 * - ExperienceSection renders with correct ID (#experience)
 * - Timeline renders all 5 experience entries from data
 * - TimelineCard expands/collapses on click
 * - Expanded card shows description and tech stack
 * - aria-expanded attribute updates correctly
 * - Keyboard accessibility (Enter/Space to toggle)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExperienceSection from '@/components/ExperienceSection'
import TimelineCard from '@/components/TimelineCard'
import experienceData from '@/data/experience.json'
import { Experience } from '@/types/content'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div {...props}>{children}</div>
    ),
    h2: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h2 {...props}>{children}</h2>
    ),
    section: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <section {...props}>{children}</section>
    ),
    ul: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLUListElement>>) => (
      <ul {...props}>{children}</ul>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

describe('ExperienceSection', () => {
  it('renders with correct ID (#experience)', () => {
    render(<ExperienceSection />)

    const section = document.getElementById('experience')
    expect(section).toBeInTheDocument()
  })

  it('renders all 5 experience entries from data', () => {
    render(<ExperienceSection />)

    // Each experience should have its title displayed
    experienceData.forEach((exp: Experience) => {
      expect(screen.getByText(exp.title)).toBeInTheDocument()
    })

    // Verify there are exactly 5 entries
    expect(experienceData.length).toBe(5)
  })

  it('has proper accessibility attributes', () => {
    render(<ExperienceSection />)

    const section = screen.getByRole('region', { name: /work experience/i })
    expect(section).toBeInTheDocument()
  })
})

describe('TimelineCard', () => {
  const mockExperience: Experience = {
    id: 'test-exp',
    title: 'Test Engineer',
    company: 'Test Company',
    dateRange: 'Jan 2023 - Present',
    description: 'This is a test description for the experience.',
    bulletPoints: ['First bullet point', 'Second bullet point'],
    techStack: ['React', 'TypeScript', 'Node.js'],
    type: 'tech',
  }

  it('expands and collapses on click', () => {
    render(<TimelineCard experience={mockExperience} />)

    const card = screen.getByRole('button')

    // Initially collapsed - description should not be visible
    expect(screen.queryByText(mockExperience.description)).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(card)

    // Now description should be visible
    expect(screen.getByText(mockExperience.description)).toBeInTheDocument()

    // Click again to collapse
    fireEvent.click(card)

    // Description should be hidden again
    expect(screen.queryByText(mockExperience.description)).not.toBeInTheDocument()
  })

  it('expanded card shows description and tech stack', () => {
    render(<TimelineCard experience={mockExperience} />)

    const card = screen.getByRole('button')
    fireEvent.click(card)

    // Check description is visible
    expect(screen.getByText(mockExperience.description)).toBeInTheDocument()

    // Check tech stack badges are visible
    mockExperience.techStack.forEach((tech) => {
      expect(screen.getByText(tech)).toBeInTheDocument()
    })

    // Check bullet points are visible
    mockExperience.bulletPoints.forEach((bullet) => {
      expect(screen.getByText(bullet)).toBeInTheDocument()
    })
  })

  it('aria-expanded attribute updates correctly', () => {
    render(<TimelineCard experience={mockExperience} />)

    const card = screen.getByRole('button')

    // Initially collapsed
    expect(card).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-expanded', 'true')

    // Click to collapse
    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports keyboard interaction (Enter to toggle)', async () => {
    const user = userEvent.setup()
    render(<TimelineCard experience={mockExperience} />)

    const card = screen.getByRole('button')

    // Focus the card
    card.focus()
    expect(card).toHaveFocus()

    // Press Enter to expand
    await user.keyboard('{Enter}')
    expect(card).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(mockExperience.description)).toBeInTheDocument()

    // Press Enter again to collapse
    await user.keyboard('{Enter}')
    expect(card).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports keyboard interaction (Space to toggle)', async () => {
    const user = userEvent.setup()
    render(<TimelineCard experience={mockExperience} />)

    const card = screen.getByRole('button')

    // Focus the card
    card.focus()

    // Press Space to expand
    await user.keyboard(' ')
    expect(card).toHaveAttribute('aria-expanded', 'true')

    // Press Space again to collapse
    await user.keyboard(' ')
    expect(card).toHaveAttribute('aria-expanded', 'false')
  })
})
