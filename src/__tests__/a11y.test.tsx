/**
 * Page-level accessibility regression test: axe over the full home page,
 * rendered in the same order as the root layout's <body>.
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import HomePage from '@/app/page'
import ResumePage from '@/app/resume/page'
import Nav from '@/components/Nav'
import SkipLink from '@/components/SkipLink'
import HeroImage from '@/components/HeroImage'
import JellyResumeHost from '@/components/jelly/JellyResumeHost'
import JellyResumeRoute from '@/components/jelly/JellyResumeRoute'
import { __setHardNavigate, registerNavigate } from '@/components/jelly/resumeTrigger'

// Any load of the 3D resume's code (the overlay chunk, the engine, the snapshot) is recorded here
const mockLoaded = jest.fn()
jest.mock('@/components/jelly/JellyResumeCanvas', () => {
  mockLoaded('overlay')
  return { __esModule: true, default: () => null }
})
jest.mock('@/lib/jelly/engine', () => {
  mockLoaded('engine')
  return { createJellyEngine: jest.fn() }
})
jest.mock('@/lib/jelly/snapshot', () => {
  mockLoaded('snapshot')
  return { loadSnapshotOnce: jest.fn(() => Promise.resolve()), releaseSnapshot: jest.fn() }
})
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }), usePathname: () => '/' }))

// AboutSection reads shroom mode; the real provider lives in the root layout
jest.mock('@/context/ShroomModeContext', () => ({
  useShroomMode: () => ({ isActive: false, setIsActive: jest.fn() }),
}))

// Mock React Three Fiber to avoid Canvas issues in JSDOM
jest.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="r3f-canvas" />,
  useFrame: () => {},
  useThree: () => ({ gl: { domElement: { parentElement: null } }, setSize: () => {} }),
}))

jest.mock('@react-three/drei', () => ({
  Center: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Sparkles: () => <div data-testid="sparkles" />,
}))

describe('home page accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <>
        <SkipLink />
        <Nav />
        <HomePage />
      </>,
    )

    const results = await axe(container, {
      rules: {
        // jsdom can't compute styles, so contrast is checked by Lighthouse on
        // the prod build instead
        'color-contrast': { enabled: false },
      },
    })
    expect(results).toHaveNoViolations()
  })
})

describe('/resume accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <>
        <SkipLink />
        <Nav />
        <ResumePage />
      </>,
    )
    const results = await axe(container, { rules: { 'color-contrast': { enabled: false } } })
    expect(results).toHaveNoViolations()
  })
})

describe('reduced motion', () => {
  const reduced = () =>
    jest.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as MediaQueryList,
    )
  afterEach(() => jest.restoreAllMocks())

  it('the hero goes to the plain /resume page and never loads the engine', async () => {
    reduced()
    const go = jest.fn()
    const soft = jest.fn()
    __setHardNavigate(go)
    registerNavigate(soft)
    render(<HeroImage />)
    const hero = screen.getByRole('button', { name: 'Open the interactive resume' })
    fireEvent.pointerEnter(hero) // (no prefetch either)
    fireEvent.focus(hero)
    fireEvent.click(hero, { clientX: 10, clientY: 10, detail: 1 })
    await new Promise((r) => setTimeout(r, 50))
    expect(go).toHaveBeenCalledWith('/resume')
    expect(soft).not.toHaveBeenCalled()
    expect(mockLoaded).not.toHaveBeenCalled()
    registerNavigate(null)
  })

  it('a direct visit to /resume never mounts the 3D resume', async () => {
    reduced()
    render(
      <>
        <JellyResumeHost />
        <JellyResumeRoute mode="direct" />
      </>,
    )
    await new Promise((r) => setTimeout(r, 50))
    expect(mockLoaded).not.toHaveBeenCalled()
  })
})
