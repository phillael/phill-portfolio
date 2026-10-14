/**
 * Play mode's UI on the 3D resume: the 🎮 Play button and PLAYER 1 START, the keys, the
 * Play HUD (✕ Exit, the toast, the live region, the finish card, the climb meter), and Esc
 * layering. The engine is mocked (WebGL2 isn't in jsdom); Play's events are fired by hand.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import JellyResumeCanvas from '@/components/jelly/JellyResumeCanvas'
import { fmtTime, meterMode } from '@/components/jelly/JellyPlayHud'
import type { PlayEvent, PlayState } from '@/lib/jelly/play'
import { registerSiteMusic } from '@/lib/site-music'

const listeners = new Set<(e: PlayEvent) => void>()
const fire = (e: PlayEvent) => listeners.forEach((f) => f(e))
let playing = false
const state: PlayState = {
  x: 0, y: 0, z: 0, vx: 0, vy: 0, grounded: true, facing: 1, line: 0, clip: 'idle', smashing: false, pounding: false, falling: false,
  entering: false, checkpoint: -1, timeMs: 0, started: false, coins: 0, total: 27, finished: false, bestMs: null,
}
const play = {
  enter: jest.fn(async () => { playing = true; fire({ type: 'enter' }); return true }),
  exit: jest.fn(() => { if (!playing) return; playing = false; fire({ type: 'exit' }) }),
  again: jest.fn(),
  input: { left: false, right: false, jump: false, down: false, smash: false, pressed: new Set<string>() },
  params: {},
  state: jest.fn(() => (playing ? state : null)),
  onEvent: jest.fn((f: (e: PlayEvent) => void) => { listeners.add(f); return () => { listeners.delete(f) } }),
  isOn: jest.fn(() => playing),
  levelInfo: jest.fn(() => ({ top: 5, bottom: -5, checkpoints: [{ year: 2026, title: 'Generative AI Engineer', y: 2 }, { year: 1998, title: 'Guitarist & Composer', y: -4 }] })),
}
const engine = {
  openDirect: jest.fn(), openFromHero: jest.fn(() => false), close: jest.fn(() => false), load: jest.fn(() => Promise.resolve()), dispose: jest.fn(), find: jest.fn(() => 0),
  chaos: jest.fn(), burstAll: jest.fn(), healAll: jest.fn(), setShroom: jest.fn(), setSound: jest.fn(),
  setHoleMode: jest.fn(), setTilt: jest.fn((on: boolean) => Promise.resolve(on)), replayIntro: jest.fn(),
  resetView: jest.fn(), zoomBy: jest.fn(), setNavMode: jest.fn(), setUiInsets: jest.fn(), panKey: jest.fn(),
  navView: jest.fn(() => ({ fit: true, left: 0, top: 0, width: 1, height: 1 })), navTo: jest.fn(),
  drawMiniMap: jest.fn(), onFrame: jest.fn(() => () => {}), gesture: jest.fn(), holeAtCursor: jest.fn(), releaseHoleKey: jest.fn(),
  project: jest.fn(() => [120, 80]), startSpot: jest.fn(() => [3.7, 5, 0]),
  play,
}
jest.mock('@/lib/jelly/engine', () => ({
  createJellyEngine: jest.fn((opts: { onOpen?: () => void }) => {
    engine.openDirect.mockImplementation(() => opts.onOpen?.())
    return engine
  }),
}))
jest.mock('@/lib/jelly/snapshot', () => ({ loadSnapshotOnce: jest.fn(() => Promise.resolve('snapshot')), releaseSnapshot: jest.fn() }))

beforeAll(() => {
  // jsdom has no PointerEvent: a MouseEvent (it has clientX) that carries a pointerId
  if (!window.PointerEvent) {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 0
      }
    }
    window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent
  }
  global.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

/** matchMedia: the given queries match (by substring), nothing else (so no reduced motion) */
const media = (...matching: string[]) =>
  jest.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: matching.some((m) => query.includes(m)), media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
  )

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
  listeners.clear()
  playing = false
  Object.assign(state, { finished: false, checkpoint: -1 })
  play.enter.mockImplementation(async () => { playing = true; fire({ type: 'enter' }); return true })
})

