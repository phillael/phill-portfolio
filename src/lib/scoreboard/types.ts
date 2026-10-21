/** The scoreboard's shapes (plan §3), shared by the routes and the board. Types only. */

export interface BoardEntry { rank: number; name: string; city: string; country: string; score: number; me?: true }
export interface Board { top: BoardEntry[]; total: number; mine: BoardEntry | null; at: number | null }
export interface RunTicket { runId: string; geo: { city: string; country: string } }
export interface SaveBody { runId: string; playerId: string; score: number; wave: number; resumes: number; name: string; city: string; country: string }
export type SaveError = 'bad_request' | 'name' | 'city' | 'run' | 'score' | 'not_best' | 'rate_limited' | 'unavailable'
export type SaveResult = { ok: true; board: Board } | { ok: false; error: SaveError; board?: Board }
