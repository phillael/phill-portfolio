/**
 * HighlightTile: one TimelyCare highlight in the Experience section (mockup E2's HUD tile).
 * A button opens one sentence of detail; its number counts up once it scrolls into view,
 * written straight into React's text node (no state per frame), never with reduced motion.
 */

import { act, render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import HighlightTile, { countFrame, splitMetric } from '@/components/experience/HighlightTile'
import { career } from '@/data/career'

const [nurture, payouts, , care] = career.jobs[0].tiles

// A controllable IntersectionObserver and rAF
let observers: { cb: IntersectionObserverCallback; el?: Element }[] = []
let frames: FrameRequestCallback[] = []
const intersect = (ratio: number) =>
  act(() => {
    for (const o of observers)
      o.cb([{ isIntersecting: ratio > 0, intersectionRatio: ratio, target: o.el } as IntersectionObserverEntry], {} as IntersectionObserver)
  })
const runFrame = (t: number) =>
  act(() => {
    const run = frames
    frames = []
    run.forEach((f) => f(t))
  })
const setReducedMotion = (on: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

const originalIO = window.IntersectionObserver
const originalMatchMedia = window.matchMedia
beforeEach(() => {
  observers = []
  frames = []
  window.IntersectionObserver = class {
    cb: IntersectionObserverCallback
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb
      observers.push(this as unknown as { cb: IntersectionObserverCallback })
    }
    observe(el: Element) {
      observers[observers.length - 1].el = el
    }
    unobserve() {}
    disconnect() {
      observers = observers.filter((o) => o.cb !== this.cb)
    }
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((f) => {
    frames.push(f)
    return frames.length
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  setReducedMotion(false)
})
afterEach(() => {
  window.IntersectionObserver = originalIO
  window.matchMedia = originalMatchMedia
  jest.restoreAllMocks()
})

describe('splitMetric / countFrame', () => {
  it('splits a trailing unit off the number', () => {
    expect(splitMetric('~5 wks')).toEqual({ value: '~5', unit: 'wks' })
    expect(splitMetric('6,700+')).toEqual({ value: '6,700+', unit: undefined })
  })

  it('eases from zero to the final value, keeping its prefix, suffix and separators', () => {
    expect(countFrame('6,700+', 0)).toBe('0+')
    expect(countFrame('6,700+', 0.5)).toBe('5,863+') // 1 - 0.5³ = 0.875
    expect(countFrame('6,700+', 1)).toBe('6,700+')
    expect(countFrame('11,889', 0.9)).toBe('11,877')
    expect(countFrame('1,234,567', 0.99)).toBe('1,234,566')
    expect(countFrame('~68K', 0.5)).toBe('~60K')
    expect(countFrame('~750', 1)).toBe('~750')
    expect(countFrame('none', 0.5)).toBeNull()
  })
})

describe('HighlightTile', () => {
  it('is a button named by its title and described by its number, label and stack', () => {
    render(<HighlightTile tile={payouts} />)
    const button = screen.getByRole('button', { name: payouts.title })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    // the dots between technologies are aria-hidden
    // the number is described in words a screen reader says cleanly ("about 750", not "tilde 750")
    expect(button).toHaveAccessibleDescription(/^about 750 clinicians paid through it Built with: React\s+TypeScript\s+Node\.js\s+MySQL\s+AWS\s+Terraform$/)
    expect(screen.getByText(payouts.name)).toBeInTheDocument()
  })

  it('renders the final number for no-JS and screen readers, and waits at zero until it counts', () => {
    const { container } = render(<HighlightTile tile={care} />)
    // the visible number is decoration; its sr-only twin is what's read
    const visible = container.querySelector('[data-count]')!
    expect(visible.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getByText('6,700 plus', { selector: '.sr-only' })).toBeInTheDocument()
    // the sizer keeps the final value (and the width); the armed count shows its zero frame, never final → 0
    const sizer = visible.parentElement!.querySelector(':scope > :not([data-count])')!
    expect(sizer.textContent).toBe('6,700+')
    expect(visible.textContent).toBe('0+')
    intersect(0.2) // revealed, not yet counting
    expect(visible.textContent).toBe('0+')
    // the unit sits next to the number ("~5 wks"), inside the same decorative number
    const { container: c2 } = render(<HighlightTile tile={nurture} />)
    const num = c2.querySelector('[data-count]')!.closest('[aria-hidden="true"]')!
    expect(num.lastElementChild!.textContent).toBe('wks')
    expect(num.firstElementChild!.firstElementChild!.textContent).toBe('~5') // the sizer: the final value
  })

  it('opens and closes its detail', async () => {
    const user = userEvent.setup()
    render(<HighlightTile tile={payouts} />)
    const button = screen.getByRole('button', { name: payouts.title })
    const detail = document.getElementById(button.getAttribute('aria-controls')!)!
    expect(detail).toHaveTextContent(/audits every payout in ~3 minutes instead of 44/)

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard(' ')
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('renders **bold** in the detail as <strong>', () => {
    render(<HighlightTile tile={nurture} />)
    expect(screen.getByText('MCP server').tagName).toBe('STRONG')
  })

  it('closes on Escape, keeps focus on its button, and keeps the Escape to itself', async () => {
    const user = userEvent.setup()
    const outside = jest.fn()
    window.addEventListener('keydown', outside)
    render(<HighlightTile tile={payouts} />)
    const button = screen.getByRole('button', { name: payouts.title })

    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
    expect(outside).not.toHaveBeenCalled() // e.g. shroom mode's Esc stays on

    // closed: Escape is the page's again
    await user.keyboard('{Escape}')
    expect(outside).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', outside)
  })

  it('counts its number up once in view, writing React’s own text node', () => {
    jest.spyOn(performance, 'now').mockReturnValue(1000)
    const { container } = render(<HighlightTile tile={care} />)
    const visible = container.querySelector('[data-count]')!
    const node = visible.firstChild

    intersect(0.5)
    runFrame(1000 + 650) // halfway through 1.3 s
    expect(visible.textContent).toBe('5,863+')
    expect(visible.firstChild).toBe(node) // the same text node, not a new one
    // the final value keeps holding the number's width, so counting never moves the label (no layout shift)
    const sizer = visible.parentElement!.querySelector(':scope > :not([data-count])')!
    expect(sizer.textContent).toBe('6,700+')
    runFrame(1000 + 1300)
    expect(visible.textContent).toBe('6,700+')
    expect(frames).toHaveLength(0) // done: no more frames
  })

  it('does not count up (or animate) with reduced motion', () => {
    setReducedMotion(true)
    const { container } = render(<HighlightTile tile={care} />)
    const tile = container.firstElementChild as HTMLElement
    intersect(1)
    expect(frames).toHaveLength(0)
    expect(container.querySelector('[data-count]')!.textContent).toBe('6,700+')
    // shown at once, never hidden for a reveal
    expect(tile).toHaveAttribute('data-in')
    expect(tile).not.toHaveAttribute('data-armed')
  })

  it('has no axe violations, open or closed', async () => {
    const { container } = render(<HighlightTile tile={nurture} wide />)
    expect(await axe(container)).toHaveNoViolations()
    fireEvent.click(screen.getByRole('button', { name: nurture.title }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
