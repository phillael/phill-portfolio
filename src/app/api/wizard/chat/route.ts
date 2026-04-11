import Anthropic from '@anthropic-ai/sdk'
import { buildWizardSystemPrompt } from '@/lib/wizard-prompt'
import { WIZARD_TOOLS } from '@/lib/wizard-tools'
import { checkAndReserve, recordUsage } from '@/lib/rate-limit'
import { moderateResponse } from '@/lib/wizard-moderator'

export const runtime = 'nodejs'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  messages: ChatMessage[]
}

const BLOCKED_REFUSAL = 'The spores fall silent. Ask thy question another way, traveler.'
const IP_CAP_LINE = "Fifty riddles spun, traveler. The grove falls silent. Return with tomorrow's tide."
const BUDGET_LINE = "My spells are spent with today's sun. Return at first light."
const TIMEOUT_LINE = 'The spores drift slowly today… ask again.'
const GENERIC_ERROR_LINE = "The grove's whispers are tangled. A moment, traveler."

function allowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  const allowed = (process.env.WIZARD_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim())
  return allowed.includes(origin)
}

function validateBody(raw: unknown): raw is ChatRequestBody {
  if (typeof raw !== 'object' || raw === null) return false
  const body = raw as { messages?: unknown }
  if (!Array.isArray(body.messages)) return false
  if (body.messages.length === 0 || body.messages.length > 40) return false

  for (const msg of body.messages) {
    if (typeof msg !== 'object' || msg === null) return false
    const m = msg as { role?: unknown; content?: unknown }
    if (m.role !== 'user' && m.role !== 'assistant') return false
    if (typeof m.content !== 'string') return false
  }

  const last = body.messages[body.messages.length - 1] as ChatMessage
  if (last.role !== 'user') return false
  if (last.content.length < 1 || last.content.length > 500) return false

  return true
}

function errorBody(
  error: 'rate_limit' | 'budget' | 'rate_limiter_down' | 'moderation_block' | 'server',
  message: string,
) {
  return { error, message }
}

export async function POST(request: Request): Promise<Response> {
  // 1. Origin check
  if (!allowedOrigin(request.headers.get('origin'))) {
    return new Response(null, { status: 403 })
  }

  // 2. Parse + validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(errorBody('server', GENERIC_ERROR_LINE), { status: 400 })
  }
  if (!validateBody(body)) {
    return Response.json(errorBody('server', GENERIC_ERROR_LINE), { status: 400 })
  }

  // 3. IP extraction
  const ip = request.headers.get('x-real-ip') ?? 'unknown'

  // 4. Rate-limit pre-check
  const gate = await checkAndReserve(ip)
  if (!gate.ok) {
    if (gate.reason === 'ip_cap') {
      return Response.json(errorBody('rate_limit', IP_CAP_LINE), { status: 429 })
    }
    if (gate.reason === 'budget') {
      return Response.json(errorBody('budget', BUDGET_LINE), { status: 429 })
    }
    return Response.json(errorBody('rate_limiter_down', GENERIC_ERROR_LINE), { status: 503 })
  }

  // 5. Main generation
  let mainResponse
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    mainResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 1.0,
      system: [
        {
          type: 'text',
          text: buildWizardSystemPrompt(),
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: WIZARD_TOOLS,
      messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
    })
  } catch {
    return Response.json(errorBody('server', TIMEOUT_LINE), { status: 502 })
  }

  const textBlock = mainResponse.content.find((b) => b.type === 'text')
  const toolBlock = mainResponse.content.find(
    (b) => b.type === 'tool_use' && b.name === 'offer_mushroom',
  )

  if (!textBlock || textBlock.type !== 'text') {
    return Response.json(errorBody('server', GENERIC_ERROR_LINE), { status: 502 })
  }

  const candidate = textBlock.text.trim()

  // 6. Moderation
  const moderation = await moderateResponse(candidate)
  const mainTokens =
    (mainResponse.usage?.input_tokens ?? 0) + (mainResponse.usage?.output_tokens ?? 0)
  const totalTokens = mainTokens + moderation.tokens

  await recordUsage(ip, totalTokens)

  if (!moderation.safe) {
    return Response.json(errorBody('moderation_block', BLOCKED_REFUSAL), { status: 200 })
  }

  // 7. Success — return wizard response (and tool-use action if present)
  return Response.json({
    message: candidate,
    ...(toolBlock ? { action: 'offer_mushroom' as const } : {}),
  })
}
