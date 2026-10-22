/**
 * The Relic Vault's engine (src/lib/vault/vault.ts) in jsdom: three's WebGLRenderer, PMREM, texture loader and the
 * composer are mocked; frames, the IntersectionObserver, the ResizeObserver and the video element are driven by hand.
 */

import projectsData from '@/data/projects.json'
import media from '@/data/projects-media.json'
import type { Project } from '@/types/content'
import { createVault, type MediaEntry, type Vault, type VaultOpts } from '@/lib/vault/vault'

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
jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({ UnrealBloomPass: class { dispose() {} } }))
jest.mock('three/examples/jsm/postprocessing/OutputPass.js', () => ({ OutputPass: class {} }))

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
  // a 2D context that draws nothing (the sets' wood, grille, keys and blob; the spill's 4×4 sample)
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

/** built (renderer, reflections, six sets, shaders), on screen, and the front set powered on */
async function ready(over: Partial<VaultOpts> = {}) {
  const m = mount(over)
  await frames(12)
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
    await frames(3)
    expect(opts.onReady).not.toHaveBeenCalled()
    await frames(9)
    expect(opts.onReady).toHaveBeenCalledTimes(1)
    const drawn = mockRender.mock.calls.length
    expect(drawn).toBe(1)
    await frames(30)
    expect(mockRender.mock.calls.length).toBe(drawn)
  })

  it('loads no video until a set is in front on screen, then only that one (webm, then mp4)', async () => {
    const m = mount()
    await frames(12)
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
