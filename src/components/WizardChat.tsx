'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import TypingText from './TypingText'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  id: string
}

interface WizardChatProps {
  onClose: () => void
  onFallback: () => void
  onOfferMushroom: () => void
  /**
   * When this prop changes to a non-null string, WizardChat appends it as a
   * new assistant message and calls onInjectedLineConsumed() so the parent can
   * reset the prop back to null. Used by the parent to crawl in triumphant /
   * decline lines after the ceremony modal closes, without involving the LLM.
   */
  injectedLine?: string | null
  onInjectedLineConsumed?: () => void
}

const GREETING = 'Greetings, traveler. The grove speaks through this old sage. Ask, and I shall answer in riddles.'

const TRIUMPH_LINES = [
  'The sporefall takes thee. Colors bloom — the walrus cries in joy.',
  'Clam-song and cap-light: the grove rearranges itself around thy gaze.',
  'Behold! The mycelial tide lifts every edge. Swim now, little seeker.',
  'Enhanced. Thy vision now drinks the unseen spectrum of fruiting bodies.',
  'The tusks of the deep one bless thy sight. Walk the bright grove.',
]

const DECLINE_LINES = [
  'A wise caution. The fungi wait. The walrus dives another day.',
  'No mushroom today. The grove respects the unhurried.',
  'So be it. Perhaps when the third moon is a lasagna.',
  'Declined with grace. The hyphae will remember.',
  'Very well. The walrus winks and the grove hums on.',
]

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function genId(): string {
  return Math.random().toString(36).slice(2)
}

export default function WizardChat({
  onClose,
  onFallback,
  onOfferMushroom,
  injectedLine,
  onInjectedLineConsumed,
}: WizardChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: GREETING, id: 'greeting' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [pendingOffer, setPendingOffer] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (injectedLine) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: injectedLine, id: genId() },
      ])
      setPendingOffer(false)
      onInjectedLineConsumed?.()
    }
  }, [injectedLine, onInjectedLineConsumed])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      abortRef.current?.abort()
    }
  }, [onClose])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading || isDisabled) return

    const userMsg: ChatMessage = { role: 'user', content: text, id: genId() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/wizard/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      })

      const body = await res.json()

      if (body.error === 'rate_limiter_down') {
        onFallback()
        return
      }

      if (body.message) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: body.message,
          id: genId(),
        }
        setMessages((prev) => [...prev, assistantMsg])

        if (body.error === 'rate_limit' || body.error === 'budget') {
          setIsDisabled(true)
        }

        if (body.action === 'offer_mushroom') {
          setPendingOffer(true)
          onOfferMushroom()
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: "The grove's whispers are tangled. A moment, traveler.",
        id: genId(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="absolute bottom-full left-[80px] mb-2 w-[360px] max-h-[60vh] md:h-[480px] z-[101] bg-[rgba(11,14,26,0.92)] backdrop-blur-md border border-cyan-400/40 rounded-xl flex flex-col"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        style={{
          filter: 'none',
          boxShadow:
            '0 0 25px rgba(0, 217, 255, 0.2), 0 0 50px rgba(0, 217, 255, 0.08)',
        }}
        role="dialog"
        aria-label="Shroom Wizard chat"
      >
        {/* HUD corner brackets */}
        <div className="pointer-events-none absolute top-[-1px] left-[-1px] w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
        <div className="pointer-events-none absolute top-[-1px] right-[-1px] w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
        <div className="pointer-events-none absolute bottom-[-1px] left-[-1px] w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
        <div className="pointer-events-none absolute bottom-[-1px] right-[-1px] w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

        {/* Speech tail (desktop only) */}
        <div
          className="hidden md:block absolute w-0 h-0"
          style={{
            bottom: '-14px',
            left: '48px',
            borderLeft: '14px solid transparent',
            borderRight: '14px solid transparent',
            borderTop: '14px solid rgba(11, 14, 26, 0.92)',
            filter: 'drop-shadow(0 2px 0 rgba(0, 217, 255, 0.4))',
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-cyan-400 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
        >
          ×
        </button>

        {/* Conversation body */}
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-label="Shroom Wizard conversation"
          className="flex-1 overflow-y-auto p-4 pt-8 pr-10 flex flex-col gap-2"
        >
          {messages.map((m, idx) => {
            const isLast = idx === messages.length - 1
            const opacityClass = isLast ? 'opacity-100' : 'opacity-35'
            if (m.role === 'user') {
              return (
                <p
                  key={m.id}
                  className={`text-[12px] italic text-[#ff4fbf] ${opacityClass} transition-opacity`}
                >
                  {'\u203A '}
                  {m.content}
                </p>
              )
            }
            return (
              <p
                key={m.id}
                className={`text-[13.5px] text-[#d4f4ff] leading-snug ${opacityClass} transition-opacity`}
              >
                {isLast ? <TypingText text={m.content} speed={40} showCursor={false} /> : m.content}
              </p>
            )
          })}

          {isLoading && (
            <div className="flex gap-1 text-cyan-400 text-lg" aria-label="Wizard is thinking">
              <span className="animate-bounce">·</span>
              <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>
                ·
              </span>
              <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>
                ·
              </span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-cyan-400/20 bg-cyan-400/5 p-3 flex gap-2 items-center">
          <span className="text-cyan-400 font-mono text-sm">&gt;</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            onKeyDown={onInputKeyDown}
            placeholder="whisper thy question…"
            disabled={isLoading || isDisabled || pendingOffer}
            rows={1}
            aria-label="Ask the wizard a question"
            className="flex-1 bg-transparent text-[#d4f4ff] font-mono text-sm placeholder-[#9aa3b5] focus:outline-none resize-none min-h-[44px] py-2"
          />
        </div>
      </motion.div>
    </>
  )
}

// Exposed for the parent integration (Task 10).
export { pickRandom, TRIUMPH_LINES, DECLINE_LINES }
