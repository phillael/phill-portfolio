/**
 * The Skills section's island (src/components/skills/SkillsPlay.tsx): the game isn't on the page until a
 * skill is activated. The first click gets the site player's AudioContext inside the click (sound only
 * ever starts on a click), then imports the game and hands it the shot; later clicks go to the running game.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SkillsSection from '@/components/SkillsSection'
import { registerSiteMusic, type SiteMusic } from '@/lib/site-music'
import { createBlaster } from '@/lib/skills/blaster'

const shoot = jest.fn()
jest.mock('@/lib/skills/blaster', () => ({
  createBlaster: jest.fn(() => ({ shoot, dispose: jest.fn() })),
}))
const created = createBlaster as jest.Mock

const fakeContext = () => ({ state: 'suspended', resume: jest.fn(() => Promise.resolve()) })
const player = (ctx: ReturnType<typeof fakeContext>): SiteMusic => ({
  getSource: () => null,
  isPlaying: () => false,
  toggle: () => {},
  open: () => {},
  context: jest.fn(() => ctx as unknown as AudioContext),
  pause: () => {},
  play: () => {},
  onChange: () => () => {},
})

beforeEach(() => {
  shoot.mockClear()
  created.mockClear()
  registerSiteMusic(null)
})

const skill = (name: string) => screen.getByRole('button', { name })
// (DOM nodes are compared with toBe: toMatchObject would walk the React tree hanging off each node)

describe('the first shot starts the game', () => {
  it('a click gets the player’s AudioContext in the click, then starts the game with that skill and point', async () => {
    const ctx = fakeContext()
    const music = player(ctx)
    registerSiteMusic(music)
    render(<SkillsSection />)
    const docker = skill('Docker')

    fireEvent.click(docker, { clientX: 120, clientY: 340, detail: 1 })
    expect(music.context).toHaveBeenCalledTimes(1) // synchronously, inside the click
    expect(ctx.resume).toHaveBeenCalled()

    await waitFor(() => expect(shoot).toHaveBeenCalledTimes(1))
    expect(created).toHaveBeenCalledTimes(1)
    const opts = created.mock.calls[0][0]
    expect(opts.section).toBe(document.getElementById('skills'))
    expect(opts.ac).toBe(ctx)
    const shot = shoot.mock.calls[0][0]
    expect(shot.skill).toBe(docker)
    expect([shot.x, shot.y, shot.keyboard]).toEqual([120, 340, false])
  })

  it('Enter on a focused skill does too (a keyboard shot, from the button’s centre)', async () => {
    registerSiteMusic(player(fakeContext()))
    render(<SkillsSection />)
    const user = userEvent.setup()
    skill('Postgres').focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(shoot).toHaveBeenCalledTimes(1))
    expect(shoot.mock.calls[0][0].skill).toBe(skill('Postgres'))
    expect(shoot.mock.calls[0][0].keyboard).toBe(true)
  })

  it('later clicks go to the running game; it is made once', async () => {
    registerSiteMusic(player(fakeContext()))
    render(<SkillsSection />)
    fireEvent.click(skill('Docker'), { detail: 1 })
    await waitFor(() => expect(shoot).toHaveBeenCalledTimes(1))
    fireEvent.click(skill('Terraform'), { detail: 1 })
    expect(shoot).toHaveBeenCalledTimes(2)
    expect(shoot.mock.calls[1][0].skill).toBe(skill('Terraform'))
    fireEvent.click(screen.getByText('AI first. Full stack.'), { detail: 1 }) // a shot at nothing, inside the section
    expect(shoot).toHaveBeenCalledTimes(3)
    expect(shoot.mock.calls[2][0].skill).toBeNull()
    expect(created).toHaveBeenCalledTimes(1)
  })

  it('a click on the section before any skill starts nothing', async () => {
    registerSiteMusic(player(fakeContext()))
    render(<SkillsSection />)
    fireEvent.click(screen.getByText('AI first. Full stack.'), { detail: 1 })
    await act(() => Promise.resolve())
    expect(created).not.toHaveBeenCalled()
  })

  it('no site player (tests, a page without one): the game makes its own AudioContext', async () => {
    const made: ReturnType<typeof fakeContext>[] = []
    const AC = jest.fn(() => { const c = fakeContext(); made.push(c); return c })
    ;(window as unknown as { AudioContext: unknown }).AudioContext = AC
    render(<SkillsSection />)
    fireEvent.click(skill('Docker'), { detail: 1 })
    expect(AC).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(shoot).toHaveBeenCalledTimes(1))
    expect(created.mock.calls[0][0].ac).toBe(made[0])
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
  })
})
