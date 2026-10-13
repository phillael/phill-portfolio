/**
 * The Finder: type a skill (or tap a chip) and the matching words lift off the page.
 * Pure matching over the words' tokens, in reading order.
 */

export const CHIPS: [string, string[]][] = [
  ['AI', ['ai', 'anthropic', 'openai', 'claude', 'mcp', 'agent*', 'agentic', 'llm', 'generative', 'prompt']],
  ['React', ['react', 'react native', 'next.js', 'r3f', 'expo', 'three.js']],
  ['TypeScript', ['typescript']],
  ['AWS', ['aws', 'ecs', 'ses', 'sqs', 'sns', 's3', 'cloudfront', 'lambda@edge', 'rds', 'aurora', 'terraform']],
  ['Node', ['node', 'node.js', 'fastify', 'express', 'trpc']],
  ['Data', ['postgres', 'postgres/aurora', 'mysql', 'mongodb', 'redis', 'sql', 'drizzle', 'neon', 'convex', 'bullmq']],
  ['Impact', ['#metrics']],
  ['Music', ['guitarist', 'composer', 'jazz', 'musicians', 'score', 'itunes', 'album', 'funky', 'knuckles', 'eco']],
]

export interface WordToken {
  /** the word as printed */
  text: string
  /** lower-cased, outer punctuation trimmed */
  tok: string
  /** tok split at slashes ("postgres/aurora" → both) */
  parts: string[]
}

export function wordToken(text: string): WordToken {
  const tok = text.toLowerCase().replace(/^[^a-z0-9~#+]+|[^a-z0-9%+×]+$/g, '')
  return { text, tok, parts: tok.split(/[/]/) }
}

/** A number worth lifting under "Impact": counts, %, ×, K/M; not years. */
export const isMetric = (t: string) => {
  const n = t.replace(/^[~#(]+/, '').split('-')[0]
  return /^\d[\d.,]*(k|m)?[%×+]?$/.test(n) && !/^(19|20)\d\d$/.test(n)
}

export function tokMatch(word: WordToken, w: string) {
  if (w === '#metrics') return isMetric(word.tok) && !/^\(\d{3}\)$|^\d{3}-\d{4}$/.test(word.text.trim()) // never a phone number
  if (w.endsWith('*')) {
    const stem = w.slice(0, -1)
    return word.tok.startsWith(stem) || word.parts.some((p) => p.startsWith(stem))
  }
  return word.tok === w || word.parts.includes(w)
}

/**
 * Which words a query lights up. A chip name uses the chip's terms; anything else of
 * two or more letters is a prefix search (or an exact phrase if it has a space).
 */
export function findMatches(words: WordToken[], query: string): Uint8Array {
  const q = query.trim().toLowerCase()
  const chip = CHIPS.find(([name]) => name.toLowerCase() === q)
  const terms = chip ? chip[1] : q.length >= 2 ? [q.includes(' ') ? q : q + '*'] : []
  const hit = new Uint8Array(words.length)
  for (const term of terms) {
    const ws = term.split(/\s+/)
    for (let i = 0; i + ws.length <= words.length; i++) {
      if (ws.every((w, k) => tokMatch(words[i + k], w))) for (let k = 0; k < ws.length; k++) hit[i + k] = 1
    }
  }
  return hit
}

export const countMatches = (hit: Uint8Array) => hit.reduce((n, v) => n + v, 0)
