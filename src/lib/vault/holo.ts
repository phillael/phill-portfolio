/**
 * The Relic Vault's hologram: Watch lifts the picture out of the set's glass. A native modal <dialog> on <body>
 * (outside the shroom wrappers, carrying its own tokens: vault.css) whose panel is mapped by a homography from the
 * screen's projected corners (the CRT's cropped middle first) out to the full video, with a light beam from the set
 * and the backdrop dimmed all but it. It plays the set's own <video>, moved in from the holder and back.
 *
 * Esc: the dialog's keydown stops it reaching shroom mode and the wizard (WizardChat's capture-phase listener leaves
 * an Escape inside an open modal dialog alone); the native `cancel` closes it our way (animated), and a browser that
 * closes it anyway still ends it through `close`. The backdrop: a click on the dialog itself closes it only when the
 * press started there too (a drag out of the panel also clicks the dialog). Focus returns to the opener; the page
 * doesn't scroll while it's up. Sound: the video's own sound is off until Sound on, which pauses the site's song;
 * Sound off, closing, or the visitor playing the song again hands it back (only if the hologram paused it).
 */

import type { Project } from '@/types/content'
import { getSiteMusic } from '@/lib/site-music'
import { BAR_H, clamp, cssH, easeInOut, easeOut, finalRect, hull, lerp, mapH, sq2quad, startCorners, type Pt, type Quad, type Rect } from './math'
import type { MediaEntry } from './vault'

export type HoloOpen = {
  project: Project
  media: MediaEntry
  /** the set's video: it moves into the hologram and back */
  video: HTMLVideoElement
  /** where the video lives while the hologram is down */
  holder: HTMLElement
  /** the share of the video the screen shows (across, down): the cover crop */
  crop: Pt
  /** the screen's corners on the viewport now (TL TR BR BL) */
  quad(): Quad
  /** where focus goes back to */
  opener: Element | null
}

export type HoloHost = {
  reducedMotion(): boolean
  /** true while the host's frame loop calls tick(); otherwise the hologram runs its own */
  drives(): boolean
  /** the panel's landing rect, at open and on resize (the camera looks up so the set lands below it) */
  onLayout?(f: Rect): void
  /** opening: the camera pulls back, the glass glows */
  onOpen?(): void
  /** on its way back into the glass */
  onClosing?(): void
  /** gone: the video is back in its holder */
  onClosed?(): void
}

export type Holo = {
  open(o: HoloOpen): void
  close(): void
  /** a frame: the flight, the panel's mapping, the beam (the host's loop calls it while open) */
  tick(): void
  isOpen(): boolean
  destroy(): void
}

