/**
 * Extended Navigation Tests
 *
 * Tests for navigation items:
 * - NavLinks renders all navigation items: Home, About, Experience, Skills, Projects, Contact
 * - Navigation links have correct href anchors
 * - Mobile menu includes all navigation items
 */

import { render, screen, fireEvent } from '@testing-library/react'
import NavLinks from '@/components/NavLinks'
import Nav from '@/components/Nav'

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
    nav: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <nav {...filterMotionProps(props)}>{children}</nav>
    ),
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...filterMotionProps(props)}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <span {...filterMotionProps(props)}>{children}</span>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...filterMotionProps(props)}>{children}</button>
    ),
    a: ({
      children,
      ...props
    }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a {...filterMotionProps(props)}>{children}</a>
    ),
    header: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <header {...filterMotionProps(props)}>{children}</header>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

describe('Extended Navigation', () => {
  it('renders all navigation items: Home, About, Experience, Skills, Projects, Contact', () => {
    render(<NavLinks />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const aboutLink = screen.getByRole('link', { name: /about/i })
    const experienceLink = screen.getByRole('link', { name: /experience/i })
    const skillsLink = screen.getByRole('link', { name: /skills/i })
    const projectsLink = screen.getByRole('link', { name: /projects/i })
    const contactLink = screen.getByRole('link', { name: /contact/i })

    expect(homeLink).toBeInTheDocument()
    expect(aboutLink).toBeInTheDocument()
    expect(experienceLink).toBeInTheDocument()
    expect(skillsLink).toBeInTheDocument()
    expect(projectsLink).toBeInTheDocument()
    expect(contactLink).toBeInTheDocument()
  })

  it('navigation links have correct href anchors', () => {
    render(<NavLinks />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const aboutLink = screen.getByRole('link', { name: /about/i })
    const experienceLink = screen.getByRole('link', { name: /experience/i })
    const skillsLink = screen.getByRole('link', { name: /skills/i })
    const projectsLink = screen.getByRole('link', { name: /projects/i })
    const contactLink = screen.getByRole('link', { name: /contact/i })

    expect(homeLink).toHaveAttribute('href', '#hero')
    expect(aboutLink).toHaveAttribute('href', '#about')
    expect(experienceLink).toHaveAttribute('href', '#experience')
    expect(skillsLink).toHaveAttribute('href', '#skills')
    expect(projectsLink).toHaveAttribute('href', '#projects')
    expect(contactLink).toHaveAttribute('href', '#contact')
  })

  it('mobile menu includes all navigation items', () => {
    render(<Nav />)

    // Open the mobile menu
    const menuButton = screen.getByRole('button', {
      name: /open navigation menu/i,
    })
    fireEvent.click(menuButton)

    // Check all navigation items are present in the mobile menu
    // getAllByRole because NavLinks is rendered twice (desktop and mobile)
    const homeLinks = screen.getAllByRole('link', { name: /home/i })
    const aboutLinks = screen.getAllByRole('link', { name: /about/i })
    const experienceLinks = screen.getAllByRole('link', { name: /experience/i })
    const skillsLinks = screen.getAllByRole('link', { name: /skills/i })
    const projectsLinks = screen.getAllByRole('link', { name: /projects/i })
    const contactLinks = screen.getAllByRole('link', { name: /contact/i })

    // Each link should appear at least twice (desktop + mobile)
    expect(homeLinks.length).toBeGreaterThanOrEqual(2)
    expect(aboutLinks.length).toBeGreaterThanOrEqual(2)
    expect(experienceLinks.length).toBeGreaterThanOrEqual(2)
    expect(skillsLinks.length).toBeGreaterThanOrEqual(2)
    expect(projectsLinks.length).toBeGreaterThanOrEqual(2)
    expect(contactLinks.length).toBeGreaterThanOrEqual(2)
  })
})
