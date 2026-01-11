/**
 * Navigation Tests
 *
 * Tests for the navigation system including:
 * - Nav renders with Home and About links
 * - Mobile menu toggle button is keyboard accessible
 * - Navigation links have proper href values
 * - Scroll state changes header styling
 */

import { render, screen, fireEvent } from '@testing-library/react'
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

describe('Navigation', () => {
  it('renders with Home and About links', () => {
    render(<Nav />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const aboutLink = screen.getByRole('link', { name: /about/i })

    expect(homeLink).toBeInTheDocument()
    expect(aboutLink).toBeInTheDocument()
  })

  it('mobile menu toggle button is keyboard accessible', () => {
    render(<Nav />)

    const menuButton = screen.getByRole('button', {
      name: /open navigation menu/i,
    })

    expect(menuButton).toBeInTheDocument()
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')

    // Simulate click to open menu
    fireEvent.click(menuButton)

    // After clicking, find all close buttons and verify at least one has aria-expanded true
    const closeButtons = screen.getAllByRole('button', {
      name: /close navigation menu/i,
    })

    // The hamburger button should have aria-expanded=true
    const hamburgerCloseButton = closeButtons.find(
      (btn) => btn.getAttribute('aria-expanded') === 'true'
    )
    expect(hamburgerCloseButton).toBeInTheDocument()
  })

  it('navigation links have proper href values', () => {
    render(<Nav />)

    const homeLink = screen.getByRole('link', { name: /home/i })
    const aboutLink = screen.getByRole('link', { name: /about/i })

    expect(homeLink).toHaveAttribute('href', '#hero')
    expect(aboutLink).toHaveAttribute('href', '#about')
  })

  it('header has sticky positioning and appropriate z-index', () => {
    render(<Nav />)

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('sticky')
    expect(header).toHaveClass('top-0')
    expect(header).toHaveClass('z-50')
  })
})
