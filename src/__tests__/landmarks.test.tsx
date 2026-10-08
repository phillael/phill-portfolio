/**
 * Landmarks and headings: one h1, a skip link that's the first tab stop,
 * main/footer landmarks, and sections labelled by their h2.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '@/app/page'
import Nav from '@/components/Nav'
import SkipLink from '@/components/SkipLink'

// AboutSection reads shroom mode; the real provider lives in the root layout
jest.mock('@/context/ShroomModeContext', () => ({
  useShroomMode: () => ({ isActive: false, setIsActive: jest.fn() }),
}))

// Same order as the root layout's <body>
const renderPage = () =>
  render(
    <>
      <SkipLink />
      <Nav />
      <HomePage />
    </>,
  )

describe('Landmarks and headings', () => {
  it('has exactly one h1', () => {
    renderPage()
    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('Phill Aelony, Software Engineer')
  })

  it('makes the skip link the first tab stop, targeting #main', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.tab()

    const skip = screen.getByRole('link', { name: /skip to main content/i })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('has a footer landmark after main', () => {
    renderPage()
    const footer = screen.getByRole('contentinfo')
    expect(screen.getByRole('main').compareDocumentPosition(footer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('labels every section that has an h2 with that h2', () => {
    const { container } = renderPage()
    const sections = Array.from(container.querySelectorAll('section')).filter((s) =>
      s.querySelector('h2'),
    )

    expect(sections.length).toBeGreaterThanOrEqual(5)
    sections.forEach((section) => {
      const h2 = section.querySelector('h2')!
      expect(h2.id).not.toBe('')
      expect(section).toHaveAttribute('aria-labelledby', h2.id)
      expect(section).not.toHaveAttribute('aria-label')
    })
  })
})
