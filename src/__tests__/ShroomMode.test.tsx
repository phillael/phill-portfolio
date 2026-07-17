import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ShroomMode from '../components/ShroomMode'
import { ShroomModeProvider } from '../context/ShroomModeContext'
import { __resetWizardChatSession } from '../components/WizardChat'

// TypingText finishes its crawl on unmount in jsdom; we don't need to wait for it
jest.mock('../components/TypingText', () => {
  return function MockTypingText({ text }: { text: string }) {
    return <span>{text}</span>
  }
})

// Stub the Three.js wizard: a plain button wired to ShroomMode's click handler.
jest.mock('next/dynamic', () => () => {
  return function WizardModelStub({ onClick }: { onClick: () => void }) {
    return <button aria-label="wizard model" onClick={onClick} />
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
