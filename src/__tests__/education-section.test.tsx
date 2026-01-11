/**
 * Education Section Tests
 *
 * Tests for the EducationSection and EducationCard components:
 * - EducationSection renders with correct ID (#education)
 * - All 3 education entries render from JSON data
 * - EducationCard displays credential and institution
 * - Section uses semantic HTML structure
 */

import { render, screen } from '@testing-library/react'
import EducationSection from '@/components/EducationSection'
import EducationCard from '@/components/EducationCard'
import educationData from '@/data/education.json'
import { Education } from '@/types/content'

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
    article: ({
      children,
      className,
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <article className={className}>{children}</article>
    ),
    section: ({
      children,
      className,
      id,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement> & { id?: string }>) => (
      <section className={className} id={id} {...filterMotionProps(props)}>{children}</section>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
}))

describe('EducationSection', () => {
  it('renders with correct ID (#education)', () => {
    render(<EducationSection />)

    const section = document.getElementById('education')
    expect(section).toBeInTheDocument()
  })

  it('renders all 3 education entries from JSON data', () => {
    render(<EducationSection />)

    // Check each credential is rendered
    ;(educationData as Education[]).forEach((entry) => {
      expect(screen.getByText(entry.credential)).toBeInTheDocument()
    })
  })

  it('has proper accessibility attributes', () => {
    render(<EducationSection />)

    const section = screen.getByRole('region', { name: /education and certifications/i })
    expect(section).toBeInTheDocument()
  })

  it('uses semantic HTML structure with article elements', () => {
    render(<EducationSection />)

    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(3)
  })
})

describe('EducationCard', () => {
  const mockEducation: Education = {
    id: 'test-cert',
    credential: 'Test Certificate',
    institution: 'Test University',
    platform: 'Online Course',
    year: '2023',
  }

  it('displays credential name prominently', () => {
    render(<EducationCard education={mockEducation} />)

    const credential = screen.getByText('Test Certificate')
    expect(credential).toBeInTheDocument()
    expect(credential.tagName).toBe('H3')
  })

  it('displays institution name', () => {
    render(<EducationCard education={mockEducation} />)

    expect(screen.getByText('Test University')).toBeInTheDocument()
  })

  it('displays year when provided', () => {
    render(<EducationCard education={mockEducation} />)

    expect(screen.getByText('2023')).toBeInTheDocument()
  })

  it('displays platform when provided', () => {
    render(<EducationCard education={mockEducation} />)

    expect(screen.getByText('Online Course')).toBeInTheDocument()
  })

  it('renders without year when not provided', () => {
    const educationWithoutYear: Education = {
      id: 'test-no-year',
      credential: 'Another Certificate',
      institution: 'Another Institution',
    }
    render(<EducationCard education={educationWithoutYear} />)

    expect(screen.getByText('Another Certificate')).toBeInTheDocument()
    expect(screen.getByText('Another Institution')).toBeInTheDocument()
  })
})
