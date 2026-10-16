/**
 * Play mode's UI on the 3D resume: the 🎮 Play button and PLAYER 1 START, the keys, the
 * Play HUD (✕ Exit, the toast, the live region, the finish card, the climb meter), and Esc
 * layering. The engine is mocked (WebGL2 isn't in jsdom); Play's events are fired by hand.
 */

import { act, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import JellyResumeCanvas from '@/components/jelly/JellyResumeCanvas'
import { fmtTime, meterMode } from '@/components/jelly/JellyPlayHud'
import type { PlayEnter } from '@/lib/jelly/engine'
import type { PlayEvent, PlayState } from '@/lib/jelly/play'
import { registerSiteMusic } from '@/lib/site-music'

const listeners = new Set<(e: PlayEvent) => void>()
const fire = (e: PlayEvent) => listeners.forEach((f) => f(e))
let playing = false
const state: PlayState = {
  x: 0, y: 0, z: 0, vx: 0, vy: 0, grounded: true, facing: 1, line: 0, clip: 'idle', smashing: false, pounding: false, falling: false,
  entering: false, checkpoint: -1, timeMs: 0, started: false, coins: 0, total: 27, finished: false, bestMs: null,
  score: 0, shrimp: 0, shrimpTotal: 5, bestScore: null, boost: 0, boostLeft: 0, trip: 0, tripLeft: 0,
}
const play = {
  enter: jest.fn(async (): Promise<PlayEnter> => { playing = true; fire({ type: 'enter' }); return 'on' }),
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
  project: jest.fn(() => [120, 80]),
  // PLAYER 1 START's art on the paper: its four projected corners (top left, top right, bottom right, bottom left)
  startQuad: jest.fn((): Float32Array | null => new Float32Array([100, 50, 200, 52, 198, 80, 101, 78])),
  setStartArt: jest.fn(), pressStart: jest.fn(),
  play,
}
/** the engine's per-frame listeners (the mock runs them on demand) */
const frameFns = new Set<() => void>()
const runFrame = () => act(() => frameFns.forEach((f) => f()))
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
  Object.assign(state, { finished: false, checkpoint: -1, score: 0, shrimp: 0, boost: 0, boostLeft: 0, trip: 0, tripLeft: 0 })
  play.enter.mockImplementation(async () => { playing = true; fire({ type: 'enter' }); return 'on' })
  Object.assign(play.input, { left: false, right: false, jump: false, down: false, smash: false })
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
    let done: (r: PlayEnter) => void = () => {}
    play.enter.mockImplementationOnce(() => new Promise<PlayEnter>((r) => (done = r)))
    fireEvent.click(btn)
    expect(btn).toHaveTextContent('Loading…')
    expect(btn).toHaveAttribute('aria-busy', 'true')
    await act(async () => done('failed'))
    expect(btn).toHaveTextContent('Play unavailable')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('title', "Play mode couldn't load")
  })

  it('a "not now" (the page stopped being settled while Play loaded, e.g. the intro replayed) leaves Play ready', async () => {
    await open()
    const btn = screen.getByRole('button', { name: 'Play (J)' })
    play.enter.mockImplementationOnce(() => Promise.resolve<PlayEnter>('later'))
    fireEvent.click(btn)
    await waitFor(() => expect(btn).not.toHaveAttribute('aria-busy', 'true'))
    expect(btn).toHaveTextContent('Play (J)')
    expect(btn).toBeEnabled()
    expect(engine.setStartArt).toHaveBeenLastCalledWith({ status: 'ready' })
    play.enter.mockImplementationOnce(async () => { playing = true; fire({ type: 'enter' }); return 'on' })
    fireEvent.click(btn) // (and it can be pressed again)
    expect(await screen.findByRole('button', { name: 'Leave Play mode (Esc)' })).toBeInTheDocument()
  })

  describe('PLAYER 1 START (printed on the paper)', () => {
    beforeEach(() => {
      engine.onFrame.mockImplementation(((f: () => void) => { frameFns.add(f); return () => { frameFns.delete(f) } }) as never)
    })
    afterEach(() => frameFns.clear())

    it('is a transparent button over the art, at least 44 × 44, moved by transforms only', async () => {
      await open()
      const start = screen.getByRole('button', { name: 'Player 1 start: play as Phill (J)' })
      expect(start).toHaveAttribute('aria-keyshortcuts', 'J')
      expect(start).toHaveTextContent('') // the art is in the page texture; no pill
      runFrame()
      // the art's box is 100 × 30 px: grown to 44 tall around its center (65), a 100 px box scaled to it
      expect(start.style.transform).toBe('translate(100.0px, 43.0px) scale(1.000, 0.440)')
      expect(start.style.visibility).toBe('')
      engine.startQuad.mockReturnValueOnce(null) // turned away or off screen
      runFrame()
      expect(start.style.visibility).toBe('hidden')
      runFrame()
      expect(start.style.visibility).toBe('')
    })

    it('starts Play after the art is pressed (Enter or Space), and goes inert while playing', async () => {
      await open()
      const start = screen.getByRole('button', { name: 'Player 1 start: play as Phill (J)' })
      start.focus()
      fireEvent.click(start) // what Enter / Space do on a native button
      expect(engine.pressStart).toHaveBeenCalledTimes(1)
      expect(play.enter).not.toHaveBeenCalled() // the art drops a pixel first
      await waitFor(() => expect(play.enter).toHaveBeenCalled())
      await waitFor(() => expect(start).toHaveAttribute('inert'))
    })

    it('tells the paper its state: the cursor on hover or keyboard focus, loading, unavailable', async () => {
      await open()
      const start = screen.getByRole('button', { name: 'Player 1 start: play as Phill (J)' })
      expect(engine.setStartArt).toHaveBeenLastCalledWith({ status: 'ready' })
      fireEvent.pointerEnter(start)
      expect(engine.setStartArt).toHaveBeenLastCalledWith({ cursor: true })
      fireEvent.pointerLeave(start)
      expect(engine.setStartArt).toHaveBeenLastCalledWith({ cursor: false })
      act(() => start.focus()) // keyboard-style focus (:focus-visible)
      expect(engine.setStartArt).toHaveBeenLastCalledWith({ cursor: true })
      act(() => start.blur())
      expect(engine.setStartArt).toHaveBeenLastCalledWith({ cursor: false })
      let done: (r: PlayEnter) => void = () => {}
      play.enter.mockImplementationOnce(() => new Promise<PlayEnter>((r) => (done = r)))
      fireEvent.click(start)
      await waitFor(() => expect(start).toHaveAttribute('aria-busy', 'true'))
      expect(engine.setStartArt).toHaveBeenCalledWith({ status: 'loading' })
      await act(async () => done('failed'))
      const off = screen.getByRole('button', { name: "Play mode couldn't load" })
      expect(off).toBe(start)
      expect(off).toBeDisabled()
      expect(engine.setStartArt).toHaveBeenLastCalledWith({ status: 'unavailable' })
    })
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

  it("Space presses a focused button (✕ Exit, the finish card's) instead of smashing", async () => {
    await startPlaying()
    const exit = screen.getByRole('button', { name: 'Leave Play mode (Esc)' })
    exit.focus()
    const space = createEvent.keyDown(exit, { key: ' ', code: 'Space' })
    fireEvent(exit, space)
    expect(play.input.smash).toBe(false)
    expect(space.defaultPrevented).toBe(false) // (so the button's own Space press goes through)
    fireEvent.keyDown(window, { key: ' ' }) // (anywhere else it's still the smash)
    expect(play.input.smash).toBe(true)
  })

  it('shows the keys and announces Play, checkpoints and (throttled) coins', async () => {
    await startPlaying()
    expect(screen.getByText('Space').closest('div')).toHaveTextContent('← → run·W / ↑ jump·↓ drop (in the air: pound)·Space smash·Esc exit')
    const live = document.querySelector('p[aria-live="polite"]')!
    expect(live).toHaveTextContent(/^Play mode\./)
    await act(async () => fire({ type: 'checkpoint', index: 2, year: 2022, title: 'Software Engineer · Sessions', line: 39, at: [0, 0, 0] }))
    const toast = [...document.querySelectorAll('div[aria-hidden="true"]')].find((d) => d.textContent?.includes('CHECKPOINT'))
    expect(toast).toHaveTextContent('✓ CHECKPOINT2022Software Engineer · Sessions')
    expect(live).toHaveTextContent('Checkpoint: 2022, Software Engineer · Sessions')
    act(() => fire({ type: 'coin', body: 1, at: [0, 0, 0], coins: 1, total: 27 }))
    expect(live).toHaveTextContent('Impact 1 of 27')
    act(() => fire({ type: 'coin', body: 2, at: [0, 0, 0], coins: 2, total: 27 }))
    expect(live).toHaveTextContent('Impact 1 of 27') // (once per 1.5 s)
  })

  it('pops every award where it happened: +100 with +1 IMPACT for a coin, +500, and a kick in red', async () => {
    await startPlaying()
    act(() => fire({ type: 'score', why: 'coin', points: 100, at: [0, 0, 0], score: 100 }))
    const coin = screen.getByText('+100').closest('div')!
    expect(coin).toHaveTextContent('+100+1 IMPACT')
    expect(coin).toHaveStyle({ left: '120px', top: '96px' }) // (projected at y 80: kept clear of the stats)
    act(() => fire({ type: 'score', why: 'shrimp', points: 500, at: [0, 0, 0], score: 600 }))
    expect(screen.getByText('+500')).toBeInTheDocument()
    act(() => fire({ type: 'score', why: 'hurt', points: -250, at: [0, 0, 0], score: 350 }))
    expect(screen.getByText('−250').closest('div')).toHaveAttribute('data-bad')
  })

  it('a shrimp: SHRIMP! in rainbow letters with 16 shrimp raining, and the live region', async () => {
    await startPlaying()
    act(() => fire({ type: 'shrimp', index: 2, at: [0, 0, 0], shrimp: 3, total: 5 }))
    const word = await screen.findByText('S', { selector: 'span' })
    const show = word.closest('[aria-hidden="true"]')!
    expect(show).toHaveTextContent(/^(🍤){16}SHRIMP$/)
    expect([...show.querySelectorAll('span')].filter((e) => e.textContent === '🍤')).toHaveLength(16)
    expect(document.querySelector('p[aria-live="polite"]')).toHaveTextContent('Shrimp! 3 of 5')
  })

  it('shows the boost draining (+35%) while it lasts', async () => {
    const frames = new Set<() => void>()
    engine.onFrame.mockImplementation(((f: () => void) => { frames.add(f); return () => { frames.delete(f) } }) as never)
    await startPlaying()
    const bar = screen.getByTestId('jelly-boost')
    expect(bar).toHaveStyle({ display: 'none' })
    Object.assign(state, { boost: 0.35, boostLeft: 0.5 })
    act(() => frames.forEach((f) => f()))
    expect(bar).not.toHaveStyle({ display: 'none' })
    expect(bar).toHaveTextContent('+35%')
    expect((bar.querySelector('[data-fill]') as HTMLElement).style.transform).toBe('scaleX(0.500)')
    engine.onFrame.mockImplementation(() => () => {})
  })

  it('the trip: a 🍄 pill draining beside the stats, and the live region (on and over)', async () => {
    const frames = new Set<() => void>()
    engine.onFrame.mockImplementation(((f: () => void) => { frames.add(f); return () => { frames.delete(f) } }) as never)
    await startPlaying()
    const live = document.querySelector('p[aria-live="polite"]')!
    const pill = screen.getByTestId('jelly-trip')
    act(() => fire({ type: 'trip', at: [0, 0, 0] }))
    expect(live).toHaveTextContent('Shroom mode for 12 seconds')
    Object.assign(state, { trip: 9, tripLeft: 0.75 })
    act(() => frames.forEach((f) => f()))
    expect(pill.closest('[data-trip]')).not.toBeNull() // (the stats know: on a narrow phone the pill takes the score's place)
    expect((pill.querySelector('[data-fill]') as HTMLElement).style.transform).toBe('scaleX(0.750)')
    Object.assign(state, { trip: 0, tripLeft: 0 })
    act(() => frames.forEach((f) => f()))
    expect(pill.closest('[data-trip]')).toBeNull()
    act(() => fire({ type: 'tripEnd' }))
    expect(live).toHaveTextContent('Shroom mode over')
    engine.onFrame.mockImplementation(() => () => {})
  })

  it('the lasagna: a "!" where it noticed him, and the live region (charging, stomped, smashed, kicked)', async () => {
    await startPlaying()
    const live = document.querySelector('p[aria-live="polite"]')!
    act(() => fire({ type: 'enemy', what: 'alert', at: [0, 0, 0] }))
    expect(screen.getByText('!').closest('[data-alert]')).not.toBeNull()
    expect(live).toHaveTextContent('A lasagna is charging')
    act(() => fire({ type: 'enemy', what: 'stomped', at: [0, 0, 0] }))
    expect(live).toHaveTextContent('Lasagna stomped, 300 points')
    act(() => fire({ type: 'enemy', what: 'smashed', at: [0, 0, 0] }))
    expect(live).toHaveTextContent('Lasagna smashed, 300 points')
    act(() => fire({ type: 'enemy', what: 'hurt', at: [0, 0, 0] }))
    expect(live).toHaveTextContent('Kicked, minus 250')
  })

  it('the giant: "!!" and "Run!", "TINK!" (it can\'t be hurt, said at most every 4 s), and when it shrinks back', async () => {
    await startPlaying()
    const live = document.querySelector('p[aria-live="polite"]')!
    act(() => fire({ type: 'enemy', what: 'huge', at: [0, 0, 0] }))
    expect(screen.getByText('!!').closest('[data-alert]')).not.toBeNull()
    expect(live).toHaveTextContent('The lasagna grew huge. Run!')
    act(() => fire({ type: 'enemy', what: 'tink', at: [0, 0, 0] }))
    expect(screen.getByText('TINK!').closest('[data-alert]')).not.toBeNull()
    expect(live).toHaveTextContent("TINK! The giant can't be hurt")
    act(() => fire({ type: 'enemy', what: 'stomped', at: [0, 0, 0] }))
    act(() => fire({ type: 'enemy', what: 'bounce', at: [0, 0, 0] }))
    expect(live).toHaveTextContent('Lasagna stomped, 300 points') // (throttled)
    act(() => fire({ type: 'enemy', what: 'shrunk', at: [0, 0, 0] }))
    expect(live).toHaveTextContent('The lasagna shrank back. Get even!')
  })

  it('writes ★ SCORE (6 digits) and the shrimp into the stats through refs, ≤ 10×/s', async () => {
    const frames = new Set<() => void>()
    engine.onFrame.mockImplementation(((f: () => void) => { frames.add(f); return () => { frames.delete(f) } }) as never)
    await startPlaying()
    Object.assign(state, { score: 4300, shrimp: 2 })
    act(() => frames.forEach((f) => f()))
    expect(screen.getByText('★ 004300')).toBeInTheDocument()
    expect(screen.getByText('🍤 2/5')).toBeInTheDocument()
    engine.onFrame.mockImplementation(() => () => {})
  })

  it('two checkpoints passed in one landing: both toasts, one after the other, and one announcement of both', async () => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] })
    try {
      await startPlaying()
      await act(async () => {
        fire({ type: 'checkpoint', index: 0, year: 2026, title: 'Generative AI Engineer', line: 13, at: [0, 0, 0] })
        fire({ type: 'checkpoint', index: 1, year: 2023, title: 'Senior Software Engineer II', line: 14, at: [0, 0, 0] })
      })
      const toast = () => [...document.querySelectorAll('div[aria-hidden="true"]')].find((d) => d.textContent?.includes('CHECKPOINT'))?.textContent
      expect(toast()).toBe('✓ CHECKPOINT2026Generative AI Engineer')
      expect(document.querySelector('p[aria-live="polite"]')).toHaveTextContent('Checkpoints: 2026, Generative AI Engineer; 2023, Senior Software Engineer II')
      act(() => { jest.advanceTimersByTime(1300) })
      expect(toast()).toBe('✓ CHECKPOINT2023Senior Software Engineer II')
      act(() => { jest.advanceTimersByTime(2600) })
      expect(toast()).toBeUndefined()
    } finally {
      jest.useRealTimers()
    }
  })

  it('the finish card: THE END, the numbers, a new best, focus on Play again, and its buttons', async () => {
    await startPlaying()
    state.finished = true
    act(() => fire({ type: 'finish', result: {
      timeMs: 42_300, bestMs: 40_000, newBest: false, coins: 19, total: 27,
      score: 6870, bonus: 1770, bestScore: 6870, newBestScore: true, shrimp: 3, shrimpTotal: 5,
    } }))
    const card = screen.getByRole('dialog', { name: 'The end' })
    expect(card).toHaveTextContent('THE END')
    expect(card).toHaveTextContent('Now → 1998. You read the whole career.')
    expect(card).toHaveTextContent('SCORE006870')
    expect(card).toHaveTextContent('TIME0:42.3')
    expect(card).toHaveTextContent('IMPACT19/27')
    expect(card).toHaveTextContent('SHRIMP3/5')
    expect(card).toHaveTextContent('BEST SCORE006870NEW BEST!')
    expect(card).toHaveTextContent('BEST TIME0:40.0')
    expect(card).toHaveTextContent('+1770 TIME BONUS')
    expect(card.textContent!.match(/NEW BEST!/g)).toHaveLength(1)
    expect(document.querySelector('p[aria-live="polite"]')).toHaveTextContent('The end. Score 6870, a new best. Time 0:42.3, best 0:40.0. Impact 19 of 27. Shrimp 3 of 5.')
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
    registerSiteMusic({ getSource: () => null, isPlaying: () => false, toggle, open: jest.fn() })
    fireEvent.click(screen.getByRole('button', { name: 'Play or pause the music' }))
    expect(toggle).toHaveBeenCalled()
    registerSiteMusic(null)
    fireEvent.click(screen.getByRole('button', { name: 'Leave Play mode (Esc)' }))
    await waitFor(() => expect(document.documentElement).not.toHaveClass('jelly-play-touch'))
  })

  it('a finger still on a pad when the pads give way (the finish card) lets go: Play again starts still', async () => {
    await playOnTouch()
    const right = screen.getByRole('button', { name: 'Run right' }), pad = right.parentElement!
    jest.spyOn(pad, 'getBoundingClientRect').mockReturnValue({ left: 16, width: 136, top: 0, height: 64, right: 152, bottom: 64, x: 16, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(right, { pointerId: 1, clientX: 130 })
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Jump/ }), { pointerId: 2 })
    expect(play.input).toMatchObject({ right: true, jump: true })
    act(() => fire({ type: 'finish', result: { timeMs: 1000, bestMs: 900, newBest: false, coins: 0, total: 27, score: 5900, bonus: 5900, bestScore: 9000, newBestScore: false, shrimp: 0, shrimpTotal: 5 } }))
    expect(screen.queryByTestId('jelly-pads')).toBeNull()
    expect(play.input).toMatchObject({ left: false, right: false, jump: false, down: false, smash: false })
  })

  it('the pads give way to the finish card', async () => {
    await playOnTouch()
    expect(screen.getByTestId('jelly-pads')).toBeInTheDocument()
    act(() => fire({ type: 'finish', result: { timeMs: 1000, bestMs: 900, newBest: false, coins: 0, total: 27, score: 5900, bonus: 5900, bestScore: 9000, newBestScore: false, shrimp: 0, shrimpTotal: 5 } }))
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
