/**
 * Page-level accessibility regression test: axe over the full home page,
 * rendered in the same order as the root layout's <body>.
 */

import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import HomePage from '@/app/page'
import Nav from '@/components/Nav'
import SkipLink from '@/components/SkipLink'

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