const open = async (...matching: string[]) => {
  media(...matching)
  const onClose = jest.fn()
  render(<JellyResumeCanvas onClose={onClose} />)
  await screen.findByRole('button', { name: /^Chaos/ })
  return { onClose }
}

describe('starting Play mode', () => {
  it('🎮 Play comes first in the bar, says J, and shows Loading… then Play unavailable if it fails', async () => {
    await open()
    const btn = screen.getByRole('button', { name: 'Play (J)' }) // (the 🎮 is aria-hidden)
    expect(btn).toHaveAttribute('aria-keyshortcuts', 'J')
    expect(btn).toHaveAttribute('title', 'Play as Phill (J)')
    expect(btn.parentElement!.firstElementChild).toBe(btn)
    let done: (ok: boolean) => void = () => {}
    play.enter.mockImplementationOnce(() => new Promise<boolean>((r) => (done = r)))
    fireEvent.click(btn)
    expect(btn).toHaveTextContent('Loading…')
    expect(btn).toHaveAttribute('aria-busy', 'true')
    await act(async () => done(false))
    expect(btn).toHaveTextContent('Play unavailable')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('title', "Play mode couldn't load")
  })

  it('PLAYER 1 START sits on the page while not playing, and starts Play', async () => {
    await open()
    const start = screen.getByRole('button', { name: 'Player 1 start: play as Phill (J)' })
    expect(start).toHaveTextContent('PLAYER 1 START')
    expect(start).toHaveAttribute('aria-keyshortcuts', 'J')
    fireEvent.click(start)
    await waitFor(() => expect(play.enter).toHaveBeenCalled())
    await waitFor(() => expect(start).toHaveAttribute('inert')) // hidden while playing
  })
})

