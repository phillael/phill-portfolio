/**
 * The Relic Vault's engine (src/lib/vault/vault.ts) in jsdom: three's WebGLRenderer, PMREM, texture loader and the
 * composer are mocked; frames, the IntersectionObserver, the ResizeObserver and the video element are driven by hand.
 */

import projectsData from '@/data/projects.json'
import media from '@/data/projects-media.json'
import type { Project } from '@/types/content'
import { registerSiteMusic, type SiteMusic } from '@/lib/site-music'
import { createVault, type MediaEntry, type VaultOpts } from '@/lib/vault/vault'
import { FakeAudioContext } from './helpers/fakeAudio'

const mockRender = jest.fn()
const mockRendererDispose = jest.fn()
const mockWebGL = { fail: false }

jest.mock('three', () => {
  const actual = jest.requireActual('three')
  class WebGLRenderer {
    domElement: HTMLCanvasElement
    constructor(o: { canvas: HTMLCanvasElement }) {
      if (mockWebGL.fail) throw new Error('Error creating WebGL context.')
      this.domElement = o.canvas
    }
    setPixelRatio() {}
    getPixelRatio() {
      return 1
    }
    setSize(w: number, h: number) {
      this.domElement.width = w
      this.domElement.height = h
    }
    compileAsync() {
      return Promise.resolve()
    }
    initTexture() {}
    initRenderTarget() {}
    getSize(v: { set(x: number, y: number): unknown }) {
      return v.set(this.domElement.width, this.domElement.height)
    }
    getRenderTarget() {
      return null
    }
    setRenderTarget() {}
    render() {}
    dispose = mockRendererDispose
    forceContextLoss() {}
  }
  class PMREMGenerator {
    fromScene() {
      return { texture: new actual.Texture() }
    }
    dispose() {}
  }
  class TextureLoader {
    load(_url: string, onLoad?: (t: unknown) => void) {
      const t = new actual.Texture()
      onLoad?.(t)
      return t
    }
  }
  return { ...actual, WebGLRenderer, PMREMGenerator, TextureLoader }
})
jest.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: class {
    readBuffer = {}
    writeBuffer = {}
    renderTarget1 = {}
    renderTarget2 = {}
    addPass() {}
    setPixelRatio() {}
    setSize() {}
    render() {
      mockRender()
    }
    dispose() {}
  },
}))
jest.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({ RenderPass: class {} }))
jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: class {
    materialHighPassFilter = {}
    separableBlurMaterials = [{}, {}]
    compositeMaterial = {}
    blendMaterial = {}
    renderTargetBright = {}
    renderTargetsHorizontal = [{}]
    renderTargetsVertical = [{}]
    dispose() {}
  },
}))
jest.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({ OutputPass: class { renderToScreen = false; render() {} } }))

const projects = projectsData as Project[]
const MEDIA = media as Record<string, MediaEntry>

/* ---------- frames on a clock we own ---------- */
let clock = 1000
let rafQueue = new Map<number, FrameRequestCallback>()
let rafId = 0
const flushMicrotasks = async () => {
  for (let k = 0; k < 5; k++) await Promise.resolve()
}
/** run n animation frames, dt ms apart */
async function frames(n: number, dt = 1000 / 60) {
  for (let k = 0; k < n; k++) {
    clock += dt
    const due = [...rafQueue.values()]
    rafQueue = new Map()
    due.forEach((cb) => cb(clock))
    await flushMicrotasks()
  }
}

/* ---------- observers ---------- */
let ioCallback: IntersectionObserverCallback | null = null
const ioDisconnect = jest.fn()
const roDisconnect = jest.fn()
const onScreen = (yes: boolean) => ioCallback?.([{ isIntersecting: yes } as IntersectionObserverEntry], {} as IntersectionObserver)

beforeEach(() => {
  clock = 1000
  rafQueue = new Map()
  mockWebGL.fail = false
  mockRender.mockClear()
  mockRendererDispose.mockClear()
  ioDisconnect.mockClear()
  roDisconnect.mockClear()
  jest.spyOn(performance, 'now').mockImplementation(() => clock)
  window.requestAnimationFrame = (cb) => {
    rafQueue.set(++rafId, cb)
    return rafId
  }
  window.cancelAnimationFrame = (id) => void rafQueue.delete(id)
  window.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      ioCallback = cb
    }
    observe() {}
    unobserve() {}
    disconnect = ioDisconnect
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect = roDisconnect
  } as unknown as typeof ResizeObserver
  // a context that draws nothing (the sets' wood, grille, keys and blob; the spill's 4×4 sample; the WebGL2 probe)
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    const noop = () => {}
    return {
      canvas: this,
      fillRect: noop,
      beginPath: noop,
      arc: noop,
      fill: noop,
      lineTo: noop,
      stroke: noop,
      drawImage: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
      getImageData: () => ({ data: new Uint8ClampedArray(64) }),
      getExtension: () => null,
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext)
  // video: play() starts it and fires `playing`; pause() stops it
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: false, configurable: true })
    this.dispatchEvent(new Event('playing'))
    return Promise.resolve()
  })
  jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { value: true, configurable: true })
  })
  jest.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  document.body.innerHTML = ''
})

