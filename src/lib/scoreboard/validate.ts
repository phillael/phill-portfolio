/**
 * The scoreboard's server-side checks (the routes' authority; plan §5): a name, a city, a country, where the visitor
 * is (Vercel's IP headers) and whether a real run could have scored this. Server-only: it carries `obscenity`'s
 * English dataset, which must never reach a client bundle (the board uses text.ts). Tests: scoreboard-validate.test.ts.
 */

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'
import { COUNTRY_CODES } from '@/data/countries'
import { FIRST_FOE_WAVE, maxScoreFor, minSecondsFor } from '@/lib/skills/rules'
import { CITY_MAX, HAS_WORD, NAME_MAX, TEXT_OK, cleanText, codePoints } from './text'

export { cleanText }

const english = englishDataset.build()
/** real places and names the English dataset would otherwise block (its whitelist is the library's fix for these) */
const ALLOWED = ['penistone', 'dickinson']
const matcher = new RegExpMatcher({
  ...english,
  whitelistedTerms: [...(english.whitelistedTerms ?? []), ...ALLOWED],
  ...englishRecommendedTransformers,
})

const COUNTRIES = new Set(COUNTRY_CODES)

/** the cleaned text, or null: `min`–`max` code points, the shared characters with a letter or number, not profane */
function checkText(raw: unknown, min: number, max: number): string | null {
  if (typeof raw !== 'string') return null
  const s = cleanText(raw), n = codePoints(s)
  if (n < min || n > max) return null
  if (!n) return s
  return TEXT_OK.test(s) && HAS_WORD.test(s) && !matcher.hasMatch(s) ? s : null
}
/** a name (1–16 code points), cleaned, or null */
export const checkName = (raw: unknown) => checkText(raw, 1, NAME_MAX)
/** a city (0–24 code points; '' is fine), cleaned, or null */
export const checkCity = (raw: unknown) => checkText(raw, 0, CITY_MAX)
/** a listed ISO 3166-1 alpha-2 code (or XK), exactly */
export const isCountry = (c: unknown): c is string => typeof c === 'string' && COUNTRIES.has(c)

/** where the visitor is, from Vercel's IP geolocation: the city URL-decoded and checked, the country if listed; '' for
    anything missing or that doesn't pass (local runs have no headers) */
export function geoFrom(headers: Headers): { city: string; country: string } {
  let city = ''
  try { city = checkCity(decodeURIComponent(headers.get('x-vercel-ip-city') ?? '')) ?? '' } catch { /* a malformed escape */ }
  const country = headers.get('x-vercel-ip-country') ?? ''
  return { city, country: isCountry(country) ? country : '' }
}

/** could a real run have done this? A game over (wave ≥ the first enemies'), a score the wave allows (a resume per 2 s
    at most), and the wave reached no sooner than the game allows (`elapsed`: seconds since the run's ticket; the slack
    covers the ticket being made a network trip after the first shot) */
export function checkRun({ wave, score, resumes, elapsed }: { wave: number; score: number; resumes: number; elapsed: number }) {
  return wave >= FIRST_FOE_WAVE
    && score <= maxScoreFor(wave, Math.min(resumes, Math.floor(elapsed / 2)))
    && elapsed >= 0.9 * minSecondsFor(wave) - 2
}