describe('playing', () => {
  const startPlaying = async () => {
    const r = await open()
    fireEvent.keyDown(window, { key: 'j' })
    await screen.findByRole('button', { name: 'Leave Play mode (Esc)' })
    return r
  }

  it("hides the Finder, the navigator and the bar (inert) and puts ✕ Exit where × was", async () => {
    await startPlaying()
    expect(screen.getByRole('searchbox', { hidden: true }).closest('[inert]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Close the resume (Esc)', hidden: true })).toHaveAttribute('inert')
    const exit = screen.getByRole('button', { name: 'Leave Play mode (Esc)' })
    expect(exit).toHaveTextContent('Exit')
    fireEvent.click(exit)
    expect(play.exit).toHaveBeenCalled()
  })

  it('Esc leaves Play first, and only the next Esc closes the resume', async () => {
    const { onClose } = await startPlaying()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(play.exit).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Leave Play mode (Esc)' })).toBeNull())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('his keys: W and ↑ jump, Space smashes (a tap still counts), ↓ drops; X is nothing; the rest of the shortcuts are off', async () => {
    await startPlaying()
    fireEvent.keyDown(window, { key: ' ' })
    expect(play.input.smash).toBe(true)
    expect(play.input.pressed.has('smash')).toBe(true)
    fireEvent.keyUp(window, { key: ' ' })
    expect(play.input.smash).toBe(false)
    fireEvent.keyDown(window, { key: 'w' })
    expect(play.input.jump).toBe(true)
    fireEvent.keyUp(window, { key: 'w' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(play.input.jump).toBe(true)
    fireEvent.keyUp(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(play.input.down).toBe(true)
    fireEvent.keyUp(window, { key: 'ArrowDown' })
    play.input.pressed.clear()
    fireEvent.keyDown(window, { key: 'x' })
    fireEvent.keyDown(window, { key: 'c' })
    expect(play.input.pressed.size).toBe(0)
    expect(engine.chaos).not.toHaveBeenCalled()
    expect(engine.holeAtCursor).not.toHaveBeenCalled()
  })

  it('shows the keys and announces Play, checkpoints and (throttled) coins', async () => {
    await startPlaying()
    expect(screen.getByText('Space').closest('div')).toHaveTextContent('← → run·W / ↑ jump·↓ drop (in the air: pound)·Space smash·Esc exit')
    const live = document.querySelector('p[aria-live="polite"]')!
    expect(live).toHaveTextContent(/^Play mode\./)
    act(() => fire({ type: 'checkpoint', index: 2, year: 2022, title: 'Software Engineer · Sessions', line: 39, at: [0, 0, 0] }))
    const toast = [...document.querySelectorAll('div[aria-hidden="true"]')].find((d) => d.textContent?.includes('CHECKPOINT'))
    expect(toast).toHaveTextContent('✓ CHECKPOINT2022Software Engineer · Sessions')
    expect(live).toHaveTextContent('Checkpoint: 2022, Software Engineer · Sessions')
    act(() => fire({ type: 'coin', body: 1, at: [0, 0, 0], coins: 1, total: 27 }))
    expect(live).toHaveTextContent('Impact 1 of 27')
    expect(screen.getByText('+1 IMPACT')).toHaveStyle({ left: '120px', top: '80px' })
    act(() => fire({ type: 'coin', body: 2, at: [0, 0, 0], coins: 2, total: 27 }))
    expect(live).toHaveTextContent('Impact 1 of 27') // (once per 1.5 s)
  })

  it('the finish card: THE END, the numbers, a new best, focus on Play again, and its buttons', async () => {
    await startPlaying()
    state.finished = true
    act(() => fire({ type: 'finish', result: { timeMs: 42_300, bestMs: 42_300, newBest: true, coins: 19, total: 27 } }))
    const card = screen.getByRole('dialog', { name: 'The end' })
    expect(card).toHaveTextContent('THE END')
    expect(card).toHaveTextContent('Now → 1998. You read the whole career.')
    expect(card).toHaveTextContent('TIME0:42.3')
    expect(card).toHaveTextContent('IMPACT19/27')
    expect(card).toHaveTextContent('NEW BEST!')
    const again = screen.getByRole('button', { name: /Play again/ })
    expect(again).toHaveFocus()
    expect(screen.getByRole('link', { name: /Resume PDF/ })).toHaveAttribute('href', '/Phillip_Aelony_Resume_2025.pdf')
    fireEvent.keyDown(again, { key: 'Enter' }) // Enter on the button itself: the button's own click (not twice)
    fireEvent.click(again)
    expect(play.again).toHaveBeenCalledTimes(1)
    act(() => { (document.activeElement as HTMLElement | null)?.blur?.() })
    fireEvent.keyDown(window, { key: 'Enter' }) // Enter anywhere else: Play again
    expect(play.again).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: /Back to the resume/ }))
    expect(play.exit).toHaveBeenCalled()
  })
})

