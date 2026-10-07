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

  it('shows a farewell line and disables input when the rate limiter is down', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ error: 'rate_limiter_down', message: 'down' }),
    })

    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    const input = screen.getByLabelText(/ask the wizard/i) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'hi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText(/riddles must rest/i)).toBeInTheDocument()
    })
    expect(input.disabled).toBe(true)
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

  it('keeps Escape from reaching listeners behind the chat', () => {
    const behind = jest.fn()
    document.body.addEventListener('keydown', behind)
    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    fireEvent.keyDown(screen.getByLabelText(/ask the wizard/i), { key: 'Escape' })

    expect(behind).not.toHaveBeenCalled()
    document.body.removeEventListener('keydown', behind)
  })

  it('does not abort an in-flight request when the parent re-renders', async () => {
    let signal: AbortSignal | undefined
    ;(global.fetch as jest.Mock).mockImplementation((_url, init: RequestInit) => {
      signal = init.signal ?? undefined
      return new Promise(() => {})
    })

    const { rerender } = render(
      <WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />,
    )
    const input = screen.getByLabelText(/ask the wizard/i)
    fireEvent.change(input, { target: { value: 'hi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(signal).toBeDefined())

    // New callback identities, as an inline-arrow parent produces every render
    rerender(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    expect(signal?.aborted).toBe(false)
  })

  it('keeps focus in the input while waiting for a reply', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    const input = screen.getByLabelText(/ask the wizard/i) as HTMLTextAreaElement
    expect(document.activeElement).toBe(input)
    fireEvent.change(input, { target: { value: 'hi' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(input.readOnly).toBe(true))
    expect(input.disabled).toBe(false)
  })

  it('does not send client-side error lines back to the model', async () => {
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ json: async () => ({ message: 'Back again.' }) })
    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    const input = screen.getByLabelText(/ask the wizard/i)
    fireEvent.change(input, { target: { value: 'first' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText(/whispers are tangled/i)).toBeInTheDocument())

    fireEvent.change(input, { target: { value: 'second' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText(/back again/i)).toBeInTheDocument())

    const sent = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body).messages
    expect(sent.map((m: { content: string }) => m.content)).not.toContain(
      "The grove's whispers are tangled. A moment, traveler.",
    )
  })

  it('renders the mobile wizard portrait image', () => {
    render(<WizardChat onClose={() => {}} onFallback={() => {}} onOfferMushroom={() => {}} />)

    const portrait = screen.getByAltText(/shroom wizard/i) as HTMLImageElement
    expect(portrait).toBeInTheDocument()
    expect(portrait.src).toContain('/images/wizard-portrait-idle.png')
  })
})
