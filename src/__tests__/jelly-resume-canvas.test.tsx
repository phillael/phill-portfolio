/**
 * The 3D resume overlay on /resume: it mounts the engine on an aria-hidden canvas with
 * its HUD (Finder, navigator, bar, ×), wires the buttons and keyboard shortcuts to the
 * engine, and never mounts for reduced motion. The engine is mocked (jsdom has no WebGL2).
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { axe } from 'jest-axe'
import JellyResumeHost from '@/components/jelly/JellyResumeHost'
import JellyResumeRoute from '@/components/jelly/JellyResumeRoute'
import JellyResumeCanvas from '@/components/jelly/JellyResumeCanvas'
import { createJellyEngine } from '@/lib/jelly/engine'
import { registerHero } from '@/components/jelly/resumeTrigger'
import { registerSiteMusic } from '@/lib/site-music'

const engine = {
  openDirect: jest.fn(), openFromHero: jest.fn(() => false), close: jest.fn(() => false), load: jest.fn(), dispose: jest.fn(), find: jest.fn((q: string) => (q ? 27 : 0)),
  chaos: jest.fn(), burstAll: jest.fn(), healAll: jest.fn(), setShroom: jest.fn(), setSound: jest.fn(),
  setHoleMode: jest.fn(), setTilt: jest.fn((on: boolean) => Promise.resolve(on)), replayIntro: jest.fn(),
  resetView: jest.fn(), zoomBy: jest.fn(), setNavMode: jest.fn(), setUiInsets: jest.fn(), panKey: jest.fn(),
  navView: jest.fn(() => ({ fit: true, left: 0, top: 0, width: 1, height: 1 })), navTo: jest.fn(),
  drawMiniMap: jest.fn(), onFrame: jest.fn(() => () => {}), gesture: jest.fn(), holeAtCursor: jest.fn(),
  releaseHoleKey: jest.fn(),
}
// the real engine reports onOpen once its entrance starts; the mock does it on openDirect
type Callbacks = { onOpen?: () => void; onLanded?: () => void; onClosed?: () => void }
let callbacks: Callbacks = {}
jest.mock('@/lib/jelly/engine', () => ({
  createJellyEngine: jest.fn((opts: Callbacks) => {
    callbacks = opts
    engine.openDirect.mockImplementation(() => opts.onOpen?.())
    return engine
  }),
}))
jest.mock('@/lib/jelly/snapshot', () => ({ loadSnapshotOnce: jest.fn(() => Promise.resolve('snapshot')) }))
const push = jest.fn()
const back = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, back }) }))

beforeAll(() => {
  global.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const mediaQuery = (reduced: boolean) =>
  jest.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
  window.history.replaceState(null, '', '/')
})

describe('JellyResumeHost (the overlay, driven by the URL)', () => {
  const renderHost = () => render(<JellyResumeHost />)

  it('stays empty (no engine) until a /resume route asks for it', async () => {
    mediaQuery(false)
    const { container } = renderHost()
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('canvas')).toBeNull()
    expect(createJellyEngine).not.toHaveBeenCalled()
  })

  it('a direct visit mounts the engine on an aria-hidden canvas and plays the entrance with ?find=', async () => {
    mediaQuery(false)
    window.history.replaceState(null, '', '/resume?find=React')
    const { container } = renderHost()
    const route = render(<JellyResumeRoute mode="direct" />)

    await waitFor(() => expect(container.querySelector('canvas')).not.toBeNull())
    const canvas = container.querySelector('canvas')!
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(createJellyEngine).toHaveBeenCalledWith(expect.objectContaining({ canvas }))
    expect(engine.openDirect).toHaveBeenCalledWith('React')
    await waitFor(() => expect(engine.load).toHaveBeenCalledWith('snapshot'))

    // leaving the route fades the overlay out, then disposes the engine
    route.unmount()
    await waitFor(() => expect(container.querySelector('canvas')).toBeNull(), { timeout: 1500 })
    expect(engine.dispose).toHaveBeenCalled()
  })

  it('× closes an overlay with Back, and a direct visit by fading home', async () => {
    mediaQuery(false)
    renderHost()
    const overlay = render(<JellyResumeRoute mode="overlay" />)
    const x = await screen.findByRole('button', { name: 'Close the resume (Esc)' })
    fireEvent.click(x)
    fireEvent.click(x) // a second close before the route changes must not go back twice
    expect(back).toHaveBeenCalledTimes(1)
    overlay.unmount() // (what Back does) → it closes, then unmounts
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Interactive resume' })).toBeNull(), { timeout: 1500 })

    render(<JellyResumeRoute mode="direct" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Close the resume (Esc)' }))
    expect(push).toHaveBeenCalledWith('/')
  })

  it('never mounts the engine for reduced motion', async () => {
    mediaQuery(true)
    const { container } = renderHost()
    render(<JellyResumeRoute mode="direct" />)
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('canvas')).toBeNull()
    expect(createJellyEngine).not.toHaveBeenCalled()
  })
})

describe('the resume HUD', () => {
  const open = async (onClose = jest.fn()) => {
    mediaQuery(false)
    render(<JellyResumeCanvas onClose={onClose} />)
    const region = await screen.findByRole('dialog', { name: 'Interactive resume' })
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
    return { region, onClose }
  }

  it('has every control with its label, and the PDF downloads', async () => {
    await open()
    const pdf = screen.getByRole('link', { name: 'Download the PDF' })
    expect(pdf).toHaveAttribute('href', '/Phillip_Aelony_Resume_2025.pdf')
    expect(pdf).toHaveAttribute('download')
    for (const name of [/^Chaos/, /^Burst all/, /^Heal all/, /^Shroom/, /^Black hole/, /^Tilt/, /^Sound/, /^Intro/, /^View/]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Close the resume (Esc)' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Find a skill in the resume' })).toBeInTheDocument()
    const nav = screen.getByRole('group', { name: 'Page navigator' })
    expect(within(nav).getByRole('button', { name: /Rotate/ })).toHaveAttribute('aria-pressed', 'true')
    for (const name of ['Zoom out (−)', 'Show the whole page (0)', 'Zoom in (+)']) expect(within(nav).getByRole('button', { name })).toBeInTheDocument()
    for (const chip of ['AI', 'React', 'TypeScript', 'AWS', 'Node', 'Data', 'Impact', 'Music']) expect(screen.getByRole('button', { name: chip })).toBeInTheDocument()
  })

  it('wires the buttons to the engine', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: /^Chaos/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Burst all/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Heal all/ }))
    expect(engine.chaos).toHaveBeenCalled()
    expect(engine.burstAll).toHaveBeenCalled()
    expect(engine.healAll).toHaveBeenCalled()

    const shroom = screen.getByRole('button', { name: /^Shroom/ })
    fireEvent.click(shroom)
    expect(engine.setShroom).toHaveBeenCalledWith(true)
    expect(shroom).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /^Sound/ }))
    expect(engine.setSound).toHaveBeenCalledWith(false)
    expect(screen.getByRole('button', { name: /^Muted/ })).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByRole('button', { name: /^Black hole/ }))
    expect(engine.setHoleMode).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: /Pan/ }))
    expect(engine.setNavMode).toHaveBeenCalledWith('pan')
  })

  it('a chip lights up its words and shows the count', async () => {
    await open()
    fireEvent.click(screen.getByRole('button', { name: 'AI' }))
    expect(engine.find).toHaveBeenCalledWith('AI')
    expect(screen.getByRole('button', { name: 'AI' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('27 words')).toBeInTheDocument()
  })

  it('keyboard: shortcuts, / focuses the Finder, Esc clears it and then closes', async () => {
    const { onClose } = await open()
    fireEvent.keyDown(window, { key: 'c' })
    expect(engine.chaos).toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(engine.panKey).toHaveBeenCalledWith('ArrowDown')
    const toggleMusic = jest.fn()
    registerSiteMusic({ getSource: () => null, isPlaying: () => false, toggle: toggleMusic })
    fireEvent.keyDown(window, { key: 'p' }) // P plays/pauses the site's player
    expect(toggleMusic).toHaveBeenCalled()
    registerSiteMusic(null)
    fireEvent.keyDown(window, { key: 'c', metaKey: true }) // ⌘C is copy, not chaos
    expect(engine.chaos).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: '/' })
    const box = screen.getByRole('searchbox')
    expect(box).toHaveFocus()
    fireEvent.change(box, { target: { value: 'react' } })
    fireEvent.keyDown(box, { key: 'c' }) // typing isn't a shortcut
    expect(engine.chaos).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'AI' })) // focus on a chip, a search running
    fireEvent.keyDown(screen.getByRole('button', { name: 'AI' }), { key: 'Escape' })
    expect(box).toHaveValue('')
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('× asks to close; while fading out the controls are off', async () => {
    const onClose = jest.fn()
    mediaQuery(false)
    const { rerender } = render(<JellyResumeCanvas onClose={onClose} />)
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Close the resume (Esc)' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(<JellyResumeCanvas onClose={onClose} closing />)
    expect(screen.getByRole('dialog', { name: 'Interactive resume' })).toHaveClass('opacity-0')
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'c' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(engine.chaos).not.toHaveBeenCalled()
  })
})

describe('closing over the home page', () => {
  const heroSetup = () => {
    const btn = document.createElement('button')
    const img = document.createElement('img')
    btn.appendChild(img)
    document.body.appendChild(btn)
    const page = document.createElement('div')
    page.id = 'shroom-target'
    document.body.appendChild(page)
    registerHero(img)
    return { btn, img, page, cleanup: () => { registerHero(null); btn.remove(); page.remove() } }
  }

  it('plays the reverse onto the hero: the page returns when the sparks land, then focus goes back', async () => {
    const { btn, img, page, cleanup } = heroSetup()
    mediaQuery(false)
    engine.close.mockReturnValue(true)
    const onClosed = jest.fn()
    const { rerender } = render(<JellyResumeCanvas mode="overlay" onClose={jest.fn()} onClosed={onClosed} />)
    await waitFor(() => expect(engine.load).toHaveBeenCalled())

    rerender(<JellyResumeCanvas mode="overlay" onClose={jest.fn()} onClosed={onClosed} closing />)
    expect(engine.close).toHaveBeenCalledWith(img)
    expect(screen.getByRole('dialog', { name: 'Interactive resume' })).not.toHaveClass('opacity-0') // the canvas plays it, no fade
    act(() => callbacks.onLanded?.())
    expect(page).toHaveClass('jelly-returning')
    expect(onClosed).not.toHaveBeenCalled()
    act(() => callbacks.onClosed?.())
    expect(onClosed).toHaveBeenCalled()
    expect(btn).toHaveFocus()
    cleanup()
  })

  it('fades out instead when the engine can’t close onto the photo', async () => {
    const { img, page, cleanup } = heroSetup()
    img.style.visibility = 'hidden'
    mediaQuery(false)
    engine.close.mockReturnValue(false)
    const onClosed = jest.fn()
    const { rerender } = render(<JellyResumeCanvas mode="overlay" onClose={jest.fn()} onClosed={onClosed} />)
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
    rerender(<JellyResumeCanvas mode="overlay" onClose={jest.fn()} onClosed={onClosed} closing />)
    expect(screen.getByRole('dialog', { name: 'Interactive resume' })).toHaveClass('opacity-0')
    expect(page).toHaveClass('jelly-returning')
    expect(img.style.visibility).toBe('')
    await waitFor(() => expect(onClosed).toHaveBeenCalled(), { timeout: 1500 })
    cleanup()
  })
})

describe('the 3D resume is accessible', () => {
  const page = () => {
    const main = document.createElement('div')
    main.id = 'shroom-target'
    const link = document.createElement('a')
    link.href = '#main'
    link.textContent = 'Skip to main content'
    document.body.prepend(link)
    document.body.appendChild(main)
    return { main, link, cleanup: () => { main.remove(); link.remove() } }
  }

  it('makes everything under it inert while it is up, and gives it back after', async () => {
    const { main, link, cleanup } = page()
    mediaQuery(false)
    const { unmount } = render(<JellyResumeCanvas onClose={jest.fn()} />)
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
    expect(main.inert).toBe(true)
    expect(link.inert).toBe(true)
    unmount()
    expect(main.inert).toBe(false)
    expect(link.inert).toBe(false)
    cleanup()
  })

  it('is a modal dialog whose text equivalent is the resume (the canvas is aria-hidden)', async () => {
    mediaQuery(false)
    render(<JellyResumeCanvas onClose={jest.fn()} />)
    const dialog = await screen.findByRole('dialog', { name: 'Interactive resume' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByRole('heading', { level: 1, name: 'Phill Aelony' })).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Experience' })).toBeInTheDocument()
    // the copy has nothing to tab to: the HUD and × are the only stops
    const copy = within(dialog).getByRole('heading', { level: 1 }).closest('.sr-only')!
    expect(copy.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0)
  })

  it('has no axe violations', async () => {
    mediaQuery(false)
    const { container } = render(<JellyResumeCanvas onClose={jest.fn()} />)
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results).toHaveNoViolations()
  })

  it('ignores its shortcuts while focus is elsewhere (e.g. the music player’s panel)', async () => {
    mediaQuery(false)
    const onClose = jest.fn()
    render(<JellyResumeCanvas onClose={onClose} />)
    await waitFor(() => expect(engine.load).toHaveBeenCalled())
    const panel = document.createElement('button')
    document.body.appendChild(panel)
    fireEvent.keyDown(panel, { key: 'Escape' })
    fireEvent.keyDown(panel, { key: 'c' })
    expect(onClose).not.toHaveBeenCalled()
    expect(engine.chaos).not.toHaveBeenCalled()
    panel.remove()
  })
})
