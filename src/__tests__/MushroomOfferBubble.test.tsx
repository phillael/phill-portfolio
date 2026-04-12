import { render, screen, fireEvent } from '@testing-library/react'
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
})