describe('touch', () => {
  const playOnTouch = async (...more: string[]) => {
    await open('(pointer: coarse)', ...more)
    fireEvent.click(screen.getByRole('button', { name: 'Play (J)' }))
    await screen.findByRole('button', { name: 'Leave Play mode (Esc)' })
  }

  it('shows the pads only for coarse pointers', async () => {
    await open()
    fireEvent.keyDown(window, { key: 'j' })
    await screen.findByRole('button', { name: 'Leave Play mode (Esc)' })
    expect(screen.queryByTestId('jelly-pads')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Play or pause the music' })).toBeNull()
  })

  it('the action pads hold their input while a finger is down (a quick tap still counts)', async () => {
    await playOnTouch()
    const jump = screen.getByRole('button', { name: /^Jump/ })
    fireEvent.pointerDown(jump, { pointerId: 2 })
    expect(play.input.jump).toBe(true)
    expect(play.input.pressed.has('jump')).toBe(true)
    expect(jump).toHaveAttribute('data-pressed')
    fireEvent.pointerUp(jump, { pointerId: 2 })
    expect(play.input.jump).toBe(false)
    expect(jump).not.toHaveAttribute('data-pressed')
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Smash (B)' }), { pointerId: 3 })
    expect(play.input.smash).toBe(true)
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Drop through/ }), { pointerId: 4 })
    expect(play.input.down).toBe(true)
  })

  it('the move pad steers by which half the finger is over, so a slide turns him', async () => {
    await playOnTouch()
    const left = screen.getByRole('button', { name: 'Run left' }), pad = left.parentElement!
    jest.spyOn(pad, 'getBoundingClientRect').mockReturnValue({ left: 16, width: 136, top: 0, height: 64, right: 152, bottom: 64, x: 16, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(left, { pointerId: 1, clientX: 40 })
    expect(play.input).toMatchObject({ left: true, right: false })
    fireEvent.pointerMove(pad, { pointerId: 1, clientX: 130 })
    expect(play.input).toMatchObject({ left: false, right: true })
    expect(screen.getByRole('button', { name: 'Run right' })).toHaveAttribute('data-pressed')
    fireEvent.pointerDown(pad, { pointerId: 5, clientX: 20 }) // a second finger doesn't take over
    expect(play.input.right).toBe(true)
    fireEvent.pointerUp(pad, { pointerId: 1, clientX: 130 })
    expect(play.input).toMatchObject({ left: false, right: false })
  })

  it("hides the site's ♫ while playing (a ♫ remote stands in) and brings it back after", async () => {
    await playOnTouch()
    expect(document.documentElement).toHaveClass('jelly-play-touch')
    const toggle = jest.fn()
    registerSiteMusic({ getSource: () => null, isPlaying: () => false, toggle })
    fireEvent.click(screen.getByRole('button', { name: 'Play or pause the music' }))
    expect(toggle).toHaveBeenCalled()
    registerSiteMusic(null)
    fireEvent.click(screen.getByRole('button', { name: 'Leave Play mode (Esc)' }))
    await waitFor(() => expect(document.documentElement).not.toHaveClass('jelly-play-touch'))
  })

  it('the pads give way to the finish card', async () => {
    await playOnTouch()
    expect(screen.getByTestId('jelly-pads')).toBeInTheDocument()
    act(() => fire({ type: 'finish', result: { timeMs: 1000, bestMs: 900, newBest: false, coins: 0, total: 27 } }))
    expect(screen.queryByTestId('jelly-pads')).toBeNull()
  })
})

describe('the climb meter', () => {
  it('is full on desktops, slim on phones, and gone on short screens', () => {
    expect(meterMode(false, false)).toBe('full')
    expect(meterMode(false, true)).toBe('slim')
    expect(meterMode(true, false)).toBe('none')
    expect(meterMode(true, true)).toBe('none')
  })

  it.each([
    [[], 'full'],
    [['(max-width: 820px)'], 'slim'],
    [['(max-height: 559px)'], null],
  ])('with %j matching it renders %s', async (matching, mode) => {
    await open(...matching)
    fireEvent.keyDown(window, { key: 'j' })
    await screen.findByRole('button', { name: 'Leave Play mode (Esc)' })
    const meter = document.querySelector('[data-mode]')
    expect(meter?.getAttribute('data-mode') ?? null).toBe(mode)
    if (meter) {
      expect(meter).toHaveAttribute('aria-hidden', 'true')
      if (mode === 'full') expect(meter).toHaveTextContent('NOW20261998')
    }
  })
})

describe('fmtTime', () => {
  it('reads m:ss.t', () => {
    expect(fmtTime(0)).toBe('0:00.0')
    expect(fmtTime(24_600)).toBe('0:24.6')
    expect(fmtTime(62_300)).toBe('1:02.3')
    expect(fmtTime(null)).toBe('—')
  })
})
