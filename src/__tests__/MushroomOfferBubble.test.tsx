import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'
import MushroomOfferBubble from '../components/MushroomOfferBubble'

describe('MushroomOfferBubble', () => {
  it('renders the question text and two buttons', () => {
    render(
      <MushroomOfferBubble
        position="anchored"
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /sure/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ummm/i })).toBeInTheDocument()
  })

  it('calls onConfirm when Sure is clicked', () => {
    const onConfirm = jest.fn()
    render(
      <MushroomOfferBubble
        position="anchored"
        text="You want to eat mushroom?"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /sure/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when Ummm...no is clicked', () => {
    const onCancel = jest.fn()
    render(
      <MushroomOfferBubble
        position="anchored"
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /ummm/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('dismisses on backdrop click when position="anchored"', () => {
    const onCancel = jest.fn()
    const { container } = render(
      <MushroomOfferBubble
        position="anchored"
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    const backdrop = container.querySelector('[data-testid="offer-bubble-backdrop"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does NOT dismiss on backdrop click when position="centered" (ceremony mode)', () => {
    const onCancel = jest.fn()
    const { container } = render(
      <MushroomOfferBubble
        position="centered"
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    const backdrop = container.querySelector('[data-testid="offer-bubble-backdrop"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('is a modal alertdialog labelled by the question when centered', () => {
    render(
      <MushroomOfferBubble
        position="centered"
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    const dialog = screen.getByRole('alertdialog', { name: 'You want to eat mushroom?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  // Rendered beside the chat's aria-modal dialog, so it must be modal too or
  // screen readers treat it as inert
  it('is a modal dialog when anchored', () => {
    render(
      <MushroomOfferBubble
        position="anchored"
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'You want to eat mushroom?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it.each(['centered', 'anchored'] as const)('focuses the confirm button on open (%s)', (position) => {
    render(
      <MushroomOfferBubble
        position={position}
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /sure/i })).toHaveFocus()
  })

  it('declines on Escape and keeps it from reaching listeners behind it', () => {
    const onCancel = jest.fn()
    const behind = jest.fn()
    window.addEventListener('keydown', behind)
    render(
      <MushroomOfferBubble
        position="centered"
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )

    fireEvent.keyDown(screen.getByRole('button', { name: /sure/i }), { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(behind).not.toHaveBeenCalled()
    window.removeEventListener('keydown', behind)
  })

  it.each(['centered', 'anchored'] as const)('has no axe violations (%s)', async (position) => {
    const { container } = render(
      <MushroomOfferBubble
        position={position}
        text="You want to eat mushroom?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
