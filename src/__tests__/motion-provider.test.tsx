import { readFileSync } from 'fs'
import path from 'path'
import { render, screen } from '@testing-library/react'
import { MotionConfigContext, useReducedMotionConfig } from 'framer-motion'
import { useContext } from 'react'
import MotionProvider from '@/components/MotionProvider'

const Probe = () => {
  const { reducedMotion } = useContext(MotionConfigContext)
  const reduce = useReducedMotionConfig()
  return <p data-testid="probe" data-config={reducedMotion} data-reduce={String(reduce)} />
}

describe('MotionProvider', () => {
  beforeAll(() => {
    // The OS asks for reduced motion
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'), // framer asks '(prefers-reduced-motion)'
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })

  it('makes every motion component follow the user setting', () => {
    render(
      <MotionProvider>
        <Probe />
      </MotionProvider>,
    )

    const probe = screen.getByTestId('probe')
    expect(probe).toHaveAttribute('data-config', 'user')
    expect(probe).toHaveAttribute('data-reduce', 'true')
  })
})

describe('globals.css reduced-motion block', () => {
  const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const start = css.lastIndexOf('@media (prefers-reduced-motion: reduce)')
  const block = css.slice(start)

  it.each([
    '.screen-shake',
    '.timeline-dot',
    '.glow-layer',
    '.animate-ripple',
    '.marquee-text',
    '.animate-bounce',
    '.animate-pulse',
    '.gradient-card',
    '#shroom-target',
  ])('stops %s', (selector) => {
    expect(start).toBeGreaterThan(-1)
    expect(block).toContain(selector)
  })
})
