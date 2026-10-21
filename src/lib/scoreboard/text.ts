/**
 * The scoreboard's text rules that both sides share: the board checks them before it sends anything, and the server
 * (validate.ts, which adds the profanity filter) is the authority. No dependencies, so the client can import it.
 */

export const NAME_MAX = 16
export const CITY_MAX = 24
/** letters, marks, numbers, spaces and . _ ' ’ - */
export const TEXT_OK = /^[\p{L}\p{M}\p{N} ._'’-]+$/u
/** at least one letter or number */
export const HAS_WORD = /[\p{L}\p{N}]/u

/** NFC, trimmed, whitespace collapsed to single spaces */
export const cleanText = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ')
/** length in code points (an astral letter is one) */
export const codePoints = (s: string) => [...s].length