const ICONS = {
  pause: '<path class="i-pause" d="M9 6v12M15 6v12"/><path class="i-play" d="M8 5.5v13l11-6.5z"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z M16 9.5a4 4 0 0 1 0 5"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  live: '<path d="M8 16L16 8M9 8h7v7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
}
const svg = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`
const SVGNS = 'http://www.w3.org/2000/svg'
let uid = 0

export function createHolo(host: HoloHost): Holo {
  const id = `holo-${++uid}`
  let dlg: HTMLDialogElement | null = null
  let els: {
    panel: HTMLDivElement
    bar: HTMLDivElement
    title: HTMLHeadingElement
    beam: SVGSVGElement
    poly: SVGPolygonElement
    grad: SVGLinearGradientElement
    play: HTMLButtonElement
    sound: HTMLButtonElement
    full: HTMLButtonElement
    live: HTMLAnchorElement
    x: HTMLButtonElement
  }
  let cur: HoloOpen | null = null
  let state: 'closed' | 'open' | 'closing' = 'closed'
  const H = { t: 0, dir: 0, end: null as Quad | null, W: 0, Hh: 0, last: 0 }
  let rm = false
  let overflow = ''
  let selfRaf = 0
  let songPaused = false
  let unsubMusic: (() => void) | null = null

  function make() {
    const d = document.createElement('dialog')
    d.className = 'holo'
    d.setAttribute('aria-labelledby', `${id}-t`)
    d.innerHTML = `
      <svg class="holo-beam" aria-hidden="true"><defs><linearGradient id="${id}-g" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="hsl(188 100% 80%)" stop-opacity=".55"/><stop offset="1" stop-color="hsl(190 100% 70%)" stop-opacity=".06"/></linearGradient></defs><polygon fill="url(#${id}-g)"/></svg>
      <div class="holo-panel"><div class="holo-scan" aria-hidden="true"></div></div>
      <div class="holo-bar">
        <h3 id="${id}-t" class="holo-t"></h3>
        <div class="holo-acts">
          <button type="button" class="holo-b" data-h="play">${svg(ICONS.pause)}<span class="lbl" aria-hidden="true"></span></button>
          <button type="button" class="holo-b" data-h="sound">${svg(ICONS.sound)}<span class="lbl" aria-hidden="true"></span></button>
          <button type="button" class="holo-b" data-h="full" aria-label="Full screen">${svg(ICONS.full)}<span class="lbl" aria-hidden="true">Full screen</span></button>
          <a class="holo-b" data-h="live">${svg(ICONS.live)}<span class="lbl" aria-hidden="true">Live</span></a>
          <button type="button" class="holo-b holo-x" data-h="close" aria-label="Close">${svg(ICONS.close)}</button>
        </div>
      </div>`
    const q = <T extends Element>(s: string) => d.querySelector<T>(s)!
    els = {
      panel: q('.holo-panel'),
      bar: q('.holo-bar'),
      title: q('.holo-t'),
      beam: q('.holo-beam'),
      poly: q('polygon'),
      grad: q('linearGradient'),
      play: q('[data-h="play"]'),
      sound: q('[data-h="sound"]'),
      full: q('[data-h="full"]'),
      live: q('[data-h="live"]'),
      x: q('[data-h="close"]'),
    }
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') e.stopPropagation() // the native cancel still runs
    })
    d.addEventListener('cancel', (e) => {
      e.preventDefault()
      close()
    })
    d.addEventListener('close', () => {
      if (state !== 'closed' && !d.open) finish()
    })
    let fromBackdrop = false
    d.addEventListener('pointerdown', (e) => {
      fromBackdrop = e.target === d
    })
    d.addEventListener('click', (e) => {
      if (e.target === d && fromBackdrop) close()
      fromBackdrop = false
    })
    els.bar.addEventListener('click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-h]')
      if (!b || !cur) return
      const v = cur.video
      const h = b.dataset.h
      if (h === 'close') close()
      else if (h === 'play') {
        if (v.paused) void v.play()?.catch(() => {})
        else v.pause()
        playLabel()
      } else if (h === 'sound') setSound(v.muted)
      else if (h === 'full') {
        const fv = v as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
        if (typeof fv.requestFullscreen === 'function') void fv.requestFullscreen().catch(() => fv.webkitEnterFullscreen?.())
        else fv.webkitEnterFullscreen?.()
      }
    })
    return d
  }

  /* ---------- the bar ---------- */
  function playLabel() {
    const paused = cur?.video.paused ?? false
    const l = paused ? 'Play' : 'Pause'
    els.play.classList.toggle('paused', paused)
    els.play.setAttribute('aria-label', l)
    els.play.querySelector('.lbl')!.textContent = l
    // the hologram's own motion (the scanline roll, the beam's hum) stops with its video
    dlg!.classList.toggle('holo-still', paused)
  }
  function soundLabel() {
    const l = cur?.video.muted === false ? 'Sound off' : 'Sound on'
    els.sound.setAttribute('aria-label', l)
    els.sound.querySelector('.lbl')!.textContent = l
  }
  /** the video's sound: on pauses the site's song (remembered); off hands it back if we paused it */
  function setSound(on: boolean) {
    if (!cur) return
    cur.video.muted = !on
    if (on) {
      const music = getSiteMusic()
      if (music?.isPlaying()) {
        music.pause()
        songPaused = true
      }
      unsubMusic ??=
        music?.onChange((playing) => {
          // the visitor played the song: the video goes quiet, and the song is theirs again
          if (!playing || !cur) return
          songPaused = false
          cur.video.muted = true
          soundLabel()
        }) ?? null
    } else handBack()
    soundLabel()
  }
  function handBack() {
    unsubMusic?.()
    unsubMusic = null
    if (songPaused) {
      songPaused = false
      getSiteMusic()?.play()
    }
  }

  /* ---------- layout and the flight ---------- */
  function layout() {
    if (!cur) return
    const { w, h } = cur.media
    const f = finalRect(w / h, innerWidth, innerHeight)
    H.W = f.w
    H.Hh = f.h
    els.panel.style.width = `${f.w}px`
    els.panel.style.height = `${f.h}px`
    H.end = [
      [f.x, f.y],
      [f.x + f.w, f.y],
      [f.x + f.w, f.y + f.h],
      [f.x, f.y + f.h],
    ]
    Object.assign(els.bar.style, { left: `${f.x}px`, top: `${f.y - BAR_H}px`, width: `${f.w}px`, height: `${BAR_H - 6}px` })
    host.onLayout?.(f)
  }

  function tick() {
    if (!cur || !dlg || state === 'closed') return
    const now = performance.now()
    const dt = Math.min(0.05, (now - H.last) / 1000)
    H.last = now
    if (H.dir) {
      H.t = clamp(H.t + (H.dir > 0 ? dt / 0.78 : -dt / 0.5))
      if (H.dir > 0 && H.t >= 1) {
        H.dir = 0
        landed()
      }
      if (H.dir < 0 && H.t <= 0) return finish()
    }
    const quad = cur.quad()
    const k = H.dir < 0 ? easeInOut(H.t) : easeOut(H.t)
    const start = startCorners(quad, cur.crop)
    const pts = start.map((s, n) => [lerp(s[0], H.end![n][0], k), lerp(s[1], H.end![n][1], k)]) as Quad
    const M2 = sq2quad(pts)
    els.panel.style.transform = cssH(M2, H.W, H.Hh)
    const [cx, cy] = cur.crop
    const ix = ((1 - cx) / 2) * (1 - k)
    const iy = ((1 - cy) / 2) * (1 - k)
    els.panel.style.clipPath = `inset(${iy * 100}% ${ix * 100}% ${iy * 100}% ${ix * 100}%)`
    const vis: Pt[] = [mapH(M2, ix, iy), mapH(M2, 1 - ix, iy), mapH(M2, 1 - ix, 1 - iy), mapH(M2, ix, 1 - iy)]
    els.poly.setAttribute('points', hull(quad.concat(vis)).map((q) => q.join(',')).join(' '))
    const qc = quad.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0])
    const pc = vis.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0])
    els.grad.setAttribute('x1', String(qc[0]))
    els.grad.setAttribute('y1', String(qc[1]))
    els.grad.setAttribute('x2', String(pc[0]))
    els.grad.setAttribute('y2', String(pc[1]))
    dlg.style.setProperty('--tx', `${qc[0]}px`)
    dlg.style.setProperty('--ty', `${qc[1]}px`)
    els.beam.style.opacity = rm ? '0.35' : String(0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.15)) + (H.dir === 0 ? 0.35 : 0))
  }

  const isOpen = () => state !== 'closed'
  // without the host's loop (no WebGL), the hologram runs its own while it flies
  function selfDrive() {
    if (selfRaf || host.drives()) return
    const loop = () => {
      selfRaf = 0
      if (!isOpen() || host.drives()) return
      tick()
      if (isOpen() && H.dir !== 0) selfRaf = requestAnimationFrame(loop)
    }
    selfRaf = requestAnimationFrame(loop)
  }
  function onResize() {
    if (!isOpen()) return
    layout()
    tick()
  }

  function landed() {
    els.bar.classList.add('on')
    els.beam.classList.add('idle')
    if (!rm) {
      void els.panel.offsetWidth // restart the flicker
      els.panel.classList.add('flicker')
    }
  }

  /* ---------- open / close ---------- */
  function open(o: HoloOpen) {
    if (state !== 'closed') return
    dlg ??= make()
    if (!dlg.isConnected) document.body.append(dlg)
    cur = o
    state = 'open'
    rm = host.reducedMotion()
    dlg.classList.toggle('holo-rm', rm)
    dlg.classList.remove('closing', 'holo-still')
    els.bar.classList.remove('on')
    els.panel.classList.remove('flicker')
    els.beam.classList.remove('idle')
    els.title.textContent = o.project.title

    const href = o.project.liveUrl
    els.live.hidden = !href
    if (href) {
      const internal = href.startsWith('/')
      els.live.href = href
      if (internal) {
        els.live.removeAttribute('target')
        els.live.removeAttribute('rel')
      } else {
        els.live.target = '_blank'
        els.live.rel = 'noopener noreferrer'
      }
      els.live.setAttribute('aria-label', internal ? 'Live' : 'Live (opens in a new tab)')
    }
    els.sound.hidden = !o.media.audio

    // the set's own video, into the panel (under the scanlines); muted until Sound on
    const v = o.video
    v.muted = true
    v.classList.add('holo-v')
    els.panel.prepend(v)
    void v.play()?.catch(() => {})
    playLabel()
    soundLabel()

    dlg.showModal()
    overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    els.x.focus({ preventScroll: true })
    layout()
    host.onOpen?.()
    H.last = performance.now()
    if (rm) {
      H.t = 1
      H.dir = 0
      els.panel.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' })
      landed()
    } else {
      H.t = 0
      H.dir = 1
      els.panel.style.opacity = '1'
    }
    tick()
    selfDrive()
    addEventListener('resize', onResize)
  }

  function close() {
    if (state !== 'open' || !dlg) return
    state = 'closing'
    els.bar.classList.remove('on')
    els.beam.classList.remove('idle')
    els.panel.classList.remove('flicker')
    dlg.classList.add('closing')
    host.onClosing?.()
    if (rm) {
      // a fade in place
      if (typeof els.panel.animate !== 'function') return finish()
      els.panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(finish, finish)
      return
    }
    H.dir = -1
    H.last = performance.now()
    selfDrive()
  }

  function finish() {
    if (state === 'closed' || !dlg || !cur) return
    const o = cur
    state = 'closed'
    H.dir = 0
    cancelAnimationFrame(selfRaf)
    selfRaf = 0
    removeEventListener('resize', onResize)
    els.panel.getAnimations?.().forEach((a) => a.cancel())
    if (dlg.open) dlg.close()
    dlg.classList.remove('closing')
    document.documentElement.style.overflow = overflow
    // the video goes back to its set, quiet; the song comes back if we paused it
    const v = o.video
    v.muted = true
    handBack()
    v.classList.remove('holo-v')
    o.holder.append(v)
    cur = null
    const back = o.opener
    if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true })
    host.onClosed?.()
  }

  return {
    open,
    close,
    tick,
    isOpen,
    destroy() {
      if (state !== 'closed') finish()
      dlg?.remove()
      dlg = null
    },
  }
}
