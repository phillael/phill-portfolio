/**
 * The 3D resume overlay on /resume: it mounts the engine on an aria-hidden canvas with
 * its HUD (Finder, navigator, bar, ×), wires the buttons and keyboard shortcuts to the
 * engine, and never mounts for reduced motion. The engine is mocked (jsdom has no WebGL2).
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import JellyResumeDirect from '@/components/jelly/JellyResumeDirect'
import JellyResumeCanvas from '@/components/jelly/JellyResumeCanvas'
import { createJellyEngine } from '@/lib/jelly/engine'

const engine = {
  openDirect: jest.fn(), load: jest.fn(), dispose: jest.fn(), find: jest.fn((q: string) => (q ? 27 : 0)),
  chaos: jest.fn(), burstAll: jest.fn(), healAll: jest.fn(), setShroom: jest.fn(), setSound: jest.fn(),
  setHoleMode: jest.fn(), setTilt: jest.fn((on: boolean) => Promise.resolve(on)), replayIntro: jest.fn(),
  resetView: jest.fn(), zoomBy: jest.fn(), setNavMode: jest.fn(), setUiInsets: jest.fn(), panKey: jest.fn(),
  navView: jest.fn(() => ({ fit: true, left: 0, top: 0, width: 1, height: 1 })), navTo: jest.fn(),
  drawMiniMap: jest.fn(), onFrame: jest.fn(() => () => {}), gesture: jest.fn(), holeAtCursor: jest.fn(),
  releaseHoleKey: jest.fn(),
}
jest.mock('@/lib/jelly/engine', () => ({ createJellyEngine: jest.fn(() => engine) }))
jest.mock('@/lib/jelly/snapshot', () => ({ loadSnapshot: jest.fn(() => Promise.resolve('snapshot')) }))
const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

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

describe('JellyResumeDirect (a direct visit to /resume)', () => {
  it('mounts the engine on an aria-hidden canvas and plays the direct entrance with ?find=', async () => {
    mediaQuery(false)
    window.history.replaceState(null, '', '/resume?find=React')
    const { container, unmount } = render(<JellyResumeDirect />)

    await waitFor(() => expect(container.querySelector('canvas')).not.toBeNull())
    const canvas = container.querySelector('canvas')!
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(createJellyEngine).toHaveBeenCalledWith(expect.objectContaining({ canvas }))
    expect(engine.openDirect).toHaveBeenCalledWith('React')
    await waitFor(() => expect(engine.load).toHaveBeenCalledWith('snapshot'))

    unmount()
    expect(engine.dispose).toHaveBeenCalled()
  })

  it('never mounts the engine for reduced motion', async () => {
    mediaQuery(true)
    const { container } = render(<JellyResumeDirect />)
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('canvas')).toBeNull()
    expect(createJellyEngine).not.toHaveBeenCalled()
  })
})

describe('the resume HUD', () => {
  const open = async (onClose = jest.fn()) => {
    mediaQuery(false)
    render(<JellyResumeCanvas onClose={onClose} />)
    const region = await screen.findByRole('region', { name: 'Interactive resume' })
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

    jest.useFakeTimers()
    fireEvent.keyDown(window, { key: 'Escape' })
    act(() => jest.advanceTimersByTime(500))
    jest.useRealTimers()
    expect(onClose).toHaveBeenCalled()
  })

  it('× fades out, then closes', async () => {
    const { onClose } = await open()
    jest.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Close the resume (Esc)' }))
    expect(onClose).not.toHaveBeenCalled()
    act(() => jest.advanceTimersByTime(500))
    jest.useRealTimers()
    expect(onClose).toHaveBeenCalled()
  })
})
