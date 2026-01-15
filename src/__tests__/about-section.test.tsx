/**
 * About Section Tests
 *
 * Basic structural tests for the About section:
 * - Section has correct ID for navigation
 * - Section uses semantic HTML
 * - Bio paragraphs are present
 */

import { render, screen } from '@testing-library/react'
import AboutSection from '@/components/AboutSection'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <div className={className}>{children}</div>
    ),
    section: ({ children, className, id }: React.PropsWithChildren<{ className?: string; id?: string }>) => (
      <section className={className} id={id}>{children}</section>
    ),
    p: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <p className={className}>{children}</p>
    ),
    h2: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <h2 className={className}>{children}</h2>
    ),
    span: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
      <span className={className}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  useReducedMotion: () => false,
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}))

// Mock React Three Fiber to avoid WebGL setup
jest.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="r3f-canvas" />,
  useFrame: () => {},
  useThree: () => ({ gl: { domElement: { parentElement: null } }, setSize: () => {} }),
}))

// Mock @react-three/drei
jest.mock('@react-three/drei', () => ({
  Center: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

describe('About Section', () => {
  it('has correct ID (#about) for navigation', () => {
    render(<AboutSection />)

    const aboutSection = screen.getByRole('region', { name: /about/i })
    expect(aboutSection).toBeInTheDocument()
    expect(aboutSection).toHaveAttribute('id', 'about')
  })

  it('uses semantic HTML with proper heading structure', () => {
    render(<AboutSection />)

    const heading = screen.getByRole('heading', { level: 2, name: /about/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders bio paragraphs', () => {
    render(<AboutSection />)

    const paragraphs = screen.getAllByRole('paragraph')
    expect(paragraphs.length).toBeGreaterThanOrEqual(1)
  })

  it('renders space llama image with alt text', () => {
    render(<AboutSection />)

    const llamaImage = screen.getByAltText(/space llama/i)
    expect(llamaImage).toBeInTheDocument()
  })
})
