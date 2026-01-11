/**
 * Extended Navigation Tests
 *
 * Tests for the new navigation items added in Phase 2:
 * - NavLinks renders all navigation items: Home, About, Experience, Skills, Projects, Education
 * - Navigation links have correct href anchors
 * - Mobile menu includes all new navigation items
 */

import { render, screen, fireEvent } from '@testing-library/react'
import NavLinks from '@/components/NavLinks'
import Nav from '@/components/Nav'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    nav: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <nav {...props}>{children}</nav>
    ),
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <span {...props}>{children}</span>
    ),
    button: ({
      children,
      ...props
    }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button {...props}>{children}</button>
    ),
    a: ({
      children,
      ...props
    }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => (
      <a {...props}>{children}</a>
    ),
    header: ({
      children,
      ...props
    }: React.PropsWithChildren<React.HTMLAttributes<HTMLElement>>) => (
      <header {...props}>{children}</header>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => (
    <>{children}</>
  ),
}))

describe('Extended Navigation', () => {
  it('renders all navigation items: Home, About, Experience, Skills, Projects, Education', () => {
    render(<NavLinks />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const aboutLink = screen.getByRole('link', { name: /about/i })
    const experienceLink = screen.getByRole('link', { name: /experience/i })
    const skillsLink = screen.getByRole('link', { name: /skills/i })
    const projectsLink = screen.getByRole('link', { name: /projects/i })
    const educationLink = screen.getByRole('link', { name: /education/i })

    expect(homeLink).toBeInTheDocument()
    expect(aboutLink).toBeInTheDocument()
    expect(experienceLink).toBeInTheDocument()
    expect(skillsLink).toBeInTheDocument()
    expect(projectsLink).toBeInTheDocument()
    expect(educationLink).toBeInTheDocument()
  })

  it('navigation links have correct href anchors', () => {
    render(<NavLinks />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const aboutLink = screen.getByRole('link', { name: /about/i })
    const experienceLink = screen.getByRole('link', { name: /experience/i })
    const skillsLink = screen.getByRole('link', { name: /skills/i })
    const projectsLink = screen.getByRole('link', { name: /projects/i })
    const educationLink = screen.getByRole('link', { name: /education/i })

    expect(homeLink).toHaveAttribute('href', '#hero')
    expect(aboutLink).toHaveAttribute('href', '#about')
    expect(experienceLink).toHaveAttribute('href', '#experience')
    expect(skillsLink).toHaveAttribute('href', '#skills')
    expect(projectsLink).toHaveAttribute('href', '#projects')
    expect(educationLink).toHaveAttribute('href', '#education')
  })

  it('mobile menu includes all new navigation items', () => {
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
    const educationLinks = screen.getAllByRole('link', { name: /education/i })

    // Each link should appear at least twice (desktop + mobile)
    expect(homeLinks.length).toBeGreaterThanOrEqual(2)
    expect(aboutLinks.length).toBeGreaterThanOrEqual(2)
    expect(experienceLinks.length).toBeGreaterThanOrEqual(2)
    expect(skillsLinks.length).toBeGreaterThanOrEqual(2)
    expect(projectsLinks.length).toBeGreaterThanOrEqual(2)
    expect(educationLinks.length).toBeGreaterThanOrEqual(2)
  })
})
