import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WizardChat, { __resetWizardChatSession } from '../components/WizardChat'

// TypingText finishes its crawl on unmount in jsdom; we don't need to wait for it
jest.mock('../components/TypingText', () => {
  return function MockTypingText({ text }: { text: string }) {
    return <span>{text}</span>
  }
})

describe('WizardChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetWizardChatSession()
    ;(global.fetch as jest.Mock | undefined)?.mockClear?.()
    global.fetch = jest.fn()
  })

  it('renders the hard-coded greeting on mount', () => {
    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    expect(screen.getByText(/traveler/i)).toBeInTheDocument()
  })

  it('sends a message and renders the assistant response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ message: 'Walrus dreams in kelp.' }),
    })

    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    const input = screen.getByLabelText(/ask the wizard/i)
    fireEvent.change(input, { target: { value: 'who are you' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText(/walrus dreams in kelp/i)).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wizard/chat',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('calls onOfferMushroom when the response carries action: offer_mushroom', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        message: 'The sporefall calls, traveler.',
        action: 'offer_mushroom',
      }),
    })
    const onOfferMushroom = jest.fn()

    render(
      <WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={onOfferMushroom} />,
    )

    const input = screen.getByLabelText(/ask the wizard/i)
    fireEvent.change(input, { target: { value: 'i want a mushroom' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onOfferMushroom).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onFallback when the server returns rate_limiter_down', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ error: 'rate_limiter_down', message: 'down' }),
    })
    const onFallback = jest.fn()

    render(
      <WizardChat onClose={() => {}} onFallback={onFallback} onOfferMushroom={() => {}} />,
    )

    const input = screen.getByLabelText(/ask the wizard/i)
    fireEvent.change(input, { target: { value: 'hi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(onFallback).toHaveBeenCalledTimes(1)
    })
  })

  it('disables the input after receiving a rate_limit error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ error: 'rate_limit', message: 'Fifty riddles spun, traveler.' }),
    })

    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    const input = screen.getByLabelText(/ask the wizard/i) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'hi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText(/fifty riddles/i)).toBeInTheDocument()
    })
    expect(input.disabled).toBe(true)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn()
    render(<WizardChat onClose={onClose} onFallback={() => {}} onOfferMushroom={() => {}} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the mobile wizard portrait image', () => {
    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    const portrait = screen.getByAltText(/shroom wizard/i) as HTMLImageElement
    expect(portrait).toBeInTheDocument()
    expect(portrait.src).toContain('/images/wizard-portrait-idle.png')
  })
})
