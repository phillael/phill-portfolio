/**
 * @jest-environment node
 */
import { POST } from '../app/api/wizard/chat/route'

const mockAnthropicCreate = jest.fn()
const mockCheckAndReserve = jest.fn()
const mockRecordUsage = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  }))
})

jest.mock('../lib/rate-limit', () => ({
  checkAndReserve: (...args: unknown[]) => mockCheckAndReserve(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
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
    mockRecordUsage.mockResolvedValue(undefined)
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

  it('rejects a request where the last message is over 500 chars', async () => {
    const req = makeRequest({
      messages: [{ role: 'user', content: 'x'.repeat(501) }],
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

  it('records only the main-generation tokens against the budget', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Walrus dreams in kelp.' }],
      usage: { input_tokens: 1000, output_tokens: 50 },
    })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'hi' }],
    })

    await POST(req)

    expect(mockRecordUsage).toHaveBeenCalledWith('1.2.3.4', 1050)
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
