/**
 * One music player: the site's player publishes its audio source, and the 3D resume taps
 * it with its own analyser (fftSize 2048: 40 bands plus the waveform) so the words dance
 * to the song that's playing, without touching the site visualizer's analyser.
 */

import { render, act } from '@testing-library/react'
import MusicPlayer from '@/components/music/MusicPlayer'
import { getSiteMusic } from '@/lib/site-music'
import { createMusicTap } from '@/lib/jelly/music'

const source = { connect: jest.fn(), disconnect: jest.fn() }
const context = { state: 'running' }
const audio = {
  isPlaying: true,
  currentTrack: null,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  frequencyData: { bass: 0, treble: 0, intensity: 0 },
  play: jest.fn(),
  pause: jest.fn(),
  toggle: jest.fn(),
  setTrack: jest.fn(),
  nextTrack: jest.fn(),
  prevTrack: jest.fn(),
  seek: jest.fn(),
  setVolume: jest.fn(),
  toggleMute: jest.fn(),
  getFrequencyData: jest.fn(),
  getSourceNode: jest.fn(() => source),
  getAudioContext: jest.fn(() => context),
}
jest.mock('@/hooks/useAudioPlayer', () => ({ useAudioPlayer: () => audio }))
jest.mock('@/components/music/MusicFAB', () => ({ __esModule: true, default: () => null }))

describe('the site player publishes itself', () => {
  it('registers its source, state and toggle while mounted', () => {
    const { unmount } = render(<MusicPlayer />)
    const m = getSiteMusic()!
    expect(m.getSource()).toBe(source)
    expect(m.isPlaying()).toBe(true)
    m.toggle()
    expect(audio.toggle).toHaveBeenCalled()
    unmount()
    expect(getSiteMusic()).toBeNull()
  })
})

describe('the Skill blaster shares the player', () => {
  beforeEach(() => {
    audio.isPlaying = false
    jest.clearAllMocks()
  })

  it('hands out the player\'s audio context', () => {
    render(<MusicPlayer />)
    expect(getSiteMusic()!.context()).toBe(context)
    expect(audio.getAudioContext).toHaveBeenCalledTimes(1)
  })

  it('pauses and plays the player', () => {
    render(<MusicPlayer />)
    const m = getSiteMusic()!
    m.pause()
    expect(audio.pause).toHaveBeenCalledTimes(1)
    m.play()
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(audio.toggle).not.toHaveBeenCalled()
  })

  it('tells listeners when the player starts and stops, until they unsubscribe', () => {
    const { rerender } = render(<MusicPlayer />)
    const heard: boolean[] = []
    const off = getSiteMusic()!.onChange((playing) => heard.push(playing))
    expect(heard).toEqual([]) // nothing changed yet

    audio.isPlaying = true
    act(() => rerender(<MusicPlayer />))
    audio.isPlaying = false
    act(() => rerender(<MusicPlayer />))
    expect(heard).toEqual([true, false])

    off()
    audio.isPlaying = true
    act(() => rerender(<MusicPlayer />))
    expect(heard).toEqual([true, false])
  })
})

describe('the resume taps the player', () => {
  const fakeSource = () => {
    const analyser = { fftSize: 0, smoothingTimeConstant: 0 }
    return { analyser, node: { context: { createAnalyser: jest.fn(() => analyser) }, connect: jest.fn(), disconnect: jest.fn() } }
  }

  it('attaches its own 2048-point analyser once the player has an audio graph, and lets go after', () => {
    let current: ReturnType<typeof fakeSource>['node'] | null = null
    let playing = false
    const tap = createMusicTap(() => ({
      getSource: () => current as unknown as MediaElementAudioSourceNode,
      isPlaying: () => playing,
      toggle: () => {},
      open: () => {},
      context: () => null,
      pause: () => {},
      play: () => {},
      onChange: () => () => {},
    }))

    expect(tap.get()).toEqual({ analyser: null, playing: false }) // nothing has played yet

    const a = fakeSource()
    current = a.node
    playing = true
    const input = tap.get()!
    expect(input.playing).toBe(true)
    expect(input.analyser).toBe(a.analyser)
    expect(a.analyser).toMatchObject({ fftSize: 2048, smoothingTimeConstant: 0.5 })
    expect(a.node.connect).toHaveBeenCalledWith(a.analyser)
    tap.get()
    expect(a.node.context.createAnalyser).toHaveBeenCalledTimes(1) // reused frame to frame

    tap.dispose()
    expect(a.node.disconnect).toHaveBeenCalledWith(a.analyser)
  })

  it('no site player: no music', () => {
    expect(createMusicTap(() => null).get()).toBeNull()
  })
})
