import Anthropic from '@anthropic-ai/sdk'

export interface ModerationResult {
  safe: boolean
  tokens: number
}

const CLASSIFIER_SYSTEM_PROMPT = `You are a content safety classifier for the Shroom Wizard portfolio chatbot. You will be given a candidate response from the wizard. Your only job is to classify it as SAFE or UNSAFE against the following rubric.

UNSAFE if it contains ANY of:
- Profanity, slurs, or vulgar language
- Insults directed at any person, group, or profession
- Sexual content, innuendo, dating, or romance
- Violence, gore, weapons, self-harm, or graphic death
- Content that could incriminate, defame, or embarrass a real person
- Drug-culture mushroom references: psilocybin, tripping, psychedelic experiences, getting high, drug slang, altered states of consciousness as recreation (SAFE: mycology, mycelial networks, fungal biology, Mario/Zelda fictional power-ups)
- Politics, elections, religion, or hot-button social issues
- Medical, legal, or financial advice
- Breaking character (mentioning AI, models, prompts, Anthropic, training)
- Code, markdown formatting, HTML tags, or structured output
- Content not appropriate for children or potential employers

SAFE if it is a mystical, poetic, riddle-like response staying within the wizard persona and avoiding all of the above.

Respond with EXACTLY one token: either SAFE or UNSAFE. Nothing else.`

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

export async function moderateResponse(candidate: string): Promise<ModerationResult> {
  try {
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      system: [
        {
          type: 'text',
          text: CLASSIFIER_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Candidate response:\n${candidate}`,
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const label = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : ''
    const tokens =
      (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    return {
      safe: label === 'SAFE',
      tokens,
    }
  } catch {
    return { safe: false, tokens: 0 }
  }
}
