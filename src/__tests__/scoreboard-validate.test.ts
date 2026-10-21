/**
 * @jest-environment node
 */
/** The scoreboard's checks (src/lib/scoreboard/validate.ts): names, cities, countries, geolocation and the run's bounds. */
import { COUNTRY_CODES } from '../data/countries'
import { checkCity, checkName, checkRun, cleanText, geoFrom, isCountry } from '../lib/scoreboard/validate'
import { maxScoreFor, minSecondsFor } from '../lib/skills/rules'

/** places and names a profanity filter is known to trip on, which must still pass */
const MUST_PASS = ['Scunthorpe', 'Essex', 'Middlesex', 'Sussex', 'Cockburn', 'Penistone', 'Assen', 'Bastia', 'Dickinson', 'Hancock', 'Cassandra', 'Titusville']
/** profanity and its leetspeak, all within the allowed characters (so only the filter can stop them) */
const MUST_FAIL = ['fuck', 'FuCk', 'fuuuck', 'fvck', 'sh1t', '5hit', 'b1tch', 'c0ck', 'pu55y', 'wh0re', 'cunt', 'my dick']

describe('the country list', () => {
  it('is the 249 assigned ISO codes plus Kosovo, once each', () => {
    expect(COUNTRY_CODES).toHaveLength(250)
    expect(new Set(COUNTRY_CODES).size).toBe(250)
    for (const c of ['US', 'PT', 'XK', 'GB', 'BR']) expect(COUNTRY_CODES).toContain(c)
    for (const c of ['EU', 'UN', 'ZZ', 'XA', 'UK']) expect(COUNTRY_CODES).not.toContain(c)
  })
  it('isCountry takes a listed code, exactly', () => {
    expect(isCountry('PT')).toBe(true)
    expect(isCountry('XK')).toBe(true)
    for (const c of ['pt', 'EU', 'ZZ', '', 'USA', 42, null, undefined]) expect(isCountry(c)).toBe(false)
  })
})

describe('cleanText', () => {
  it('composes (NFC), trims and collapses whitespace', () => {
    expect(cleanText('  José   da \t Silva \n')).toBe('José da Silva')
    expect(cleanText('José')).toHaveLength(4)
  })
})

describe('a name', () => {
  it('comes back cleaned when it passes', () => {
    expect(checkName('  Ana   Lu ')).toBe('Ana Lu')
    for (const n of ["O'Brien", 'O’Neil', 'Jean-Luc', 'd.j_k', 'Zoë', 'Łódź', '東京', 'Привет', '42', 'R2-D2']) expect(checkName(n)).toBe(n)
  })
  it('needs 1 to 16 code points', () => {
    expect(checkName('')).toBeNull()
    expect(checkName('   ')).toBeNull()
    expect(checkName('a'.repeat(16))).toBe('a'.repeat(16))
    expect(checkName('a'.repeat(17))).toBeNull()
    expect(checkName('𝒜'.repeat(16))).toBe('𝒜'.repeat(16)) // 32 UTF-16 units, 16 code points
  })
  it('allows only letters, marks, numbers, spaces and . _ \' ’ -, with a letter or number', () => {
    for (const n of ['<b>x</b>', 'a$b', 'x@y', 'hi!', 'a/b', '😀', 'a;b']) expect(checkName(n)).toBeNull()
    for (const n of ['...', "-_'", '. .']) expect(checkName(n)).toBeNull()
  })
  it('isn’t profane, leetspeak included', () => {
    for (const n of MUST_FAIL) expect(checkName(n)).toBeNull()
  })
  it('lets real names and places through the filter', () => {
    for (const n of MUST_PASS) expect(checkName(n)).toBe(n)
  })
  it('isn’t a string: no', () => {
    for (const n of [42, null, undefined, {}, ['Ana']]) expect(checkName(n)).toBeNull()
  })
})

describe('a city', () => {
  it('may be empty, up to 24 code points', () => {
    expect(checkCity('')).toBe('')
    expect(checkCity('   ')).toBe('')
    expect(checkCity('São  Paulo ')).toBe('São Paulo')
    expect(checkCity('a'.repeat(24))).toBe('a'.repeat(24))
    expect(checkCity('a'.repeat(25))).toBeNull()
  })
  it('has the name’s rules otherwise', () => {
    for (const c of ['<script>', 'a$b', '...']) expect(checkCity(c)).toBeNull()
    for (const c of MUST_FAIL) expect(checkCity(c)).toBeNull()
    for (const c of MUST_PASS) expect(checkCity(c)).toBe(c)
    expect(checkCity(7)).toBeNull()
  })
})

describe('geoFrom (Vercel’s IP headers)', () => {
  const geo = (h: Record<string, string>) => geoFrom(new Headers(h))
  it('decodes the city and keeps a listed country', () => {
    expect(geo({ 'x-vercel-ip-city': 'S%C3%A3o%20Paulo', 'x-vercel-ip-country': 'BR' })).toEqual({ city: 'São Paulo', country: 'BR' })
  })
  it('drops what doesn’t pass', () => {
    expect(geo({ 'x-vercel-ip-city': 'Lisbon', 'x-vercel-ip-country': 'EU' })).toEqual({ city: 'Lisbon', country: '' })
    expect(geo({ 'x-vercel-ip-city': '%E0%A4%A', 'x-vercel-ip-country': 'PT' })).toEqual({ city: '', country: 'PT' })
    expect(geo({ 'x-vercel-ip-city': 'sh1t' })).toEqual({ city: '', country: '' })
  })
  it('is empty without the headers (local runs)', () => {
    expect(geo({})).toEqual({ city: '', country: '' })
  })
})

describe('checkRun (could a real run have done this?)', () => {
  const run = (wave: number, score: number, elapsed: number, resumes = 0) => checkRun({ wave, score, resumes, elapsed })
  it('a game over is at wave 3 (index 2) or later', () => {
    expect(run(1, 100, 999)).toBe(false)
    expect(run(2, 100, 999)).toBe(true)
  })
  it('the score fits the wave', () => {
    expect(run(2, maxScoreFor(2, 0), 999)).toBe(true)
    expect(run(2, maxScoreFor(2, 0) + 1, 999)).toBe(false)
    expect(run(4, maxScoreFor(4, 0), 999)).toBe(true)
  })
  it('resumes count, but no more than one per 2 s of the run', () => {
    expect(run(2, maxScoreFor(2, 3), 999, 3)).toBe(true)
    expect(run(2, maxScoreFor(2, 3), 999, 2)).toBe(false)
    expect(0.9 * minSecondsFor(2) - 2).toBeLessThan(9) // so wave 2 at 9–10 s passes on time
    expect(run(2, maxScoreFor(2, 4), 9, 10)).toBe(true) // floor(9 / 2) = 4 resumes count
    expect(run(2, maxScoreFor(2, 5), 9.9, 10)).toBe(false)
    expect(run(2, maxScoreFor(2, 5), 10, 10)).toBe(true)
  })
  it('the wave fits the time since the ticket (0.9 × the least time − 2 s)', () => {
    const edge = 0.9 * minSecondsFor(4) - 2
    expect(run(4, 1000, edge)).toBe(true)
    expect(run(4, 1000, edge - 0.01)).toBe(false)
    expect(run(4, 1000, 0)).toBe(false)
  })
})
