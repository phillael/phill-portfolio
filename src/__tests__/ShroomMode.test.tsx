import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShroomMode from '../components/ShroomMode'
import { ShroomModeProvider } from '../context/ShroomModeContext'
import { __resetWizardChatSession, DECLINE_LINES } from '../components/WizardChat'

// TypingText finishes its crawl on unmount in jsdom; we don't need to wait for it
jest.mock('../components/TypingText', () => {
  return function MockTypingText({ text }: { text: string }) {
    return <span>{text}</span>
  }
})

// Stub the Three.js wizard: a plain button wired to ShroomMode's click handler.
// It finishes its walk-off immediately.
jest.mock('next/dynamic', () => () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react')
  return function WizardModelStub({
    onClick,
    isExiting,
    onExitComplete,
  }: {
    onClick: () => void
    isExiting?: boolean
    onExitComplete?: () => void
  }) {
    useEffect(() => {
      if (isExiting) onExitComplete?.()
    }, [isExiting, onExitComplete])
    return <button aria-label="wizard model" data-exiting={String(!!isExiting)} onClick={onClick} />
  }
})

function renderShroomMode() {
  return render(
    <ShroomModeProvider>
      <ShroomMode />
    </ShroomModeProvider>,
  )
}

async function openChatAndSend(message: string) {
  fireEvent.click(screen.getByRole('button', { name: /summon the shroom wizard/i }))
  fireEvent.click(screen.getByRole('button', { name: /wizard model/i }))

  const input = await screen.findByLabelText(/ask the wizard/i)
  fireEvent.change(input, { target: { value: message } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

describe('ShroomMode – rate limiter fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetWizardChatSession()
    global.fetch = jest.fn()
  })

  it('keeps the chat open with a farewell line when the rate limiter is down', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ error: 'rate_limiter_down', message: 'down' }),
    })

    renderShroomMode()
    await openChatAndSend('hello wizard')

    await waitFor(() => {
      expect(screen.getByText(/riddles must rest/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('dialog', { name: /shroom wizard chat/i })).toBeInTheDocument()
  })

  it('closes the chat normally via its close button after fallback', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ error: 'rate_limiter_down', message: 'down' }),
    })

    renderShroomMode()
    await openChatAndSend('hello wizard')

    await waitFor(() => {
      expect(screen.getByText(/riddles must rest/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /close chat/i }))

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /shroom wizard chat/i }),
      ).not.toBeInTheDocument()
    })
  })
})

describe('ShroomMode – mushroom offer Escape', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __resetWizardChatSession()
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ message: 'The sporefall calls.', action: 'offer_mushroom' }),
    })
  })

  const declineLine = () =>
    screen.queryByText((text) => DECLINE_LINES.includes(text))

  it('declines the offer on Escape without dismissing the wizard', async () => {
    renderShroomMode()
    await openChatAndSend('i want a mushroom')
    const offer = await screen.findByRole('alertdialog', { name: /eat mushroom/i })

    fireEvent.keyDown(offer, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(declineLine()).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /shroom wizard chat/i })).toBeInTheDocument()
    // The input was disabled while the offer was up; focus comes back to it
    await waitFor(() => expect(screen.getByLabelText(/ask the wizard/i)).toHaveFocus())
    expect(screen.getByRole('button', { name: /wizard model/i })).toHaveAttribute('data-exiting', 'false')
  })

  it('declines on Escape even after the chat behind it was closed', async () => {
    renderShroomMode()
    await openChatAndSend('i want a mushroom')
    await screen.findByRole('alertdialog', { name: /eat mushroom/i })
    fireEvent.click(screen.getByRole('button', { name: /close chat/i }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /shroom wizard chat/i })).not.toBeInTheDocument(),
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /wizard model/i })).toHaveAttribute('data-exiting', 'false')
  })
})

describe('ShroomMode – dismissing the wizard', () => {
  it('hands focus to the summon button when the wizard leaves', async () => {
    renderShroomMode()
    fireEvent.click(screen.getByRole('button', { name: /summon the shroom wizard/i }))
    await screen.findByRole('button', { name: /wizard model/i })
    ;(document.activeElement as HTMLElement | null)?.blur()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /summon the shroom wizard/i })).toHaveFocus(),
    )
  })
})
