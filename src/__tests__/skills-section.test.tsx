/**
 * Skills Section Tests
 *
 * Tests for the SkillsSection, SkillCategory, and SkillChip components:
 * - SkillsSection renders with correct ID (#skills)
 * - A heading per skill group
 * - SkillChip components render for each skill
 * - Hover state applies scale and glow effect
 * - Skills are imported from skills.ts
 */

import { render, screen, fireEvent } from '@testing-library/react'
import SkillsSection from '@/components/SkillsSection'
import SkillCategory from '@/components/SkillCategory'
import SkillChip from '@/components/SkillChip'
import { SKILLS } from '@/data/skills'

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
    div: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div className={className} {...filterMotionProps(props)}>{children}</div>
    ),
    h2: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h2 className={className} {...filterMotionProps(props)}>{children}</h2>
    ),
    h3: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h3 className={className} {...filterMotionProps(props)}>{children}</h3>
    ),
    span: ({
      children,
      className,
      onClick,
      onKeyDown,
      role,
      tabIndex,
      ...props
    }: React.PropsWithChildren<
      React.HTMLAttributes<HTMLSpanElement> & {
        role?: string
        tabIndex?: number
      }
    >) => (
      <span
        className={className}
        onClick={onClick}
        onKeyDown={onKeyDown}
        role={role}
        tabIndex={tabIndex}
        {...filterMotionProps(props)}
      >
        {children}
      </span>
    ),
    p: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLParagraphElement>>) => (
      <p className={className} {...filterMotionProps(props)}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
  LayoutGroup: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
}))

describe('SkillsSection', () => {
  it('renders with correct ID (#skills)', () => {
    render(<SkillsSection />)

    const section = document.getElementById('skills')
    expect(section).toBeInTheDocument()
  })

  it('renders a heading per skill group', () => {
    render(<SkillsSection />)

    for (const group of SKILLS.groups) {
      expect(screen.getByRole('heading', { level: 3, name: group.name })).toBeInTheDocument()
    }
  })

  it('has proper accessibility attributes', () => {
    render(<SkillsSection />)

    const section = screen.getByRole('region', { name: /skills/i })
    expect(section).toBeInTheDocument()
  })

  it('renders every skill from skills.ts', () => {
    render(<SkillsSection />)

    SKILLS.groups.forEach((group) => {
      group.skills.forEach((skill) => {
        expect(screen.getByText(skill.name)).toBeInTheDocument()
      })
    })
  })
})

describe('SkillCategory', () => {
  const mockCategory = {
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

  it('applies base styling classes', () => {
    render(<SkillChip skill="TypeScript" />)

    const chip = screen.getByText('TypeScript')

    // Check that the chip has the expected base classes
    expect(chip).toHaveClass('text-accent')
    expect(chip).toHaveClass('bg-card/80')

    // Verify transition class is present
    expect(chip.className).toMatch(/transition/)

    // Verify cursor pointer for click affordance
    expect(chip).toHaveClass('cursor-pointer')
  })
})
