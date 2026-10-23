/**
 * The Projects section: the Relic Vault (src/components/ProjectsSection.tsx + components/projects/ProjectsVault.tsx).
 * The engine (src/lib/vault/vault.ts) is mocked: these tests cover the HTML (every exhibit's tab panel, the copy, the
 * links), the APG tabs, the stage's buttons, the lazy import as the section nears, and the no-WebGL fallback.
 */

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { axe } from 'jest-axe'
import ProjectsSection from '@/components/ProjectsSection'
import projectsData from '@/data/projects.json'
import media from '@/data/projects-media.json'
import type { Project } from '@/types/content'
import type { Vault, VaultOpts } from '@/lib/vault/vault'

const mockVault: jest.Mocked<Vault> = {
  go: jest.fn(),
  step: jest.fn(),
  watch: jest.fn(),
  setPaused: jest.fn(),
  setReducedMotion: jest.fn(),
  armSound: jest.fn(),
  destroy: jest.fn(),
}
let mockOpts: VaultOpts | null = null
const mockCreate = jest.fn((o: VaultOpts) => {
  mockOpts = o
  return mockVault
})
jest.mock('@/lib/vault/vault', () => ({ createVault: (o: VaultOpts) => mockCreate(o) }))

const projects = projectsData as Project[]

/* the IntersectionObserver: the section nears when a test says so */
let observers: { cb: IntersectionObserverCallback; margin?: string }[] = []
const realIO = window.IntersectionObserver
beforeEach(() => {
  observers = []
  mockOpts = null
  mockCreate.mockClear()
  Object.values(mockVault).forEach((f) => f.mockClear())
  window.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback, o?: IntersectionObserverInit) {
      observers.push({ cb, margin: o?.rootMargin })
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
})
afterAll(() => {
  window.IntersectionObserver = realIO
})

