/**
 * @jest-environment node
 */
/** The scoreboard's route imports rules.ts on the server: it (and synth.ts under it) must load without browser globals. */
import { FIRST_FOE_WAVE, maxScoreFor, minSecondsFor } from '../lib/skills/rules'

describe('rules.ts on the server', () => {
  it('loads and answers with no window, document or fetch', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
    expect(FIRST_FOE_WAVE).toBe(2)
    expect(maxScoreFor(4, 0)).toBe(100050)
    expect(minSecondsFor(4)).toBeCloseTo(20.312, 3)
  })
})
