/**
 * The Skill blaster's runtime (src/lib/skills/blaster.ts), a smoke test in jsdom: the first shot starts the
 * game, a skill lights up after the first bar, a hit scores, Escape stops, idling pauses, and the live region
 * says so. jsdom has no layout, no Web Audio and no Web Animations: the skills get fake boxes, the audio clock
 * is a fake AudioContext advanced with the fake timers, and animate() returns a stub. Reduced motion is on
 * (jsdom has no Range boxes for the letters); the pure rules are in skills-rules.test.ts.
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import SkillsSection from '@/components/SkillsSection'
import { createBlaster, type Blaster, type Shot } from '@/lib/skills/blaster'
import { BAR } from '@/lib/skills/synth'
import { isWizardAside, setWizardAside, subscribeWizardAside } from '@/lib/wizard-aside'
import { registerSiteMusic, type SiteMusic } from '@/lib/site-music'
import { FakeAudioContext } from './helpers/fakeAudio'
import { fetchBoard, saveScore, startRun } from '@/lib/skills/scoreboard-api'

jest.mock('@/components/skills/SkillsPlay', () => ({ __esModule: true, default: () => null }))
jest.mock('@/lib/skills/scoreboard-api', () => ({
  startRun: jest.fn(),
  fetchBoard: jest.fn(),
  saveScore: jest.fn(),
  playerId: () => 'p-me',
  loadProfile: () => null,
  saveProfile: jest.fn(),
}))
const mStartRun = startRun as jest.Mock, mFetchBoard = fetchBoard as jest.Mock, mSaveScore = saveScore as jest.Mock

interface Dev {
  G: { state: string; score: number; wave: number; hp: number; active: Set<{ foe: boolean; k: { el: HTMLElement; label: HTMLElement } }> }
  M: { on: boolean }
  jumpToDrop(): void
  E: { ac: unknown; master: { gain: { calls: unknown[][] } } } | null
  bandSize(): number
}
const dev = () => (window as unknown as { __skills: Dev }).__skills

const realMatchMedia = window.matchMedia
const realRect = HTMLElement.prototype.getBoundingClientRect
beforeAll(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
  // jsdom has no <dialog> modality: the scoreboard's dialog opens and closes as an attribute
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  Element.prototype.animate = function () {
    return { cancel() {}, pause() {}, play() {}, onfinish: null, oncancel: null, effect: { getComputedTiming: () => ({ endTime: 0 }) } } as unknown as Animation
  }
  // every skill a box on screen, in reading order; the readout near the bottom
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const skill = this.closest('[data-skill]')
    if (skill) {
      const i = [...document.querySelectorAll('[data-skill]')].indexOf(skill)
      const x = 20 + (i % 6) * 160, y = 80 + Math.floor(i / 6) * 40
      return { left: x, top: y, right: x + 100, bottom: y + 24, width: 100, height: 24, x, y, toJSON() {} } as DOMRect
    }
    if (this.classList.contains('bl-hud')) return { left: 16, top: 700, right: 300, bottom: 752, width: 284, height: 52, x: 16, y: 700, toJSON() {} } as DOMRect
    return realRect.call(this)
  }
})
afterAll(() => {
  window.matchMedia = realMatchMedia
  HTMLElement.prototype.getBoundingClientRect = realRect
})

let ac: FakeAudioContext
let game: Blaster
beforeEach(() => {
  jest.useFakeTimers()
  localStorage.clear()
  jest.clearAllMocks()
  mStartRun.mockResolvedValue({ runId: 'run-1', geo: { city: '', country: '' } })
  mFetchBoard.mockResolvedValue({ top: [], total: 0, mine: null, at: 1 })
  render(<SkillsSection />)
  ac = new FakeAudioContext()
  game = createBlaster({ section: document.getElementById('skills')!, ac: ac as unknown as AudioContext, lean: null })
})
afterEach(() => {
  game.dispose()
  jest.useRealTimers()
})

/** time passes: the timers and the audio clock together */
const pass = (ms: number) => act(() => {
  for (let t = 0; t < ms; t += 20) { ac.currentTime += 0.02; jest.advanceTimersByTime(20) }
})
const shotAt = (el: HTMLElement): Shot => ({ skill: el.closest('button'), x: 50, y: 50, keyboard: false, target: el })
const live = () => document.querySelector('[data-sk-live]')!.textContent
const hud = () => document.querySelector('.bl-hud')!

