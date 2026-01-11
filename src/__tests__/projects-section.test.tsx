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

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
      <div className={className} {...props}>{children}</div>
    ),
    h2: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
    h3: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLHeadingElement>>) => (
      <h3 className={className} {...props}>{children}</h3>
    ),
    span: ({
      children,
      className,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) => (
      <span className={className} {...props}>{children}</span>
    ),
    a: ({
      children,
      className,
      href,
      target,
      rel,
    }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a className={className} href={href} target={target} rel={rel}>{children}</a>
    ),
    article: ({
      children,
      className,
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <article className={className}>{children}</article>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}))

describe('ProjectsSection', () => {
  it('renders with correct ID (#projects)', () => {
    render(<ProjectsSection />)

    const section = document.getElementById('projects')
    expect(section).toBeInTheDocument()
  })

  it('renders all 3 project cards from JSON data', () => {
    render(<ProjectsSection />)

    // Check each project title is rendered
    ;(projectsData as Project[]).forEach((project) => {
      expect(screen.getByText(project.title)).toBeInTheDocument()
    })
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
