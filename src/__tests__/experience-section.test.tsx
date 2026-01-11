/**
 * Experience Section Tests
 *
 * Tests for the ExperienceSection and TimelineCard components:
 * - ExperienceSection renders with correct ID (#experience)
 * - Timeline renders all experience entries from data
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

// Helper to filter out framer-motion props
const filterMotionProps = (props: Record<string, unknown>) => {
  const motionProps = ['initial', 'animate', 'exit', 'whileHover', 'whileTap', 'whileInView', 'whileFocus', 'whileDrag', 'variants', 'transition', 'viewport', 'layout', 'layoutId', 'onAnimationComplete', 'onAnimationStart']
  const filtered: Record<string, unknown> = {}
  Object.keys(props).forEach(key => {
    if (!motionProps.includes(key)) {
      filtered[key] = props[key]
    }
  })
  return filtered
}

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, role, tabIndex, onClick, onKeyDown, ...props }: React.PropsWithChildren<{ className?: string; role?: string; tabIndex?: number; onClick?: () => void; onKeyDown?: (e: React.KeyboardEvent) => void }>) => (
      <div className={className} role={role} tabIndex={tabIndex} onClick={onClick} onKeyDown={onKeyDown} {...filterMotionProps(props)}>{children}</div>
    ),
    h2: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <h2 className={className} {...filterMotionProps(props)}>{children}</h2>
    ),
    section: ({ children, className, id, ...props }: React.PropsWithChildren<{ className?: string; id?: string }>) => (
      <section className={className} id={id} {...filterMotionProps(props)}>{children}</section>
    ),
    ul: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <ul className={className} {...filterMotionProps(props)}>{children}</ul>
    ),
    a: ({ children, className, href, target, rel, download, ...props }: React.PropsWithChildren<{ className?: string; href?: string; target?: string; rel?: string; download?: string }>) => (
      <a className={className} href={href} target={target} rel={rel} download={download} {...filterMotionProps(props)}>{children}</a>
    ),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className} {...filterMotionProps(props)}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  useReducedMotion: () => false,
}))

describe('ExperienceSection', () => {
  it('renders with correct ID (#experience)', () => {
    render(<ExperienceSection />)

    const section = document.getElementById('experience')
    expect(section).toBeInTheDocument()
  })

  it('renders all experience entries from data', () => {
    render(<ExperienceSection />)

    // Each experience should have its title displayed
    const experiences = experienceData as Experience[]
    experiences.forEach((exp) => {
      expect(screen.getByText(exp.title)).toBeInTheDocument()
    })

    // Verify there are experience entries (dynamic count from data)
    expect(experienceData.length).toBeGreaterThan(0)
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