describe('the Skill blaster', () => {
  it('starts with the first shot: the readout shows, the shot scores and the live region says what started', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(dev().G.state).toBe('intro')
    expect(document.getElementById('skills')).toHaveClass('bl-on')
    expect(hud()).toHaveClass('on')
    expect(dev().G.score).toBe(100)
    pass(100)
    expect(live()).toMatch(/^Skill blaster\. A beat starts; hit the skills that light up to play over it\. Escape stops\./)
    expect(document.querySelector('.bl-screen')?.parentElement).toBe(document.body) // screen-wide effects live on <body>
  })

  it('lights a skill after the first bar, and a hit on it scores', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 900)
    expect(dev().G.state).toBe('wave')
    expect(dev().G.wave).toBe(0)
    const [lit] = [...dev().G.active]
    expect(lit).toBeDefined()
    expect(lit.k.label).toHaveClass('bl-lit')
    expect(document.querySelector('.bl-layer .bl-ring')).not.toBeNull()

    act(() => game.shoot(shotAt(lit.k.el)))
    const band = dev().bandSize() // the parts heard in the last two bars multiply the points
    expect(band).toBeGreaterThanOrEqual(1)
    expect(dev().G.score).toBe(100 + 100 * band)
    expect(lit.k.label).not.toHaveClass('bl-lit')
    pass(1400)
    expect(live()).toMatch(new RegExp(`\\. ${(100 + 100 * band).toLocaleString('en-US')} points\\.$`))
  })

  it('Escape stops it: back to the list, and the live region says the score', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(300)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dev().G.state).toBe('rest')
    expect(document.getElementById('skills')).not.toHaveClass('bl-on')
    expect(hud()).not.toHaveClass('on')
    pass(100)
    expect(live()).toBe('Stopped. 100 points.')
    expect(localStorage.getItem('skill-blaster-best')).toBe('100')
  })

  it('Escape stops only the game: the wizard and shroom mode behind it don’t hear it', () => {
    const behind = jest.fn()
    window.addEventListener('keydown', behind) // ShroomMode's listener
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dev().G.state).toBe('rest')
    expect(behind).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' }) // at rest, Escape is the site's again
    expect(behind).toHaveBeenCalledTimes(1)
    window.removeEventListener('keydown', behind)
  })

  it('once a pause has let the readout go, Escape is the site’s again (the game stays paused)', () => {
    const behind = jest.fn()
    window.addEventListener('keydown', behind) // ShroomMode's listener
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 5600) // idle: paused
    expect(dev().G.state).toBe('paused')
    pass(6100) // the readout and the arena go
    expect(hud()).not.toHaveClass('on')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(behind).toHaveBeenCalledTimes(1)
    expect(dev().G.state).toBe('paused')
    pass(100)
    expect(live()).not.toMatch(/^Stopped/)
    window.removeEventListener('keydown', behind)
  })

  it('pauses after 5 s without a shot, and a shot picks it up again', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 4500)
    expect(dev().G.state).toBe('wave') // a wave's start counts as a shot
    pass(1100)
    expect(dev().G.state).toBe('paused')
    expect(live()).toBe('Paused. shoot any skill to go on')
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' }))))
    expect(['wave', 'between']).toContain(dev().G.state)
  })

  it('an unlit skill only grazes (no points)', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 900)
    const lit = new Set([...dev().G.active].map((t) => t.k.el))
    const unlit = screen.getAllByRole('button').find((b) => b.dataset.skill && !lit.has(b) && b.dataset.skill !== 'Docker')!
    const before = dev().G.score
    act(() => game.shoot(shotAt(unlit)))
    expect(dev().G.score).toBe(before)
  })
})

describe('the summoned Shroom Wizard', () => {
  afterEach(() => {
    document.getElementById('shroom-ui')?.remove()
    setWizardAside(false)
  })

  it('steps aside while the game plays where the readout can’t clear it, and comes back when the readout goes', () => {
    const ui = document.createElement('div')
    ui.id = 'shroom-ui'
    ui.appendChild(document.createElement('canvas')) // jsdom: no room beside it, as on a phone
    document.body.appendChild(ui)
    const heard: boolean[] = []
    const off = subscribeWizardAside(() => heard.push(isWizardAside()))
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(isWizardAside()).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(isWizardAside()).toBe(false)
    expect(heard).toEqual([true, false])
    off()
  })

  it('stays put when it isn’t out', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(isWizardAside()).toBe(false)
  })
})

