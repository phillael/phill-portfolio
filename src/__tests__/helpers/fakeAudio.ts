/**
 * A small fake Web Audio for jsdom (which has none): every node records what it was set to and what it
 * started, `connect` returns its target (so chains work) and a buffer source's `onended` can be fired by hand.
 * Shared by the Skill blaster's tests.
 */

export interface FakeParam {
  value: number
  calls: [string, number, number?][]
  setValueAtTime(v: number, t: number): FakeParam
  linearRampToValueAtTime(v: number, t: number): FakeParam
  exponentialRampToValueAtTime(v: number, t: number): FakeParam
  setTargetAtTime(v: number, t: number, c: number): FakeParam
  cancelScheduledValues(t: number): FakeParam
}

const param = (value = 0): FakeParam => ({
  value,
  calls: [],
  setValueAtTime(v, t) { this.calls.push(['set', v, t]); return this },
  linearRampToValueAtTime(v, t) { this.calls.push(['linear', v, t]); return this },
  exponentialRampToValueAtTime(v, t) { this.calls.push(['exp', v, t]); return this },
  setTargetAtTime(v, t, c) { this.calls.push(['target', v, t]); void c; return this },
  cancelScheduledValues(t) { this.calls.push(['cancel', t]); return this },
})

export interface FakeNode {
  kind: string
  type: string
  buffer: unknown
  loop: boolean
  curve: unknown
  oversample: string
  fftSize: number
  frequency: FakeParam
  detune: FakeParam
  Q: FakeParam
  gain: FakeParam
  pan: FakeParam
  delayTime: FakeParam
  playbackRate: FakeParam
  threshold: FakeParam
  knee: FakeParam
  ratio: FakeParam
  attack: FakeParam
  release: FakeParam
  started: number | null
  offset: number | null
  stopped: number | null
  onended: (() => void) | null
  disconnected: boolean
  connect<T>(to: T): T
  disconnect(): void
  start(t?: number, offset?: number): void
  stop(t?: number): void
}

export interface FakeBuffer {
  numberOfChannels: number
  length: number
  sampleRate: number
  duration: number
  getChannelData(c: number): Float32Array
}

export const fakeBuffer = (channels: number, length: number, sampleRate: number, fill = 0): FakeBuffer => {
  const data = Array.from({ length: channels }, () => new Float32Array(length).fill(fill))
  return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (c) => data[c] }
}

export class FakeAudioContext {
  state = 'running'
  currentTime = 0
  sampleRate = 8000
  nodes: FakeNode[] = []
  destination = this.make('destination')
  decoded: FakeBuffer | null = null

  make(kind: string): FakeNode {
    const n: FakeNode = {
      kind, type: '', buffer: null, loop: false, curve: null, oversample: 'none', fftSize: 2048,
      frequency: param(), detune: param(), Q: param(), gain: param(1), pan: param(), delayTime: param(),
      playbackRate: param(1), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(),
      started: null, offset: null, stopped: null, onended: null, disconnected: false,
      connect: (to) => to,
      disconnect() { this.disconnected = true },
      start(t = 0, offset) { this.started = t; this.offset = offset ?? null },
      stop(t = 0) { this.stopped = t },
    }
    this.nodes.push(n)
    return n
  }

  createGain() { return this.make('gain') }
  createDynamicsCompressor() { return this.make('compressor') }
  createAnalyser() { return this.make('analyser') }
  createBiquadFilter() { return this.make('filter') }
  createDelay() { return this.make('delay') }
  createChannelMerger() { return this.make('merger') }
  createConvolver() { return this.make('convolver') }
  createStereoPanner() { return this.make('panner') }
  createWaveShaper() { return this.make('shaper') }
  createOscillator() { return this.make('osc') }
  createBufferSource() { return this.make('source') }
  createBuffer(channels: number, length: number, sampleRate: number) { return fakeBuffer(channels, length, sampleRate) }
  decodeAudioData() { return this.decoded ? Promise.resolve(this.decoded) : Promise.reject(new Error('no audio')) }
  resume() { this.state = 'running'; return Promise.resolve() }
  close() { return Promise.resolve() }

  /** the nodes of one kind made since `from` (an index into `nodes`) */
  since(from: number, kind: string) { return this.nodes.slice(from).filter((n) => n.kind === kind) }
}

/** lets every pending promise callback run */
export const flush = async (times = 10) => {
  for (let i = 0; i < times; i++) await Promise.resolve()
}