function mount(over: Partial<VaultOpts> = {}) {
  const stage = document.createElement('div')
  Object.defineProperty(stage, 'clientWidth', { value: 1280 })
  Object.defineProperty(stage, 'clientHeight', { value: 700 })
  const canvas = document.createElement('canvas')
  const videoHolder = document.createElement('div')
  stage.append(canvas, videoHolder)
  document.body.append(stage)
  const opts: VaultOpts = {
    stage,
    canvas,
    projects,
    media: MEDIA,
    videoHolder,
    reducedMotion: false,
    onNear: jest.fn(),
    onReady: jest.fn(),
    onFail: jest.fn(),
    onAnnounce: jest.fn(),
    onInteract: jest.fn(),
    ...over,
  }
  const vault = createVault(opts)
  return { vault, opts, canvas, videoHolder }
}

/** the build's frames: the context and the renderer, the passes, the decor, the environment (4), each set (2), the targets, the
 * shaders, a warm-up draw per set, then the first frame */
const BUILD = 2 + 1 + 1 + 4 + 6 * 2 + 1 + 1 + 6 + 1

/** built, on screen, and the front set powered on */
async function ready(over: Partial<VaultOpts> = {}) {
  const m = mount(over)
  await frames(BUILD)
  expect(m.opts.onReady).toHaveBeenCalledTimes(1)
  onScreen(true)
  await frames(10)
  return m
}

const videos = (holder: HTMLElement) => [...holder.querySelectorAll('video')]
const near = (opts: VaultOpts) => (opts.onNear as jest.Mock).mock.calls.map(([i]) => i)