describe('the music', () => {
  /** the site's one player, playing a song when the game starts */
  const player = () => {
    let playing = true
    const listeners = new Set<(on: boolean) => void>()
    const music: SiteMusic & { set(on: boolean): void } = {
      getSource: () => null,
      isPlaying: () => playing,
      toggle: () => {},
      open: () => {},
      context: () => ac as unknown as AudioContext,
      pause: jest.fn(() => { playing = false; listeners.forEach((cb) => cb(false)) }),
      play: jest.fn(() => { playing = true; listeners.forEach((cb) => cb(true)) }),
      onChange: (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
      set(on) { playing = on; listeners.forEach((cb) => cb(on)) },
    }
    return music
  }
  let music: ReturnType<typeof player>
  beforeEach(() => {
    game.dispose() // a game made with the site's player registered
    music = player()
    registerSiteMusic(music)
    game = createBlaster({ section: document.getElementById('skills')!, ac: ac as unknown as AudioContext, lean: null })
  })
  afterEach(() => registerSiteMusic(null))

  it('the first shot makes the engine on the AudioContext it was given (the site player’s)', () => {
    expect(dev().E).toBeNull()
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(dev().E?.ac).toBe(ac)
  })

  it('the site’s music pauses when the game starts and comes back when it stops', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(music.pause).toHaveBeenCalledTimes(1)
    expect(music.play).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(music.play).toHaveBeenCalledTimes(1)
  })

  it('pressing play on the site’s player mid-game pauses the game: one track at a time', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(300)
    act(() => music.set(true))
    expect(dev().G.state).toBe('paused')
    expect(document.querySelector('.bl-hud .r2')!.textContent).toContain('Paused · the music player is on')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(music.play).not.toHaveBeenCalled() // it's already playing: nothing to hand back
  })

  it('the shot that picks the game up again pauses the song again, and stopping gives it back', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(300)
    act(() => music.set(true)) // play pressed mid-game: the game pauses, the song plays
    expect(dev().G.state).toBe('paused')
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' }))))
    expect(dev().G.state).not.toBe('paused')
    expect(music.isPlaying()).toBe(false) // never the beat over the song
    expect(music.pause).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(music.play).toHaveBeenCalledTimes(1)
  })

  it('a pause that lasts gives the song back with the list; a shot takes it again', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 5600) // idle: paused
    expect(dev().G.state).toBe('paused')
    expect(music.play).not.toHaveBeenCalled() // a moment's pause keeps the song off
    pass(6100) // the readout and the arena go
    expect(music.play).toHaveBeenCalledTimes(1)
    expect(dev().G.state).toBe('paused')
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' }))))
    expect(['wave', 'between']).toContain(dev().G.state)
    expect(music.pause).toHaveBeenCalledTimes(2)
    expect(music.isPlaying()).toBe(false)
  })

  it('mute silences the master', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    fireEvent.click(screen.getByRole('button', { name: 'Mute the game and its beat' }))
    expect(screen.getByRole('button', { name: 'Mute the game and its beat' })).toHaveAttribute('aria-pressed', 'true')
    expect(dev().E!.master.gain.calls.at(-1)?.slice(0, 2)).toEqual(['target', 0])
  })

  it('the drums play by themselves on the beat: a kick on the first 16th', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    const from = ac.nodes.length
    pass(200)
    const kicks = ac.since(from, 'osc').filter((o) => o.frequency.value === 150) // the kick's start pitch
    expect(kicks.length).toBeGreaterThan(0)
  })

  it('a lit hit brings its part into the band (the multiplier)', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(dev().bandSize()).toBe(1) // Docker's part, Cloud & DevOps (the chords)
    expect(document.querySelector('[data-sk-group="cloud"] h3')).toHaveClass('bl-live')
  })
})

describe('one screen', () => {
  beforeAll(() => { window.scrollBy = jest.fn() as unknown as typeof window.scrollBy })

  it('the first shot forms the arena (each heading knows its count) and stopping puts the list back', () => {
    const section = document.getElementById('skills')!
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(section).toHaveClass('bl-arena')
    expect(section.style.getPropertyValue('--fit')).toBe('1')
    expect(document.querySelector('[data-sk-group="frontend"] h3')).toHaveAttribute('data-n', '15')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(section).not.toHaveClass('bl-arena')
    expect(section.style.getPropertyValue('--fit')).toBe('')
  })

  it('a pause lets the arena go after 6 s', () => {
    const section = document.getElementById('skills')!
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 5600) // idle: paused
    expect(dev().G.state).toBe('paused')
    expect(section).toHaveClass('bl-arena')
    pass(6100)
    expect(section).not.toHaveClass('bl-arena')
    expect(hud()).not.toHaveClass('on')
  })
})

