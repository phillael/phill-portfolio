/**
 * Projects Section Tests
 *
 * Tests for the ProjectsSection and ProjectCard components:
 * - ProjectsSection renders with correct ID (#projects)
 * - All 3 project cards render from JSON data
 * - ProjectCard displays title, description, and tech stack
 * - Action links (Live Demo, View Code) render with correct hrefs
 * - Images have proper alt text
 */

import { render, screen } from '@testing-library/react'
import ProjectsSection from '@/components/ProjectsSection'
import ProjectCard from '@/components/ProjectCard'
import projectsData from '@/data/projects.json'
import { Project } from '@/types/content'

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
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className} {...filterMotionProps(props)}>{children}</div>
    ),
    section: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <section className={className} {...filterMotionProps(props)}>{children}</section>
    ),
    h2: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <h2 className={className} {...filterMotionProps(props)}>{children}</h2>
    ),
    h3: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <h3 className={className} {...filterMotionProps(props)}>{children}</h3>
    ),
    span: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className} {...filterMotionProps(props)}>{children}</span>
    ),
    a: ({ children, className, href, target, rel }: React.PropsWithChildren<{ className?: string; href?: string; target?: string; rel?: string }>) => (
      <a className={className} href={href} target={target} rel={rel}>{children}</a>
    ),
    article: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <article className={className}>{children}</article>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  useReducedMotion: () => false,
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
     
    <img alt={props.alt} src={props.src} />
  ),
}))

describe('ProjectsSection', () => {
  it('renders with correct ID (#projects)', () => {
    render(<ProjectsSection />)

    const section = document.getElementById('projects')
    expect(section).toBeInTheDocument()
  })

  it('renders the five project cards, in order, without a TimelyCare card', () => {
    render(<ProjectsSection />)

    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Quadzilla',
      'Number Slayers',
      'Rezmancer',
      'Jelly Resume',
      'Pong Multiverse Alpaca Squadron',
    ])
    expect((projectsData as Project[]).map((p) => p.title)).not.toContain('TimelyCare')
  })

  it('links Number Slayers at numberslayers.com and the Jelly Resume in the same tab', () => {
    render(<ProjectsSection />)

    const live = screen.getAllByRole('link', { name: /live demo/i })
    const slayers = live.find((a) => a.getAttribute('href') === 'https://numberslayers.com')
    expect(slayers).toHaveAttribute('target', '_blank')
    const jelly = live.find((a) => a.getAttribute('href') === '/resume')
    expect(jelly).toBeDefined()
    expect(jelly).not.toHaveAttribute('target')
    expect(jelly).not.toHaveAttribute('rel')
  })

  it('has proper accessibility attributes', () => {
    render(<ProjectsSection />)

    const section = screen.getByRole('region', { name: /projects/i })
    expect(section).toBeInTheDocument()
  })
})

describe('ProjectCard', () => {
  const mockProject: Project = {
    id: 'test-project',
    title: 'Test Project',
    description: 'A test project description for testing purposes.',
    techStack: ['React', 'TypeScript', 'Tailwind'],
    imageUrl: '/images/projects/test.png',
    liveUrl: 'https://example.com',
    repoUrl: 'https://github.com/test/repo',
  }

  it('displays title, description, and tech stack', () => {
    render(<ProjectCard project={mockProject} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText('A test project description for testing purposes.')).toBeInTheDocument()

    // Check tech stack badges
    mockProject.techStack.forEach((tech) => {
      expect(screen.getByText(tech)).toBeInTheDocument()
    })
  })

  it('renders action links with correct hrefs', () => {
    render(<ProjectCard project={mockProject} />)

    const liveLink = screen.getByRole('link', { name: /live demo/i })
    expect(liveLink).toHaveAttribute('href', 'https://example.com')
    expect(liveLink).toHaveAttribute('target', '_blank')
    expect(liveLink).toHaveAttribute('rel', 'noopener noreferrer')

    const codeLink = screen.getByRole('link', { name: /view code/i })
    expect(codeLink).toHaveAttribute('href', 'https://github.com/test/repo')
    expect(codeLink).toHaveAttribute('target', '_blank')
    expect(codeLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders image with proper alt text', () => {
    render(<ProjectCard project={mockProject} />)

    const image = screen.getByAltText('Test Project screenshot')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/images/projects/test.png')
  })

  it('opens an internal link in the same tab', () => {
    render(<ProjectCard project={{ ...mockProject, liveUrl: '/resume', repoUrl: undefined }} />)

    const liveLink = screen.getByRole('link', { name: /live demo/i })
    expect(liveLink).toHaveAttribute('href', '/resume')
    expect(liveLink).not.toHaveAttribute('target')
    expect(liveLink).not.toHaveAttribute('rel')
  })

  it('shows the placeholder when there is no screenshot yet', () => {
    render(<ProjectCard project={{ ...mockProject, imageUrl: undefined }} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getAllByText('Test Project')).toHaveLength(2) // the placeholder and the title
  })

  it('does not render View Code button when repoUrl is not provided', () => {
    const projectWithoutRepo: Project = {
      ...mockProject,
      repoUrl: undefined,
    }
    render(<ProjectCard project={projectWithoutRepo} />)

    expect(screen.queryByRole('link', { name: /view code/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /live demo/i })).toBeInTheDocument()
  })
})