describe('createVault', () => {
  it('builds over several frames, draws a first frame, then waits for the stage to be on screen', async () => {
    const { opts } = mount()
    await frames(BUILD - 1)
    expect(opts.onReady).not.toHaveBeenCalled()
    await frames(1)
    expect(opts.onReady).toHaveBeenCalledTimes(1)
    const drawn = mockRender.mock.calls.length
    expect(drawn).toBe(1)
    await frames(30)
    expect(mockRender.mock.calls.length).toBe(drawn)
  })

  it('loads no video until a set is in front on screen, then only that one (webm, then mp4)', async () => {
    const m = mount()
    await frames(BUILD)
    expect(videos(m.videoHolder)).toHaveLength(0)
    onScreen(true)
    await frames(10)
    const [v] = videos(m.videoHolder)
    expect(videos(m.videoHolder)).toHaveLength(1)
    expect([...v.querySelectorAll('source')].map((s) => s.getAttribute('src'))).toEqual(['/projects/number-slayers.webm', '/projects/number-slayers.mp4'])
    expect(v.muted && v.loop && v.playsInline).toBe(true)
    expect(v.paused).toBe(false)
  })

  it('runs one loop: a draw per animation frame, even after a video starts inside a frame', async () => {
    await ready()
    const drawn = mockRender.mock.calls.length
    await frames(10)
    expect(mockRender.mock.calls.length - drawn).toBe(10)
    expect(rafQueue.size).toBe(1)
  })

  it('go() moves near through onNear exactly once per index, and plays only the set in front', async () => {
    const { vault, opts, videoHolder } = await ready()
    vault.go(4)
    await frames(200)
    expect(near(opts)).toEqual([2, 3, 4])
    vault.go(4)
    await frames(30)
    expect(near(opts)).toEqual([2, 3, 4])
    const [slayers, pickleball] = videos(videoHolder)
    expect(slayers.paused).toBe(true)
    expect(pickleball.querySelector('source')?.getAttribute('src')).toBe('/projects/pickleball-2079.webm')
    expect(pickleball.paused).toBe(false)
  })

  it('announces the arrows’ moves, not the tabs’', async () => {
    const { vault, opts } = await ready()
    vault.go(2)
    expect(opts.onAnnounce).not.toHaveBeenCalled()
    vault.go(3, true)
    expect(opts.onAnnounce).toHaveBeenCalledWith(3)
  })

  it('step() goes from where the hall is heading, so quick presses add up (and wrap)', async () => {
    const { vault, opts } = await ready()
    vault.step(1)
    vault.step(1)
    expect((opts.onAnnounce as jest.Mock).mock.calls.map(([i]) => i)).toEqual([2, 3])
    await frames(200)
    expect(near(opts).at(-1)).toBe(3)
    vault.go(0)
    vault.step(-1)
    expect(opts.onAnnounce).toHaveBeenLastCalledWith(5)
  })

  it('setPaused(true) pauses the front video; false plays it again', async () => {
    const { vault, videoHolder } = await ready()
    const [v] = videos(videoHolder)
    expect(v.paused).toBe(false)
    vault.setPaused(true)
    expect(v.paused).toBe(true)
    vault.setPaused(false)
    expect(v.paused).toBe(false)
  })

  it('pauses the video and stops drawing off screen', async () => {
    const { videoHolder } = await ready()
    const [v] = videos(videoHolder)
    onScreen(false)
    expect(v.paused).toBe(true)
    await frames(2)
    const drawn = mockRender.mock.calls.length
    await frames(30)
    expect(mockRender.mock.calls.length).toBe(drawn)
  })

  it('with reduced motion: go() is instant, and nothing autoplays', async () => {
    const { vault, opts, videoHolder } = await ready({ reducedMotion: true })
    const [v] = videos(videoHolder)
    expect(v.paused).toBe(true)
    vault.go(4)
    await frames(1)
    expect(near(opts)).toEqual([4])
    const S = (window as unknown as { __vault: { S: { pos: number } } }).__vault.S
    expect(S.pos).toBe(4)
  })

  it('destroy() removes its listeners, stops the loop and frees the videos', async () => {
    const { vault, opts, canvas, videoHolder } = await ready()
    const removed = jest.spyOn(canvas, 'removeEventListener')
    vault.destroy()
    expect(removed.mock.calls.map(([type]) => type).sort()).toEqual(
      ['pointercancel', 'pointerdown', 'pointerleave', 'pointermove', 'pointerup', 'webglcontextlost', 'wheel'].sort(),
    )
    expect(ioDisconnect).toHaveBeenCalled()
    expect(roDisconnect).toHaveBeenCalled()
    expect(mockRendererDispose).toHaveBeenCalled()
    expect(videos(videoHolder)).toHaveLength(0)
    expect(rafQueue.size).toBe(0)
    const drawn = mockRender.mock.calls.length
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: 200 }))
    await frames(10)
    expect(mockRender.mock.calls.length).toBe(drawn)
    expect(opts.onNear).not.toHaveBeenCalled()
    expect((window as { __vault?: unknown }).__vault).toBeUndefined()
  })

  it.each([1, 2, 3, 5, 9, 20])('destroy() after %i build frames is safe, and stops the build', async (n) => {
    const { vault, opts } = mount()
    await frames(n)
    expect(() => vault.destroy()).not.toThrow()
    await frames(BUILD)
    expect(opts.onReady).not.toHaveBeenCalled()
    expect(rafQueue.size).toBe(0)
  })

  it('calls onFail (and never onReady) when the renderer throws, and still moves the selection', async () => {
    mockWebGL.fail = true
    const { vault, opts } = mount()
    await frames(5)
    expect(opts.onFail).toHaveBeenCalledTimes(1)
    expect(opts.onReady).not.toHaveBeenCalled()
    vault.go(3, true)
    expect(opts.onNear).toHaveBeenCalledWith(3)
    expect(opts.onAnnounce).toHaveBeenCalledWith(3)
  })

  describe('Watch', () => {
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
    const dlg = () => document.querySelector<HTMLDialogElement>('dialog.holo')

    it('on the lit set opens the hologram on that set’s own video, and closing puts it back and plays it', async () => {
      const { vault, videoHolder } = await ready()
      const [v] = videos(videoHolder)
      await frames(70) // its power-on (1.1 s) is done
      vault.watch(1)
      expect(dlg()?.open).toBe(true)
      expect(v.parentElement).toBe(dlg()!.querySelector('.holo-panel'))
      await frames(80)
      dlg()!.querySelector<HTMLButtonElement>('[data-h="close"]')!.click()
      await frames(60)
      expect(dlg()?.open).toBe(false)
      expect(v.parentElement).toBe(videoHolder)
      expect(v.paused).toBe(false)
    })

    it('on another set goes there first, then opens once it has powered on', async () => {
      const { vault } = await ready()
      vault.watch(3)
      expect(dlg()?.open).toBeFalsy()
      await frames(200)
      expect(dlg()?.open).toBe(true)
      expect(dlg()!.querySelector('video source')?.getAttribute('src')).toBe('/projects/jelly-resume.webm')
    })

    /** a click on the stage at (fx, fy) of its size (the engine reads offsetX/Y) */
    const clickAt = (canvas: HTMLCanvasElement, fx: number, fy: number) => {
      for (const type of ['pointerdown', 'pointerup']) {
        const ev = new MouseEvent(type, { button: 0, clientX: fx * 1280, clientY: fy * 700, bubbles: true })
        Object.defineProperties(ev, { offsetX: { value: fx * 1280 }, offsetY: { value: fy * 700 }, pointerId: { value: 1 }, pointerType: { value: 'mouse' } })
        canvas.dispatchEvent(ev)
      }
    }

    it('a click on the front set’s screen is Watch, even while it is still powering on', async () => {
      const { canvas } = await ready()
      clickAt(canvas, 0.63, 0.47)
      expect(dlg()?.open).toBeFalsy()
      await frames(80)
      expect(dlg()?.open).toBe(true)
    })

    it('a click beside the sets does nothing', async () => {
      const { canvas, opts } = await ready()
      clickAt(canvas, 0.4, 0.08)
      await frames(80)
      expect(dlg()?.open).toBeFalsy()
      expect(opts.onNear).not.toHaveBeenCalled()
    })

    it('still works without WebGL: it lifts from the fallback’s screen', async () => {
      mockWebGL.fail = true
      const { vault, opts } = mount()
      const screen = document.createElement('div')
      screen.dataset.vaultScreen = ''
      opts.stage.append(screen)
      await frames(3)
      vault.watch(4)
      expect(opts.onNear).toHaveBeenCalledWith(4)
      expect(dlg()?.open).toBe(true)
      expect(dlg()!.querySelector('video source')?.getAttribute('src')).toBe('/projects/pickleball-2079.webm')
    })
  })

  describe('sound', () => {
    let ac: FakeAudioContext
    let context: jest.Mock
    beforeEach(() => {
      ac = new FakeAudioContext()
      context = jest.fn(() => ac)
      registerSiteMusic({ context, isPlaying: () => false, onChange: () => () => {} } as unknown as SiteMusic)
    })
    afterEach(() => registerSiteMusic(null))
    const oscs = () => ac.nodes.filter((n) => n.kind === 'osc').length

    it('is silent until armSound() (from a click), then the sets’ changes sound', async () => {
      const { vault } = await ready()
      vault.go(2)
      await frames(120)
      expect(context).not.toHaveBeenCalled()
      vault.armSound()
      vault.armSound()
      expect(context).toHaveBeenCalledTimes(1)
      vault.go(3)
      expect(oscs()).toBe(1) // the power-off
      await frames(120)
      expect(oscs()).toBe(5) // + the power-on
    })

    it('keeps a set powering on as the hall scrolls back in silent', async () => {
      const { vault } = await ready()
      vault.armSound()
      onScreen(false)
      vault.go(4)
      const before = oscs()
      await frames(120)
      onScreen(true)
      await frames(30)
      expect(oscs()).toBe(before)
    })
  })

  it('falls back without three when the browser has no WebGL2 (no three errors in the console)', async () => {
    const real = HTMLCanvasElement.prototype.getContext
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type === 'webgl2' ? null : (real as (...a: unknown[]) => unknown).call(this, type, ...rest)
    } as unknown as typeof HTMLCanvasElement.prototype.getContext)
    const { opts } = mount()
    await frames(3)
    expect(opts.onFail).toHaveBeenCalledTimes(1)
    expect(mockRendererDispose).not.toHaveBeenCalled()
  })

  it('calls onFail when the WebGL context is lost', async () => {
    const { opts, canvas } = await ready()
    canvas.dispatchEvent(new Event('webglcontextlost'))
    expect(opts.onFail).toHaveBeenCalledTimes(1)
  })

  it('moves one set per sideways trackpad swipe past 60 px, and announces it', async () => {
    const { opts, canvas } = await ready()
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: 40, cancelable: true }))
    expect(opts.onAnnounce).not.toHaveBeenCalled()
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: 30, cancelable: true }))
    expect(opts.onAnnounce).toHaveBeenCalledWith(2)
    // the flick's momentum rests…
    clock += 100
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: 90, cancelable: true }))
    expect(opts.onAnnounce).toHaveBeenCalledTimes(1)
    // …then moves on
    clock += 300
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: 90, cancelable: true }))
    expect(opts.onAnnounce).toHaveBeenLastCalledWith(3)
    // a new swipe starts from nothing
    clock += 1000
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: -50, cancelable: true }))
    expect(opts.onAnnounce).toHaveBeenCalledTimes(2)
    // a vertical scroll stays the page's
    const down = new WheelEvent('wheel', { deltaY: 300, deltaX: 10, cancelable: true })
    canvas.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(false)
  })
})
