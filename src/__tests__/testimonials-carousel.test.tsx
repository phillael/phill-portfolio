import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import Testimonials3DCarousel from '@/components/Testimonials3DCarousel'

// No WebGL in jsdom
jest.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="r3f-canvas" />,
  useFrame: () => {},
  useThree: () => ({ gl: { domElement: { parentElement: null } }, setSize: () => {} }),
}))

jest.mock('@react-three/drei', () => ({
  Center: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

describe('Testimonials3DCarousel fullscreen modal', () => {
  beforeEach(() => {
    // jsdom has no 2D canvas, so texture generation fails and logs; that's fine here
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const openModal = async () => {
    const preview = await screen.findByRole('button', { name: /expand testimonials/i })
    preview.focus()
    fireEvent.click(preview)
    return { preview, dialog: await screen.findByRole('dialog', { name: 'Testimonials' }) }
  }

  it('opens as a modal dialog with focus on the close button', async () => {
    render(<Testimonials3DCarousel />)
    const { dialog } = await openModal()

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: /close testimonials/i })).toHaveFocus()
  })

  it('closes on Escape, returns focus to the preview, and keeps Escape from going further', async () => {
    const behind = jest.fn()
    window.addEventListener('keydown', behind)
    render(<Testimonials3DCarousel />)
    const { preview } = await openModal()

    fireEvent.keyDown(screen.getByRole('button', { name: /close testimonials/i }), { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(preview).toHaveFocus()
    expect(behind).not.toHaveBeenCalled()
    window.removeEventListener('keydown', behind)
  })

  it('has no axe violations with the modal open', async () => {
    const { container } = render(<Testimonials3DCarousel />)
    await openModal()

    expect(await axe(container)).toHaveNoViolations()
  })
})
