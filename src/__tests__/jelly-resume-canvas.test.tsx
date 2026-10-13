/**
 * The direct-visit 3D resume on /resume: it mounts the engine over the semantic page
 * (aria-hidden), plays the direct entrance with ?find=, and never mounts for reduced
 * motion. The engine is mocked (jsdom has no WebGL2).
 */

import { render, waitFor } from '@testing-library/react'
import JellyResumeDirect from '@/components/jelly/JellyResumeDirect'
import { createJellyEngine } from '@/lib/jelly/engine'

const engine = { openDirect: jest.fn(), load: jest.fn(), dispose: jest.fn() }
jest.mock('@/lib/jelly/engine', () => ({ createJellyEngine: jest.fn(() => engine) }))
jest.mock('@/lib/jelly/snapshot', () => ({ loadSnapshot: jest.fn(() => Promise.resolve('snapshot')) }))

const mediaQuery = (reduced: boolean) =>
  jest.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  )

describe('JellyResumeDirect', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    window.history.replaceState(null, '', '/')
  })

  it('mounts the engine on an aria-hidden canvas and plays the direct entrance with ?find=', async () => {
    mediaQuery(false)
    window.history.replaceState(null, '', '/resume?find=React')
    const { container, unmount } = render(<JellyResumeDirect />)

    await waitFor(() => expect(container.querySelector('canvas')).not.toBeNull())
    const canvas = container.querySelector('canvas')!
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(createJellyEngine).toHaveBeenCalledWith({ canvas })
    expect(engine.openDirect).toHaveBeenCalledWith('React')
    await waitFor(() => expect(engine.load).toHaveBeenCalledWith('snapshot'))

    unmount()
    expect(engine.dispose).toHaveBeenCalled()
  })

  it('never mounts the engine for reduced motion', async () => {
    mediaQuery(true)
    const { container } = render(<JellyResumeDirect />)
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('canvas')).toBeNull()
    expect(createJellyEngine).not.toHaveBeenCalled()
  })
})
