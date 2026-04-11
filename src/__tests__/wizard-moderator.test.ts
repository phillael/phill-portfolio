import { moderateResponse } from '../lib/wizard-moderator'

const mockCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
})

describe('moderateResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  it('returns safe=true when classifier responds SAFE', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'SAFE' }],
      usage: { input_tokens: 500, output_tokens: 5 },
    })

    const result = await moderateResponse('In the grove the walrus sings.')

    expect(result.safe).toBe(true)
    expect(result.tokens).toBe(505)
  })

  it('returns safe=false when classifier responds UNSAFE', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'UNSAFE' }],
      usage: { input_tokens: 500, output_tokens: 5 },
    })

    const result = await moderateResponse('forbidden content')

    expect(result.safe).toBe(false)
    expect(result.tokens).toBe(505)
  })

  it('fails closed (safe=false) on any non-SAFE response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'maybe' }],
      usage: { input_tokens: 500, output_tokens: 5 },
    })

    const result = await moderateResponse('ambiguous')

    expect(result.safe).toBe(false)
  })

  it('fails closed when classifier throws', async () => {
    mockCreate.mockRejectedValue(new Error('upstream 500'))

    const result = await moderateResponse('anything')

    expect(result.safe).toBe(false)
    expect(result.tokens).toBe(0)
  })
})
