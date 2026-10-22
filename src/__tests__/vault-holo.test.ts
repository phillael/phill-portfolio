/**
 * The Relic Vault's hologram (src/lib/vault/holo.ts): the dialog, its bar, Esc and the backdrop, focus, the scroll
 * lock, the shared video's trip into the panel and back, and the video's sound against the site's one music player.
 * jsdom has no <dialog> showModal/close, Web Animations or layout: they're stubbed (as skills-scoreboard.test.ts does).
 */

import projectsData from '@/data/projects.json'
import media from '@/data/projects-media.json'
import type { Project } from '@/types/content'
import { registerSiteMusic, type SiteMusic } from '@/lib/site-music'
import { createHolo, type Holo, type HoloHost } from '@/lib/vault/holo'
import type { Quad } from '@/lib/vault/math'
import type { MediaEntry } from '@/lib/vault/vault'

const projects = projectsData as Project[]
const MEDIA = media as Record<string, MediaEntry>
const slayers = projects.find((p) => p.id === 'number-slayers')!
const jelly = projects.find((p) => p.id === 'jelly-resume')!

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

/* ---------- a fake site music player ---------- */
function fakeMusic(playing: boolean) {
  const subs = new Set<(p: boolean) => void>()
  const m = {
    playing,
    getSource: () => null,
    isPlaying: () => m.playing,
    toggle: () => {},
    open: () => {},
    context: () => null,
    pause: jest.fn(() => {
      m.playing = false
      subs.forEach((cb) => cb(false))
    }),
    play: jest.fn(() => {
      m.playing = true
      subs.forEach((cb) => cb(true))
    }),
    onChange: (cb: (p: boolean) => void) => {
      subs.add(cb)
      return () => void subs.delete(cb)
    },
    /** the visitor presses play on the player */
    visitorPlays() {
      m.playing = true
      subs.forEach((cb) => cb(true))
    },
  }
  registerSiteMusic(m as unknown as SiteMusic)
  return m
}

const QUAD: Quad = [
  [500, 300],
  [800, 300],
  [800, 525],
  [500, 525],
]

let holder: HTMLDivElement
let video: HTMLVideoElement
let opener: HTMLButtonElement
let host: jest.Mocked<Required<HoloHost>>
let holo: Holo

beforeEach(() => {
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: false, configurable: true })
    return Promise.resolve()
  })
  jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: true, configurable: true })
  })
  holder = document.createElement('div')
  video = document.createElement('video')
  holder.append(video)
  opener = document.createElement('button')
  opener.textContent = 'Watch'
  document.body.append(holder, opener)
  opener.focus()
  host = {
    reducedMotion: jest.fn(() => true),
    drives: jest.fn(() => true),
    onLayout: jest.fn(),
    onOpen: jest.fn(),
    onClosing: jest.fn(),
    onClosed: jest.fn(),
  }
  holo = createHolo(host)
})

afterEach(() => {
  holo.destroy()
  registerSiteMusic(null)
  jest.restoreAllMocks()
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
})

const open = (p: Project = slayers, audio = MEDIA[p.id].audio) =>
  holo.open({ project: p, media: { ...MEDIA[p.id], audio }, video, holder, crop: [0.75, 1], quad: () => QUAD, opener })
const dlg = () => document.querySelector<HTMLDialogElement>('dialog.holo')!
const btn = (h: string) => dlg().querySelector<HTMLElement>(`[data-h="${h}"]`)!