const near = async () => {
  await act(async () => observers.forEach((o) => o.cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
}
const panel = (id: string) => document.getElementById(`pv-p-${id}`)!
const visibleText = (el: Element) => {
  const c = el.cloneNode(true) as Element
  c.querySelectorAll('.sr-only').forEach((s) => s.remove())
  return c.textContent
}

describe('ProjectsSection', () => {
  it('is #projects, labelled by its "Projects" heading, with the header copy', () => {
    render(<ProjectsSection />)
    const section = screen.getByRole('region', { name: 'Projects' })
    expect(section.id).toBe('projects')
    expect(screen.getByRole('heading', { level: 2, name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByText('Some Stuff I Built')).toHaveClass('neon-text-purple')
    expect(screen.getByText('Here are a few things I am working on in my free time.')).toBeInTheDocument()
  })

  it('has six tabs and six panels in the HTML, Number Slayers’ shown', () => {
    render(<ProjectsSection />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['01Quadzilla', '02Number Slayers', '03Rezmancer', '04Jelly Resume', '05Pickleball 2079', '06Pong'])
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false', 'false', 'false'])
    expect(screen.getByRole('tablist', { name: 'Exhibits' })).toBeInTheDocument()
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    expect(panels).toHaveLength(6)
    expect(panels.filter((p) => !p.hidden)).toEqual([panel('number-slayers')])
    projects.forEach((p, i) => {
      expect(tabs[i].getAttribute('aria-controls')).toBe(`pv-p-${p.id}`)
      expect(panel(p.id).getAttribute('aria-labelledby')).toBe(tabs[i].id)
    })
    // the canvas only presents: the panels carry the content
    expect(document.querySelector('#projects canvas')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('moves the selection and focus with ←, →, Home and End (wrapping), before the engine loads too', () => {
    render(<ProjectsSection />)
    const tabs = screen.getAllByRole('tab')
    tabs[1].focus()
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabs[2])
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[2]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
    expect(panel('rezmancer').hidden).toBe(false)
    fireEvent.keyDown(tabs[2], { key: 'End' })
    expect(document.activeElement).toBe(tabs[5])
    fireEvent.keyDown(tabs[5], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabs[0])
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tabs[5])
    fireEvent.keyDown(tabs[5], { key: 'Home' })
    expect(document.activeElement).toBe(tabs[0])
    expect(panel('quadzilla').hidden).toBe(false)
  })

  it('shows Number Slayers’ card exactly', () => {
    render(<ProjectsSection />)
    const p = panel('number-slayers')
    expect(p.querySelector('p')?.textContent).toBe('Exhibit 02')
    expect(within(p).getByRole('heading', { level: 3 }).textContent).toBe('Number Slayers')
    expect(
      within(p).getByText(
        'Multiplayer 3D math game. Server-authoritative multiplayer with snapshot interpolation at 60fps, AI enemy bots, an adaptive Web Audio mixer, and an FBX→GLB pipeline that cut load size 88%. I wrote the soundtrack too.',
      ),
    ).toBeInTheDocument()
    const stack = within(p).getByText('Built with:', { exact: false }).parentElement!
    expect(visibleText(stack)).toBe('React Three Fiber · Colyseus · Next.js · Convex · Railway')
    expect(within(p).getByText('Displayed on a black tube set, c. 1994.')).toBeInTheDocument()
    expect(within(p).getByRole('button', { name: 'Watch the Number Slayers video' })).toBeInTheDocument()
  })

  it('shows Pickleball 2079’s card exactly, with no links', () => {
    render(<ProjectsSection />)
    const p = panel('pickleball-2079')
    expect(p.querySelector('p')?.textContent).toBe('Exhibit 05')
    expect(within(p).getByRole('heading', { level: 3, hidden: true }).textContent).toBe('Pickleball 2079')
    expect(
      within(p).getByText(
        'Wacky arcade pickleball from the year 2079, in development. Two-on-two against the CPU on a deterministic 60 Hz sim that replays bit-exact, a cast of voxel critters and kitchen objects, and players who explode when the ball hits them.',
      ),
    ).toBeInTheDocument()
    expect(visibleText(within(p).getByText('Built with:', { exact: false }).parentElement!)).toBe('TypeScript · three.js · Vite · Deterministic sim')
    expect(within(p).getByText('Displayed on a portable colour set, c. 1986.')).toBeInTheDocument()
    expect(within(p).queryAllByRole('link', { hidden: true })).toHaveLength(0)
  })

  it('links Live and Code out in a new tab, and the Jelly Resume’s Live in this one', () => {
    render(<ProjectsSection />)
    const slayers = panel('number-slayers')
    const live = within(slayers).getByRole('link', { name: 'Live (opens in a new tab)' })
    expect(live).toHaveAttribute('href', 'https://numberslayers.com')
    expect(live).toHaveAttribute('target', '_blank')
    expect(live).toHaveAttribute('rel', 'noopener noreferrer')
    const code = within(slayers).getByRole('link', { name: 'Code (opens in a new tab)' })
    expect(code).toHaveAttribute('href', 'https://github.com/phillael/number-slayers')
    expect(code).toHaveAttribute('rel', 'noopener noreferrer')
    expect(visibleText(live)).toBe('Live ↗')
    // Quadzilla's and Rezmancer's apps are live (both open on their sign-in page); no Code (private repos)
    for (const [id, url] of [['quadzilla', 'https://quadzilla.app'], ['rezmancer', 'https://rezmancer.com']]) {
      const l = within(panel(id)).getByRole('link', { name: 'Live (opens in a new tab)', hidden: true })
      expect(l).toHaveAttribute('href', url)
      expect(l).toHaveAttribute('target', '_blank')
      expect(within(panel(id)).queryByRole('link', { name: /^Code/, hidden: true })).toBeNull()
    }
    const jelly = within(panel('jelly-resume')).getByRole('link', { name: 'Live', hidden: true })
    expect(jelly).toHaveAttribute('href', '/resume')
    expect(jelly).not.toHaveAttribute('target')
    expect(jelly).not.toHaveAttribute('rel')
  })

  it('names each Watch after its exhibit (Pong by its short name)', () => {
    render(<ProjectsSection />)
    const names = screen.getAllByRole('button', { name: /^Watch / , hidden: true }).map((b) => b.textContent)
    expect(names).toEqual([
      'Watch the Quadzilla video',
      'Watch the Number Slayers video',
      'Watch the Rezmancer video',
      'Watch the Jelly Resume video',
      'Watch the Pickleball 2079 video',
      'Watch the Pong video',
    ])
  })

  it('flips the power button: Pause the televisions ↔ Play the televisions', () => {
    render(<ProjectsSection />)
    const power = screen.getByRole('button', { name: 'Pause the televisions' })
    expect(power).toHaveTextContent('Pause')
    fireEvent.click(power)
    expect(power).toHaveAccessibleName('Play the televisions')
    expect(power).toHaveTextContent('Play')
    fireEvent.click(power)
    expect(power).toHaveAccessibleName('Pause the televisions')
  })

  it('names the stage’s arrows', () => {
    render(<ProjectsSection />)
    expect(screen.getByRole('button', { name: 'Previous exhibit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next exhibit' })).toBeInTheDocument()
  })

  it('warms the engine’s code once the page is idle, but makes the engine only once the section is within 800 px', async () => {
    const ric = jest.fn((cb: IdleRequestCallback) => {
      cb({} as IdleDeadline)
      return 1
    })
    const realRIC = window.requestIdleCallback
    window.requestIdleCallback = ric
    render(<ProjectsSection />)
    await act(async () => {})
    window.requestIdleCallback = realRIC
    expect(ric).toHaveBeenCalledTimes(1)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(observers.map((o) => o.margin)).toContain('800px 0px')
    await near()
    expect(mockOpts).toMatchObject({ reducedMotion: false })
    expect(mockOpts!.projects.map((p) => p.id)).toEqual(projects.map((p) => p.id))
    expect(mockOpts!.canvas).toBe(document.querySelector('#projects canvas'))
    expect(mockVault.setPaused).toHaveBeenCalledWith(false)
  })

  it('hands the stage’s buttons, the tabs and Watch to the engine, and follows its nearest exhibit', async () => {
    render(<ProjectsSection />)
    await near()
    fireEvent.click(screen.getByRole('button', { name: 'Next exhibit' }))
    expect(mockVault.step).toHaveBeenCalledWith(1)
    fireEvent.click(screen.getByRole('button', { name: 'Previous exhibit' }))
    expect(mockVault.step).toHaveBeenCalledWith(-1)
    fireEvent.click(screen.getByRole('tab', { name: 'Pong' }))
    expect(mockVault.go).toHaveBeenCalledWith(5)
    fireEvent.click(screen.getByRole('button', { name: 'Watch the Number Slayers video' }))
    expect(mockVault.watch).toHaveBeenCalledWith(1)
    fireEvent.click(screen.getByRole('button', { name: 'Pause the televisions' }))
    expect(mockVault.setPaused).toHaveBeenLastCalledWith(true)
    // the first click in the section armed the sound effects
    expect(mockVault.armSound).toHaveBeenCalled()
    act(() => mockOpts!.onNear(4))
    expect(screen.getByRole('tab', { name: 'Pickleball 2079' })).toHaveAttribute('aria-selected', 'true')
    expect(panel('pickleball-2079').hidden).toBe(false)
  })

  it('announces the arrows’ and swipes’ moves in a polite live region, and the hint fades on the first touch', async () => {
    render(<ProjectsSection />)
    await near()
    act(() => mockOpts!.onAnnounce!(3))
    const region = document.querySelector('#projects [aria-live="polite"]')!
    expect(region.textContent).toBe('Exhibit 4 of 6: Jelly Resume')
    const hint = document.querySelector('#projects [data-gone]')!
    expect(hint.getAttribute('data-gone')).toBe('false')
    act(() => mockOpts!.onInteract!())
    expect(hint.getAttribute('data-gone')).toBe('true')
  })

  it('shows the canvas once its first frame is drawn', async () => {
    render(<ProjectsSection />)
    await near()
    const stage = document.querySelector('#projects canvas')!.parentElement!
    expect(stage.getAttribute('data-ready')).toBe('false')
    act(() => mockOpts!.onReady())
    expect(stage.getAttribute('data-ready')).toBe('true')
  })

  it('falls back without WebGL: the exhibit’s poster in a CSS screen, Watch still to the engine', async () => {
    render(<ProjectsSection />)
    await near()
    act(() => mockOpts!.onFail())
    const screenEl = document.querySelector('[data-vault-screen]')!
    expect(screenEl.querySelector('img')?.getAttribute('src')).toBe(media['number-slayers'].poster)
    expect(screenEl.querySelector('img')?.getAttribute('alt')).toBe('')
    act(() => mockOpts!.onNear(0))
    expect(document.querySelector('[data-vault-screen]')?.getAttribute('data-tall')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Watch the Quadzilla video' }))
    expect(mockVault.watch).toHaveBeenCalledWith(0)
  })

  it('remembers a Watch pressed while the engine loads, and plays it once the engine is made', async () => {
    render(<ProjectsSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Watch the Number Slayers video' }))
    expect(mockVault.watch).not.toHaveBeenCalled()
    await near()
    expect(mockVault.watch).toHaveBeenCalledTimes(1)
    expect(mockVault.watch).toHaveBeenCalledWith(1)
  })

  it('drops that early Watch if the visitor moved on, or if the engine took more than 4 s', async () => {
    const { unmount } = render(<ProjectsSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Watch the Number Slayers video' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Jelly Resume' }))
    await near()
    expect(mockVault.watch).not.toHaveBeenCalled()
    unmount()
    mockCreate.mockClear()
    const now = jest.spyOn(performance, 'now').mockReturnValue(1000)
    render(<ProjectsSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Watch the Number Slayers video' }))
    now.mockReturnValue(5200)
    await near()
    expect(mockVault.watch).not.toHaveBeenCalled()
    now.mockRestore()
  })

  it('disables Watch if the engine can’t be made (its chunk failed to load): the poster stays, Watch says so', async () => {
    mockCreate.mockImplementationOnce(() => {
      throw new Error('ChunkLoadError')
    })
    render(<ProjectsSection />)
    await near()
    await waitFor(() => expect(document.querySelector('[data-vault-screen]')).not.toBeNull())
    const watchBtn = screen.getByRole('button', { name: 'Watch the Number Slayers video' })
    expect(watchBtn).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(watchBtn)
    expect(mockVault.watch).not.toHaveBeenCalled()
  })

  it('starts paused with reduced motion', async () => {
    const real = window.matchMedia
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia
    try {
      render(<ProjectsSection />)
      expect(screen.getByRole('button', { name: 'Play the televisions' })).toBeInTheDocument()
      await near()
      expect(mockOpts).toMatchObject({ reducedMotion: true })
      expect(mockVault.setPaused).toHaveBeenCalledWith(true)
    } finally {
      window.matchMedia = real
    }
  })

  it('destroys the engine on unmount', async () => {
    const { unmount } = render(<ProjectsSection />)
    await near()
    unmount()
    expect(mockVault.destroy).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations', async () => {
    const { container } = render(<ProjectsSection />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