describe('game over', () => {
  /** into the drop with one health, shooting at nothing (it keeps the idle pause away) until an enemy's shot lands */
  const drop = () => {
    act(() => dev().jumpToDrop())
    dev().G.hp = 1
    const air = { skill: null, x: 5, y: 5, keyboard: false, target: document.querySelector('#skills h2')! }
    for (let i = 0; i < 40 && dev().G.state !== 'over'; i++) { pass(500); act(() => game.shoot(air)) }
    expect(dev().G.state).toBe('over')
  }
  const lose = () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    drop()
  }
  const board = () => document.querySelector<HTMLDialogElement>('dialog.sb')
  const boardOpen = () => !!board()?.open
  /** the board's answers (mocked, already resolved) land */
  const flush = () => act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve() })

  it('the music fades out, the list comes back and the scoreboard opens; the readout stays until it closes', () => {
    lose()
    const section = document.getElementById('skills')!
    expect(section).toHaveClass('bl-arena') // the banner and the tape stop first
    expect(boardOpen()).toBe(false)
    pass(1700)
    expect(dev().M.on).toBe(false)
    expect(section).not.toHaveClass('bl-arena')
    expect(boardOpen()).toBe(true)
    expect(board()!.parentElement).toBe(document.body)
    expect(hud()).toHaveClass('on')
    expect(document.querySelector('.bl-hud .r2')!.textContent).toMatch(/Game over/)
    pass(12000) // no timer sends it to rest: the board does
    expect(dev().G.state).toBe('over')
    expect(hud()).toHaveClass('on')
  })

  it('closing the board puts the section at rest and the readout goes', () => {
    lose()
    pass(1700)
    act(() => board()!.querySelector<HTMLButtonElement>('.sb-x')!.click())
    expect(boardOpen()).toBe(false)
    expect(dev().G.state).toBe('rest')
    expect(hud()).not.toHaveClass('on')
  })

  it('a shot during the fade doesn’t start a new game; once the list is back, one does, and the board closes', () => {
    lose()
    const score = dev().G.score
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' }))))
    expect(dev().G.state).toBe('over')
    expect(dev().G.score).toBe(score)
    pass(1700)
    expect(boardOpen()).toBe(true)
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' }))))
    expect(dev().G.state).toBe('intro')
    expect(dev().G.score).toBe(100)
    expect(boardOpen()).toBe(false)
  })

  it('asks for a run ticket once a game, at its first shot, and nothing before', () => {
    expect(mStartRun).not.toHaveBeenCalled()
    expect(mFetchBoard).not.toHaveBeenCalled()
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(mStartRun).toHaveBeenCalledTimes(1)
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' })))) // a shot in the game: no new run
    pass(300)
    expect(mStartRun).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    expect(mStartRun).toHaveBeenCalledTimes(2)
  })

  it('the board gets the run: its score, wave, ticket and the resumes it took', async () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(BAR * 1000 + 5600) // idle: paused
    expect(dev().G.state).toBe('paused')
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Redis' })))) // a resume
    drop()
    const { score, wave } = dev().G
    pass(1700)
    await flush()
    expect(mFetchBoard).toHaveBeenCalledWith('p-me', score)
    const name = board()!.querySelector<HTMLInputElement>('[name="name"]')!
    name.value = 'Ana'
    mSaveScore.mockResolvedValue({ ok: true, board: { top: [{ rank: 1, name: 'Ana', city: '', country: '', score, me: true }], total: 1, mine: { rank: 1, name: 'Ana', city: '', country: '', score, me: true }, at: 1 } })
    act(() => { board()!.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true })) })
    await flush()
    expect(mSaveScore).toHaveBeenCalledWith(expect.objectContaining({ runId: 'run-1', score, wave, resumes: 1, name: 'Ana' }))
  })

  it('Esc or ✕ mid-game is a quit: no board', () => {
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(300)
    fireEvent.keyDown(document, { key: 'Escape' })
    pass(2000)
    expect(boardOpen()).toBe(false)
    act(() => game.shoot(shotAt(screen.getByRole('button', { name: 'Docker' }))))
    pass(300)
    act(() => hud().querySelector<HTMLButtonElement>('.bl-stop')!.click())
    pass(2000)
    expect(boardOpen()).toBe(false)
    expect(mFetchBoard).not.toHaveBeenCalled()
  })
})
