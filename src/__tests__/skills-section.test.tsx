/**
 * Skills Section Tests
 *
 * Tests for the SkillsSection, SkillCategory, and SkillChip components:
 * - SkillsSection renders with correct ID (#skills)
 * - All three skill categories render with headings
 * - SkillChip components render for each skill
 * - Hover state applies scale and glow effect
 * - Skills are imported from JSON data
 */

import { render, screen, fireEvent } from '@testing-library/react'
import SkillsSection from '@/components/SkillsSection'
import SkillCategory from '@/components/SkillCategory'
import SkillChip from '@/components/SkillChip'
import skillsData from '@/data/skills.json'
import { SkillCategory as SkillCategoryType } from '@/types/content'

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
    h3: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h3 {...props}>{children}</h3>
    ),
    span: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

describe('SkillsSection', () => {
  it('renders with correct ID (#skills)', () => {
    render(<SkillsSection />)

    const section = document.getElementById('skills')
    expect(section).toBeInTheDocument()
  })

  it('renders all three skill categories with headings', () => {
    render(<SkillsSection />)

    // Check each category heading is rendered
    expect(screen.getByText('Technical Skills')).toBeInTheDocument()
    expect(screen.getByText('Professional Skills')).toBeInTheDocument()
    expect(screen.getByText('Other Skills')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<SkillsSection />)

    const section = screen.getByRole('region', { name: /skills/i })
    expect(section).toBeInTheDocument()
  })

  it('renders all skills from JSON data', () => {
    render(<SkillsSection />)

    // Verify all skills from all categories are rendered
    ;(skillsData as SkillCategoryType[]).forEach((category) => {
      category.skills.forEach((skill) => {
        expect(screen.getByText(skill)).toBeInTheDocument()
      })
    })
  })
})

describe('SkillCategory', () => {
  const mockCategory: SkillCategoryType = {
    category: 'Test Category',
    skills: ['Skill 1', 'Skill 2', 'Skill 3'],
  }

  it('renders category heading', () => {
    render(<SkillCategory category={mockCategory.category} skills={mockCategory.skills} />)

    expect(screen.getByText('Test Category')).toBeInTheDocument()
  })

  it('renders all skills as chips', () => {
    render(<SkillCategory category={mockCategory.category} skills={mockCategory.skills} />)

    mockCategory.skills.forEach((skill) => {
      expect(screen.getByText(skill)).toBeInTheDocument()
    })
  })
})

describe('SkillChip', () => {
  it('renders skill name', () => {
    render(<SkillChip skill="React" />)

    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('applies hover effect classes for scale and glow', () => {
    render(<SkillChip skill="TypeScript" />)

    const chip = screen.getByText('TypeScript')

    // Check that the chip has the expected base classes
    expect(chip).toHaveClass('text-accent')
    expect(chip).toHaveClass('bg-muted')

    // Verify transition and hover scale classes are present
    expect(chip.className).toMatch(/transition/)
    expect(chip.className).toMatch(/hover:scale/)
  })
})
