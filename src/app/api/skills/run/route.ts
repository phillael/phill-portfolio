import { allowedOrigin } from '@/lib/allowed-origin'
import { createRun, limitRun } from '@/lib/scoreboard/store'
import type { RunTicket } from '@/lib/scoreboard/types'
import { geoFrom } from '@/lib/scoreboard/validate'

export const runtime = 'nodejs'

const headers = { 'Cache-Control': 'no-store' }

/**
 * A Skill blaster run's ticket, asked for at the first shot (plan §3): a fresh run id whose start time the save
 * checks the run against, and where the visitor is (Vercel's IP geolocation) to prefill the board's form.
 */
export async function POST(request: Request): Promise<Response> {
  if (!allowedOrigin(request.headers.get('origin'))) return new Response(null, { status: 403, headers })
  try {
    if (!(await limitRun(request.headers.get('x-real-ip')))) return Response.json({ error: 'rate_limited' }, { status: 429, headers })
    const runId = crypto.randomUUID()
    await createRun(runId)
    const ticket: RunTicket = { runId, geo: geoFrom(request.headers) }
    return Response.json(ticket, { headers })
  } catch (err) {
    console.error('skills run: Redis unavailable', err)
    return Response.json({ error: 'unavailable' }, { status: 503, headers })
  }
}
