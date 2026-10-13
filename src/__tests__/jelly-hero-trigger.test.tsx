/**
 * The hero photo is the way into the 3D resume: a real button that prefetches on hover,
 * focus or touch, and opens /resume with the click point so the dissolve starts there.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import HeroImage from '@/components/HeroImage'
import { getHeroImg, peekIntent, registerNavigate, clearIntent } from '@/components/jelly/resumeTrigger'
import { loadSnapshotOnce } from '@/lib/jelly/snapshot'

jest.mock('@/lib/jelly/snapshot', () => ({ loadSnapshotOnce: jest.fn(() => Promise.resolve()), releaseSnapshot: jest.fn() }))
jest.mock('@/components/jelly/JellyResumeCanvas', () => ({ __esModule: true, default: () => null }))

describe('the hero trigger', () => {
  const navigate = jest.fn()
  beforeEach(() => registerNavigate(navigate))
  afterEach(() => {
    registerNavigate(null)
    clearIntent()
    jest.clearAllMocks()
  })

  it('is a labelled button around the photo, with hints hidden from screen readers', () => {
    render(<HeroImage />)
    const btn = screen.getByRole('button', { name: 'Open the interactive resume' })
    expect(btn.querySelector('img')).toBe(getHeroImg())
    expect(screen.getByText('✨ click to open my resume')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('✨ tap to open my resume')).toHaveAttribute('aria-hidden', 'true')
  })

  it('prefetches the resume on hover', async () => {
    render(<HeroImage />)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Open the interactive resume' }))
    await waitFor(() => expect(loadSnapshotOnce).toHaveBeenCalled())
  })

  it('a click opens /resume and remembers where, so the dissolve starts there', () => {
    render(<HeroImage />)
    const btn = screen.getByRole('button', { name: 'Open the interactive resume' })
    fireEvent.click(btn, { clientX: 320, clientY: 240, detail: 1 })
    expect(navigate).toHaveBeenCalledWith('/resume')
    expect(peekIntent()).toEqual({ origin: { x: 320, y: 240 }, tint: 0, opener: btn })
  })

  it('Enter or Space opens it from the photo’s center', () => {
    render(<HeroImage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open the interactive resume' }), { detail: 0 })
    expect(peekIntent()?.origin).toBeNull()
  })
})
