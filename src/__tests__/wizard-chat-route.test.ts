/**
 * @jest-environment node
 */
import { POST } from '../app/api/wizard/chat/route'

const mockAnthropicCreate = jest.fn()
const mockCheckAndReserve = jest.fn()
const mockSettleUsage = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  }))
})

jest.mock('../lib/rate-limit', () => ({
  checkAndReserve: (...args: unknown[]) => mockCheckAndReserve(...args),
  settleUsage: (...args: unknown[]) => mockSettleUsage(...args),
}))

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/wizard/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      'x-real-ip': '1.2.3.4',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/wizard/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test'
    process.env.WIZARD_ALLOWED_ORIGINS = 'http://localhost:3000,https://phillcodes.com'
    mockCheckAndReserve.mockResolvedValue({ ok: true })
    mockSettleUsage.mockResolvedValue(undefined)
  })

  it('returns the wizard message on a happy-path request', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Walrus dreams in kelp.' }],
      usage: { input_tokens: 1000, output_tokens: 50 },
    })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'who are you' }],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toBe('Walrus dreams in kelp.')
    expect(body.action).toBeUndefined()
  })

  it('returns 403 when origin is not allowlisted', async () => {
    const req = makeRequest(
      { messages: [{ role: 'user', content: 'hi' }] },
      { origin: 'https://evil.example.com' },
    )

    const res = await POST(req)

    expect(res.status).toBe(403)
  })

  it('rejects a request with no messages array', async () => {
    const req = makeRequest({ nope: true })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('server')
  })

  it('rejects a request where the last message is over 200 chars', async () => {
    const req = makeRequest({
      messages: [{ role: 'user', content: 'x'.repeat(201) }],
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns rate_limit when the IP has hit its daily cap', async () => {
    mockCheckAndReserve.mockResolvedValue({ ok: false, reason: 'ip_cap' })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'hi' }],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.error).toBe('rate_limit')
    expect(body.message).toContain('Fifty riddles')
  })

  it('returns budget when the global budget is exhausted', async () => {
    mockCheckAndReserve.mockResolvedValue({ ok: false, reason: 'budget' })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'hi' }],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(429)
    expect(body.error).toBe('budget')
  })

  it('returns rate_limiter_down when Upstash is unreachable', async () => {
    mockCheckAndReserve.mockResolvedValue({ ok: false, reason: 'unreachable' })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'hi' }],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.error).toBe('rate_limiter_down')
  })

  it('settles the budget with input, output and cache-write tokens plus 10% of cache reads', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Walrus dreams in kelp.' }],
      usage: {
        input_tokens: 1000,
        output_tokens: 50,
        cache_creation_input_tokens: 200,
        cache_read_input_tokens: 4000,
      },
    })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'hi' }],
    })

    await POST(req)

    expect(mockSettleUsage).toHaveBeenCalledWith(1000 + 50 + 200 + 400)
  })

  it('refunds the reservation when the model call fails', async () => {
    mockAnthropicCreate.mockRejectedValue(new Error('timeout'))

    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'hi' }] }))

    expect(res.status).toBe(502)
    expect(mockSettleUsage).toHaveBeenCalledWith(0)
  })

  it('rejects oversized earlier messages, not just the last one', async () => {
    const req = makeRequest({
      messages: [
        { role: 'user', content: 'x'.repeat(5000) },
        { role: 'assistant', content: 'Hmm.' },
        { role: 'user', content: 'hi' },
      ],
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(mockCheckAndReserve).not.toHaveBeenCalled()
  })

  it('rejects an oversized assistant message', async () => {
    const req = makeRequest({
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'x'.repeat(2001) },
        { role: 'user', content: 'and?' },
      ],
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('accepts a long but legitimate conversation', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Still here.' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    })
    const messages = Array.from({ length: 39 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: i % 2 === 0 ? 'q'.repeat(200) : 'a'.repeat(600),
    }))

    const res = await POST(makeRequest({ messages }))

    expect(res.status).toBe(200)
  })

  it('still offers the mushroom when the model replies with only the tool call', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'offer_mushroom', id: 'x', input: {} }],
      usage: { input_tokens: 1000, output_tokens: 20 },
    })

    const res = await POST(makeRequest({ messages: [{ role: 'user', content: 'mushroom pls' }] }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.action).toBe('offer_mushroom')
    expect(typeof body.message).toBe('string')
    expect(body.message.length).toBeGreaterThan(0)
    expect(mockSettleUsage).toHaveBeenCalledWith(1020)
  })

  it('returns action: offer_mushroom when the model calls the tool', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [
        { type: 'text', text: 'The sporefall calls, traveler.' },
        { type: 'tool_use', name: 'offer_mushroom', id: 'x', input: {} },
      ],
      usage: { input_tokens: 1000, output_tokens: 50 },
    })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'I want a mushroom' }],
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('sporefall')
    expect(body.action).toBe('offer_mushroom')
  })
})
