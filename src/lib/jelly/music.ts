/**
 * What the words dance to: 40 log-spaced bands (35 Hz → 14 kHz, each normalized by its
 * own slowly falling peak), the waveform smoothed to 96 points, and beats (bass flux
 * over a running average). Fed by the site's music player through an AnalyserNode.
 */

export interface MusicInput {
  analyser: AnalyserNode | null
  playing: boolean
}

export const NB = 40
export const WN = 96

export class MusicFeatures {
  readonly bands = new Float32Array(NB)
  readonly wave = new Float32Array(WN)
  bass = 0
  beat = 0
  playing = false
  private peaks = new Float32Array(NB).fill(0.25)
  private bassAvg = 0
  private lastBeat = 0
  private fbuf: Uint8Array<ArrayBuffer> | null = null
  private tbuf: Float32Array<ArrayBuffer> | null = null
  private an: AnalyserNode | null = null

  constructor(private onBeat: (k: number) => void) {}

  update(dt: number, input: MusicInput | null) {
    const an = input?.analyser ?? null
    this.playing = !!an && !!input?.playing
    if (!an || !this.playing) {
      const k = Math.max(0, 1 - dt * 4)
      for (let b = 0; b < NB; b++) this.bands[b] *= k
      for (let i = 0; i < WN; i++) this.wave[i] *= k
      this.bass *= k
      this.beat *= Math.max(0, 1 - dt * 6)
      return
    }
    if (an !== this.an || !this.fbuf || !this.tbuf) {
      this.an = an
      this.fbuf = new Uint8Array(an.frequencyBinCount)
      this.tbuf = new Float32Array(an.fftSize)
    }
    const fbuf = this.fbuf, tbuf = this.tbuf
    an.getByteFrequencyData(fbuf)
    an.getFloatTimeDomainData(tbuf)
    const hz = an.context.sampleRate / an.fftSize
    for (let b = 0; b < NB; b++) {
      const f0 = 35 * Math.pow(400, b / NB), f1 = 35 * Math.pow(400, (b + 1) / NB)
      const i0 = Math.max(1, Math.floor(f0 / hz)), i1 = Math.min(fbuf.length, Math.max(i0 + 1, Math.ceil(f1 / hz)))
      let v = 0
      for (let i = i0; i < i1; i++) v = Math.max(v, fbuf[i])
      v = Math.max(0, (v - 70) / 185)
      this.peaks[b] = Math.max(v, this.peaks[b] * (1 - 0.15 * dt), 0.25)
      const n = Math.min(1, v / this.peaks[b]) ** 1.6
      this.bands[b] = n > this.bands[b] ? this.bands[b] + (n - this.bands[b]) * Math.min(1, dt * 30) : Math.max(n, this.bands[b] - dt * 2.4)
    }
    // the waveform, smoothed down to 96 points (and across frames) so it reads as a wave, not noise
    const W = tbuf.length / WN
    for (let k = 0; k < WN; k++) {
      const i0 = Math.floor(k * W), i1 = Math.floor((k + 1) * W)
      let a = 0
      for (let i = i0; i < i1; i++) a += tbuf[i]
      a /= Math.max(1, i1 - i0)
      this.wave[k] += (a * 6 - this.wave[k]) * Math.min(1, dt * 18)
    }
    // beats: bass jumps well above its recent average
    const bd = this.bands
    this.bass = (bd[0] + bd[1] + bd[2] + bd[3] + bd[4] + bd[5]) / 6
    this.bassAvg += (this.bass - this.bassAvg) * Math.min(1, dt * 2.5)
    this.beat *= Math.max(0, 1 - dt * 7)
    const now = performance.now() / 1000
    if (this.bass - this.bassAvg > 0.1 && this.bass > 0.45 && now - this.lastBeat > 0.26) {
      this.lastBeat = now
      this.beat = Math.min(1, 0.5 + (this.bass - this.bassAvg) * 3)
      this.onBeat(this.beat)
    }
  }

  bandAt(u: number) {
    const f = Math.max(0, Math.min(0.999, u)) * (NB - 1), i = Math.floor(f), t = f - i
    return this.bands[i] * (1 - t) + this.bands[i + 1] * t
  }

  waveAt(u: number) {
    const f = (((u % 1) + 1) % 1) * (WN - 1), i = Math.floor(f), t = f - i
    return this.wave[i] * (1 - t) + this.wave[Math.min(WN - 1, i + 1)] * t
  }
}