describe('the hologram', () => {
  it('is a modal dialog on <body>, labelled by the project’s title', () => {
    open()
    const d = dlg()
    expect(d.parentElement).toBe(document.body)
    expect(d.open).toBe(true)
    const label = document.getElementById(d.getAttribute('aria-labelledby')!)
    expect(label?.textContent).toBe('Number Slayers')
    expect(host.onOpen).toHaveBeenCalledTimes(1)
    expect(host.onLayout).toHaveBeenCalled()
  })

  it('plays the set’s own video in its panel, muted, and puts it back in the holder after', () => {
    open()
    expect(video.parentElement).toBe(dlg().querySelector('.holo-panel'))
    expect(video.muted).toBe(true)
    expect(video.paused).toBe(false)
    btn('close').click()
    expect(video.parentElement).toBe(holder)
    expect(video.classList.contains('holo-v')).toBe(false)
    expect(host.onClosed).toHaveBeenCalledTimes(1)
  })

  it('names its buttons: Pause/Play, Full screen, Live (opens in a new tab), Close', () => {
    open()
    expect(btn('play').getAttribute('aria-label')).toBe('Pause')
    btn('play').click()
    expect(video.paused).toBe(true)
    expect(btn('play').getAttribute('aria-label')).toBe('Play')
    expect(btn('play').querySelector('.lbl')?.textContent).toBe('Play')
    expect(dlg().classList.contains('holo-still')).toBe(true)
    expect(btn('full').getAttribute('aria-label')).toBe('Full screen')
    const live = btn('live') as HTMLAnchorElement
    expect(live.getAttribute('href')).toBe('https://numberslayers.com')
    expect(live.target).toBe('_blank')
    expect(live.rel).toBe('noopener noreferrer')
    expect(live.getAttribute('aria-label')).toBe('Live (opens in a new tab)')
    expect(btn('close').getAttribute('aria-label')).toBe('Close')
  })

  it('keeps the Jelly Resume’s Live in this tab, and hides Live when there is none', () => {
    open(jelly)
    const live = btn('live') as HTMLAnchorElement
    expect(live.getAttribute('href')).toBe('/resume')
    expect(live.hasAttribute('target')).toBe(false)
    expect(live.getAttribute('aria-label')).toBe('Live')
    btn('close').click()
    open(projects.find((p) => p.id === 'pickleball-2079')!)
    expect(btn('live').hidden).toBe(true)
  })

  it('calls the video’s full screen (or iOS’s)', () => {
    const req = jest.fn(() => Promise.resolve())
    Object.assign(video, { requestFullscreen: req })
    open()
    btn('full').click()
    expect(req).toHaveBeenCalledTimes(1)
    btn('close').click()
    const ios = jest.fn()
    Object.assign(video, { requestFullscreen: undefined, webkitEnterFullscreen: ios })
    open()
    btn('full').click()
    expect(ios).toHaveBeenCalledTimes(1)
  })

  describe('sound', () => {
    it('hides Sound when the clip has none', () => {
      open(slayers, false)
      expect(btn('sound').hidden).toBe(true)
    })

    it('Sound on unmutes the video and pauses a playing song; Sound off hands it back', () => {
      const music = fakeMusic(true)
      open(slayers, true)
      expect(btn('sound').hidden).toBe(false)
      expect(btn('sound').getAttribute('aria-label')).toBe('Sound on')
      btn('sound').click()
      expect(video.muted).toBe(false)
      expect(music.pause).toHaveBeenCalledTimes(1)
      expect(btn('sound').getAttribute('aria-label')).toBe('Sound off')
      btn('sound').click()
      expect(video.muted).toBe(true)
      expect(music.play).toHaveBeenCalledTimes(1)
    })

    it('closing hands the song back too', () => {
      const music = fakeMusic(true)
      open(slayers, true)
      btn('sound').click()
      btn('close').click()
      expect(video.muted).toBe(true)
      expect(music.play).toHaveBeenCalledTimes(1)
    })

    it('never resumes a song the visitor had paused', () => {
      const music = fakeMusic(false)
      open(slayers, true)
      btn('sound').click()
      expect(music.pause).not.toHaveBeenCalled()
      btn('sound').click()
      btn('close').click()
      expect(music.play).not.toHaveBeenCalled()
    })

    it('the visitor playing the song mutes the video (and the song stays theirs)', () => {
      const music = fakeMusic(true)
      open(slayers, true)
      btn('sound').click()
      music.visitorPlays()
      expect(video.muted).toBe(true)
      expect(btn('sound').getAttribute('aria-label')).toBe('Sound on')
      btn('close').click()
      expect(music.play).not.toHaveBeenCalled()
    })
  })

  describe('closing', () => {
    it('Esc: the keydown stops at the dialog, and the native cancel closes it our way', () => {
      const outside = jest.fn()
      window.addEventListener('keydown', outside)
      open()
      const key = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      btn('close').dispatchEvent(key)
      expect(outside).not.toHaveBeenCalled()
      const cancel = new Event('cancel', { cancelable: true })
      dlg().dispatchEvent(cancel)
      expect(cancel.defaultPrevented).toBe(true)
      expect(holo.isOpen()).toBe(false)
      expect(dlg().open).toBe(false)
      window.removeEventListener('keydown', outside)
    })

    it('a click on the backdrop closes it, but a drag out of the panel doesn’t', () => {
      open()
      const panel = dlg().querySelector('.holo-panel')!
      panel.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      dlg().dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(holo.isOpen()).toBe(true)
      dlg().dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      dlg().dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(holo.isOpen()).toBe(false)
    })

    it('a browser that closes the dialog anyway still ends it', () => {
      open()
      dlg().close()
      expect(holo.isOpen()).toBe(false)
      expect(video.parentElement).toBe(holder)
    })

    it('focuses ✕ while open, then gives focus back to the opener', () => {
      open()
      expect(document.activeElement).toBe(btn('close'))
      btn('close').click()
      expect(document.activeElement).toBe(opener)
    })

    it('locks the page’s scroll while open', () => {
      document.documentElement.style.overflow = 'clip'
      open()
      expect(document.documentElement.style.overflow).toBe('hidden')
      btn('close').click()
      expect(document.documentElement.style.overflow).toBe('clip')
    })
  })

  describe('the flight', () => {
    let raf: FrameRequestCallback[] = []
    let now = 0
    beforeEach(() => {
      raf = []
      now = 1000
      jest.spyOn(performance, 'now').mockImplementation(() => now)
      window.requestAnimationFrame = (cb) => raf.push(cb)
      window.cancelAnimationFrame = () => {}
      host.reducedMotion.mockReturnValue(false)
    })
    const run = (ms: number) => {
      for (let t = 0; t < ms; t += 16) {
        now += 16
        const due = raf
        raf = []
        due.forEach((cb) => cb(now))
      }
    }

    it('starts on the glass with the crop’s middle and lands in its rect, then flies back (no WebGL: its own frames)', () => {
      host.drives.mockReturnValue(false)
      Object.assign(window, { innerWidth: 1280, innerHeight: 800 })
      open()
      const panel = dlg().querySelector<HTMLElement>('.holo-panel')!
      expect(panel.style.clipPath).toBe('inset(0% 12.5% 0% 12.5%)')
      expect(dlg().querySelector('.holo-bar')!.classList.contains('on')).toBe(false)
      run(900)
      expect(panel.style.clipPath).toBe('inset(0% 0% 0% 0%)')
      expect(dlg().querySelector('.holo-bar')!.classList.contains('on')).toBe(true)
      btn('close').click()
      expect(holo.isOpen()).toBe(true)
      expect(host.onClosing).toHaveBeenCalledTimes(1)
      run(600)
      expect(holo.isOpen()).toBe(false)
      expect(video.parentElement).toBe(holder)
    })

    it('leaves the frames to the host when it drives', () => {
      open()
      run(200)
      const panel = dlg().querySelector<HTMLElement>('.holo-panel')!
      expect(panel.style.clipPath).toBe('inset(0% 12.5% 0% 12.5%)')
      holo.tick()
      expect(panel.style.clipPath).not.toBe('inset(0% 12.5% 0% 12.5%)')
    })
  })
})
