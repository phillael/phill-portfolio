# Skills scoreboard: the all-time top 10 at game over (v1.9.0)

## Context

### What exists (v1.8.0, master bca8223, branch `feat/skills-scoreboard`)

- **The Skill blaster** (PR #44, `docs/plans/2026-10-20-skills-blaster-plan.md`) is live on www.phillcodes.com. It's in `src/lib/skills/blaster.ts` + `blaster.css`, a lazy chunk with imperative DOM and no React state.
  - **Game over today** (`gameOver()`):
    - the banner and the tape stop;
    - at `OVER_FADE` (1.5 s) `musicStop(0.05)`, `handBack()` (the site's song) and `arenaOff()` (the list is back);
    - the readout keeps "Game over · score · best · shoot any skill to play again · Number Slayers ↗" until a 12 s timer sets `G.state = 'rest'` and calls `hudOff()`.
  - **Shots during the fade** don't restart the game (`G.settle`).
  - **The device's best** is in localStorage `skill-blaster-best`.
  - **A run only ends in a game over** by losing all 5 health, and only enemies do damage, so a game over always comes at wave index ≥ `FIRST_FOE_WAVE` (2). Esc or ✕ mid-game quits (`stop()`).
- **The backend:** Upstash Redis (`@upstash/redis`), used by the Shroom Wizard.
  - **Wizard code:** `src/lib/rate-limit.ts` (keys `wiz:*`) and `src/app/api/wizard/chat/route.ts`, which checks the Origin against `WIZARD_ALLOWED_ORIGINS` (its local `allowedOrigin()`) and reads the IP from `x-real-ip`.
  - **Keepalive:** a daily cron keeps the free-tier DB alive (`/api/wizard/keepalive`, `vercel.json`).
  - **One DB everywhere:** `.env.local` points at the **same DB as production**.
- **Tests** mock `@upstash/redis` with `jest.mock` (see `src/__tests__/rate-limit.test.ts`; route tests run in the node env, `src/__tests__/wizard-keepalive-route.test.ts`).

### What we're building (Phill's calls, 2026-10-21)

At every game over, once the music has faded and the list is back (1.5 s), a **dialog in the middle of the screen** opens with the all-time top 10 ("Centre stage", look B of the mockup).
- **The visitor's run is already a row in the list:**
  - a name field, then city and country prefilled from where they are (Vercel's IP geolocation), all editable;
  - Save puts it on the board.
- **Everyone gets a rank** ("#212 of 413"). Rows outside the top 10 show under a "· · ·".
- **One entry per player:** each player is on the board once, with their best run. A run under their best shows the board and their best, with no form.
- **Closing:** the dialog closes with ✕, Esc or a click on the backdrop. The section is then at rest, and shooting a skill starts a new game.

### Decisions and why (the executor wasn't in the conversation: don't re-litigate these)

- **All time only.** I recommended all time + a weekly board, so a new visitor can still make it. Phill picked one board.
- **Anyone can save a run and see their rank,** not only top-10 scores (Phill).
- **One entry per player, their best.** This was my call, shown in the mockup; Phill approved the mockup ("looks perfect").
  - **Why:** it keeps one person from filling the board.
  - **How:** the player is a random UUID in localStorage. Clearing storage makes a new player, and that's accepted.
- **Location:** a city (optional) and a country picker, prefilled from Vercel's `x-vercel-ip-city`/`x-vercel-ip-country` and editable (Phill). Nothing about location is stored unless they save.
- **Moderation:** the `obscenity` profanity filter at entry, on the server, and a removal script Phill runs (`scripts/scoreboard.mjs rm`). Phill picked this over pings and over approving entries first.
- **Look B, "Centre stage"** (Phill, 2026-10-21: "looks perfect. i like the centerstage look"). The mockup's look A is reference only.
- **Run tickets live in Redis, not HMAC tokens.**
  - **Why:** HMAC needs a new secret in Vercel; Redis needs no new env var.
  - **How:** `POST /api/skills/run` at the first shot stores the run's start time under a random id (3 h TTL). The save consumes it atomically (`GETDEL`): one save per run.
- **Anti-cheat: medium.** It's a browser game, so anyone with devtools can post a score. The point is to make faking slow, not impossible:
  - one save per ticket;
  - the score must fit what a real run could reach by its wave (`maxScoreFor`);
  - the wave must fit the time since the ticket (`minSecondsFor`), both from `rules.ts`, the same rules the game plays by;
  - a game over is at wave ≥ 2;
  - a believable fake still passes after waiting out the time; that's accepted.
  - **Rejected:** full replay validation (too heavy for a portfolio).
- **Stopping (Esc or ✕ mid-game) is a quit:** no board. Only a game over opens it.
- **A native `<dialog>` with `showModal()`.** It gives the top layer (above the nav and the music player without z-index fights), `inert` everywhere else, a focus trap, Esc via `cancel`, and focus coming back on close. It's appended to `<body>`, outside the shroom wrappers (CLAUDE.md gotcha: a filter on an ancestor breaks fixed positioning).

### Rejected (don't rediscover)

- A weekly board or tabs; top-10-only entry; approve-before-showing; a ping on new top-10 entries.
- Look A ("the readout grows", non-modal, out of the readout).
- HMAC tickets (a new secret); Postgres or Neon (sorted sets are a leaderboard); full replay validation.
- Storing IPs (the rate-limit keys hold a truncated SHA-256 and expire within a day).
- Exposing player ids to anyone else: a player id is the key to that player's entry.
- Flag emoji (Windows shows letters): places read "Lisbon, PT".

## Binding — do not redesign

### 1. The mockup is the visual and interaction contract (look B only)

`docs/design/skills-game/scoreboard/index.html` with **Look: B · Centre stage**:
- `board.js`: `shell()`, `render()`, `formHtml()`, `rowHtml()`, `offline()`, `submit()`, `enter()`, `close()`;
- `board.css`: `.sb`, `.sb-b`, `.sb-dim` (in production that's `dialog::backdrop`), the rows, the form, the ghosts, the offline state, and the ≤560px and coarse-pointer rules.

Port look B and nothing else. Look A's paths (`.sb-a`, `.bl-hud.sb-grown`, the IntersectionObserver close) are not ported. The fake `API` becomes the real routes (§3).

**Intentional differences from the mockup:**
- **Ties share a rank:** rank = 1 + the number of players with a strictly higher score. The mockup put a run after its ties.
- **Rank numbers on screen:**
  - the top-10 view's numbers are worked out on the client from the merged list (the server's top 10, minus the player's old entry when this run replaces it, plus the pending row), using the same ranking;
  - rows under the "· · ·" use the server's ranks.
- **Three new strings** (§2) for states the mockup didn't have.
- **The dialog has its own live region:** `showModal()` makes the section's live region (`[data-sk-live]`) inert, and inert content isn't announced. The mockup used the section's.

**Layout:**
- width `min(500px, 100vw − 32px)`, max-height `calc(100dvh − 32px)`, centred;
- the list scrolls inside (`overscroll-behavior: contain`);
- the backdrop is `hsl(220 30% 3% / .62)` with `blur(3px)`;
- ≤560px: the mockup's phone rules (padding, a 1.7rem score, 30px rows, the form's areas `"n name pts" ". place place" ". err save"`);
- coarse pointers: inputs and buttons 44px tall;
- inputs at least 16px (no iOS zoom on focus).

**Tokens:** the dialog lives on `<body>`, outside `#skills`. The section's tokens (`--cyan`, `--ink`, `--ink-2`, `--ink-3`, `--hair`, `--hair-strong`, `--green`, `--ease`) are scoped to `Skills.module.css`'s `.section`, and `.hbtn-ico` is scoped to `.bl-hud`. So `.sb` defines its own token block (the same mapping: `--cyan: hsl(var(--primary))` etc.) and its own close-button style. Fonts are the global `--font-heading` (Audiowide) and `--font-body` (Nunito); no pixel font.

**Behaviour:**
- **Open:** at `OVER_FADE`, after `arenaOff()`.
  - **On open:** the heading (`tabindex=-1`) takes focus.
  - **Once the board loads:** if a form is shown and the play was keyboard (`kb`) or the pointer is fine (`(pointer: fine)`), the name input takes focus. On touch, focus stays on the heading, so no keyboard pops up unasked.
- **Loading:** 10 ghost rows (pulse; static under reduced motion) until `GET /api/skills/scores` answers.
- **States:**
  - **pending:** the form row at its rank, in the top 10 or under "· · ·";
  - **saved:** your row highlighted, with the "You" tag; focus moves to it;
  - **under your best:** no form; your row highlighted where it ranks;
  - **offline:** the GET failed;
  - **no ticket:** your row shows its rank and score with the no-ticket line in place of the form.
- **Validation:**
  - on the client, the mockup's messages for an empty name and for disallowed characters in the name or city (no request is sent);
  - the server is the authority (§5);
  - errors show under the form (`role="alert"`), and the bad field gets `aria-invalid` and focus.
- **Save:** the button reads "Saving…" and is disabled. On success the dialog re-renders from the board in the response, and `{name, city, country}` is remembered (`skill-blaster-profile`). The remembered profile prefills before geolocation does.
- **Close:** ✕, Esc (the native `cancel`) or a click on the backdrop.
  - **Backdrop clicks:** the `<dialog>` has no padding and one inner wrapper fills it, so `e.target === dialog` only on backdrop clicks.
  - **Esc** must not reach the wizard's or shroom mode's window listeners or blaster's document listener: a keydown listener on the dialog calls `stopPropagation()` for Escape and lets the default `cancel` close it.
  - **After closing:** `G.state = 'rest'` and `hudOff()`.
- **A new game, `stop()` or `dispose()`** closes it silently (no `onClose`), dropping an unsaved entry.
- **Motion:**
  - **Open:** the backdrop fades over 260 ms; the panel goes opacity 0 → 1 and scale .97 → 1 over 320 ms (`--ease`); the parts stagger in from 120 ms, 40 ms apart; the rows fade over 240 ms, 18 ms apart.
  - **Close:** opacity and scale .98 over 180 ms, then `dialog.close()`.
  - **Reduced motion:** a 200 ms fade to open, an instant close, no stagger, static ghosts.
- **User text** (names, cities) goes into the DOM through `textContent` only, never `innerHTML`.

### 2. Copy (exact; en-US numbers via `toLocaleString('en-US')`)

- **Eyebrow:** `Game over`
- **The rank line:**
  - pending, rank 1: `A new #1 of {total}` ("A new #1" in gold);
  - pending: `#{at} of {total}`, plus ` · new best` (green) when the run beats the device's best;
  - saved: `Saved · you’re #{rank} of {total}` ("Saved" green);
  - under your best: `#{at} of {total} · your best, {score}, is #{rank}`;
  - offline: empty.
  - `{total}` for a pending run counts the run (total + 1 when the player has no entry yet).
- **The heading:** `Top 10 · all time`.
- **Your row:**
  - placeholders `Your name`, `City`; the select's first option `Country`;
  - screen-reader labels `Your name`, `City (optional)`, `Country`;
  - the button `Save` → `Saving…`;
  - the tag `You`; the gap `· · ·`.
- **A place:**
  - `{city}, {CC}` when both are set;
  - `{city}` alone;
  - the country's English name alone (`Intl.DisplayNames(['en'], { type: 'region' })`);
  - nothing.
- **Errors (from the mockup):**
  - `Add a name first`
  - `Letters, numbers, spaces and . _ ' - only`
  - `A city in letters, please`
  - `Pick another name`
  - `Couldn’t save: the scoreboard is out. Try again in a bit.` (network, 429, 503, 400)
- **Errors (new, written with this plan):**
  - `Pick another city` (the server's filter on a city);
  - `This run can’t go on the board.` (410 `run` or 422 `score`; Save stays disabled);
  - `Can’t be saved: the scoreboard was out when this run started.` (no run ticket; in your row, in place of the form).
- **Offline:**
  - `The scoreboard didn’t load.`
  - `Your best, {best}, is saved on this device.` (`{best}` is the larger of this run and `skill-blaster-best`)
  - the button `Try again` (reloads the board).
- **The footer:** `Close this, then shoot any skill to play again`, then the link `Want more? Number Slayers ↗` (`https://numberslayers.com`, a new tab, `rel="noopener"`).
- **The ✕:** `aria-label="Close the scoreboard"`.
- **The live region** (inside the dialog, polite):
  - pending: `Game over. {score} points: number {at} of {total} on the scoreboard. Add your name to keep it.`
  - saved: `Saved. You’re number {rank} of {total}.`
  - under your best: `Game over. {score} points: number {at} of {total}. Your best is number {rank}.`
  - offline: `The scoreboard didn’t load.`

### 3. The API (exact shapes; `runtime = 'nodejs'`; every response `Cache-Control: no-store`)

The shared types live in `src/lib/scoreboard/types.ts` (types only, imported by the client and the server):

```ts
export interface BoardEntry { rank: number; name: string; city: string; country: string; score: number; me?: true }
export interface Board { top: BoardEntry[]; total: number; mine: BoardEntry | null; at: number | null }
export interface RunTicket { runId: string; geo: { city: string; country: string } }
export interface SaveBody { runId: string; playerId: string; score: number; wave: number; resumes: number; name: string; city: string; country: string }
export type SaveError = 'bad_request' | 'name' | 'city' | 'run' | 'score' | 'not_best' | 'rate_limited' | 'unavailable'
export type SaveResult = { ok: true; board: Board } | { ok: false; error: SaveError; board?: Board }
```

- **`POST /api/skills/run`** (the client sends `{}`):
  - **The Origin check** (`WIZARD_ALLOWED_ORIGINS`) fails → 403 with no body.
  - **The rate limit** (60 runs per IP per hour) is hit → 429 `{ error: 'rate_limited' }`.
  - **Success:** 200 `RunTicket`.
    - `runId` is `crypto.randomUUID()`.
    - `geo` comes from `x-vercel-ip-city` (URL-decoded, run through the city check, `''` if it fails) and `x-vercel-ip-country` (`''` unless it's in the country list).
  - **Redis down or unconfigured** → 503 `{ error: 'unavailable' }`.
- **`GET /api/skills/scores?player=<uuid>&score=<int>`** (both optional; there's no Origin check, because a same-origin GET carries none; it's public data):
  - 200 `Board`:
    - `top`: up to 10, best first, with the shared ranks;
    - `me: true` on the requesting player's row;
    - `mine`: the player's entry with its rank, or null;
    - `at`: the rank `score` would have (1 + the count strictly higher), or null.
  - 503 `{ error: 'unavailable' }`.
  - Player ids never appear in a response.
- **`POST /api/skills/scores`** (body `SaveBody`), checked in this order, and nothing touches Redis before step 4:
  1. The Origin check fails → 403.
  2. The JSON or a field's type or range fails → 400 `bad_request`:
     - `runId` and `playerId` must be UUIDs;
     - `score` an integer 0–10,000,000;
     - `wave` an integer 0–500;
     - `resumes` an integer 0–10,000;
     - `country` must be `''` or in the list.
  3. The name or city check (§5) fails → 422 `name` or `city`. The run is **not** consumed, so they can fix it and save.
  4. The save rate limit (20 per IP per day) is hit → 429 `rate_limited`.
  5. `GETDEL` on the run key finds nothing → 410 `run`.
  6. The plausibility check (§5) fails → 422 `score`.
  7. The player's existing score is ≥ this one → 409 `not_best` with `board`.
  8. Otherwise save (§4) → 200 `{ ok: true, board }`, the board as the GET would return it for this player and score.
  - Redis errors at any step → 503 `unavailable`.

### 4. Redis layout (`env` = `process.env.VERCEL_ENV ?? 'development'`, so previews and local runs never touch production's board)

- **`sb:{env}:board`:** a sorted set, member = the player id, score = their best score.
- **`sb:{env}:who`:** a hash, player id → `{ name, city, country, wave, at }` (`at` = ms).
- **`sb:{env}:run:{runId}`:** the run's start time in ms, with `EX 10800`.
- **`sb:{env}:lim:run:{ipHash}:{YYYY-MM-DDTHH}`:** `INCR` + `EXPIRE 3600`.
- **`sb:{env}:lim:save:{ipHash}:{YYYY-MM-DD}`:** `INCR` + `EXPIRE 93600`.
  - `ipHash` = the first 16 hex characters of SHA-256 of `x-real-ip` (or `'unknown'`). No IP is stored as-is.
- **A save:**
  - `ZADD sb:{env}:board GT {score} {playerId}` and `HSET sb:{env}:who {playerId} {json}`, in one pipeline;
  - the board read: `ZRANGE … 0 9 REV WITHSCORES`, `HMGET who …ids`, `ZCARD`, `ZSCORE` + `ZCOUNT` + `HGET` for `mine`, and `ZCOUNT ({score} +inf` for `at`, in one pipeline.
  - Mind `@upstash/redis`'s automatic JSON (de)serialization of hash values.
- **Volume:** about 20 commands per game (run 3, board 7, save ~10), well inside the free tier.

### 5. Validation and the plausibility check

- **The name:**
  - `normalize('NFC')`, trimmed, whitespace collapsed;
  - 1–16 code points;
  - only `/^[\p{L}\p{M}\p{N} ._'’-]+$/u`, with at least one letter or number;
  - the `obscenity` English matcher (`RegExpMatcher` with `englishDataset.build()` and `englishRecommendedTransformers`; check the current API in its docs) must not match.
- **The city:** the same rules, 0–24 code points.
- **The country:** `''` or in `src/data/countries.ts`. That's the 249 officially assigned ISO 3166-1 alpha-2 codes plus `XK` (Kosovo, which IP geolocation uses), committed as a literal list. The client names them with `Intl.DisplayNames`.
- **The filter mustn't block real places and names.** These must pass: Scunthorpe, Essex, Middlesex, Sussex, Cockburn, Penistone, Assen, Bastia, Dickinson, Hancock, Cassandra, Titusville. Obvious profanity and its leetspeak must fail. Use the library's whitelist mechanism if one is blocked; if that can't fix it, stop (§ Stop conditions).
- **In `rules.ts`** (pure, also imported by the route; `synth.ts` is pure at module load, so that's safe on the server):
  - **`maxScoreFor(wave, resumes)`:** the most a run can score through the end of wave index `wave`. Every lit skill in waves 0…wave is hit with the band full (`ORDER.length` = 7), each elite's 2 shields count at `SHIELD_PTS` (not multiplied), plus `clearBonus(i)` per wave, plus 100 × (1 + resumes) for the first shot and each resume's free hit.
    - Expected: (0,0) 5,950; (1,0) 16,250; (2,0) 33,800; (3,0) 60,800; (4,0) 100,050; each resume +100.
  - **`minSecondsFor(wave)`:** the least time to reach wave index `wave`. One `BAR` before wave 0, then for each wave i < `wave`: 0.3 + (nᵢ − 1) × 0.4 × gapᵢ for its spawns at their quickest, plus a `BAR` to the next wave (2 × `BAR` into `FIRST_FOE_WAVE`).
    - Why those numbers: blaster's `queueSpawn` uses `onGrid`, which is "at least sec away"; a hit requeues at ≥ 0.4 × gap; `toWave` waits ≥ 1 bar, 2 into the drop.
    - Expected (`BAR` = 240/172): 1.395, 5.331, 10.941, 15.497, 20.312 for waves 0–4.
  - Past the table, both come from `waveCfg(i)`.
- **The server accepts** a run when all three hold (`elapsed` = the server's now − the ticket's start, in seconds; the slack covers the ticket being made a network trip after the click):
  - `wave >= FIRST_FOE_WAVE`;
  - `score <= maxScoreFor(wave, Math.min(resumes, Math.floor(elapsed / 2)))`;
  - `elapsed >= 0.9 × minSecondsFor(wave) − 2`.

### 6. The client

- **`src/lib/skills/scoreboard-api.ts`:**
  - `startRun(): Promise<RunTicket | null>` (null on any failure; guard `typeof fetch`, as `synth.ts` does);
  - `fetchBoard(playerId, score): Promise<Board>` (throws on failure);
  - `saveScore(body): Promise<SaveResult>` (a network failure → `{ ok: false, error: 'unavailable' }`);
  - `playerId()` (localStorage `skill-blaster-player`, a `crypto.randomUUID()`; a per-page id if storage throws);
  - `loadProfile()` / `saveProfile()` (`skill-blaster-profile`).
  - Every storage access is wrapped in try/catch.
- **`src/lib/skills/scoreboard.ts`:** `createScoreboard({ onClose }) → { open(run), close(silent?), isOpen() }`.
  - `run` = `{ score, wave, resumes, best, kb, ticket: Promise<RunTicket | null> }`.
  - The `<dialog class="sb">` is made on the first `open` and appended to `<body>`.
  - Its styles go in `blaster.css` (global, in the game's chunk).
- **`blaster.ts`:**
  - `begin()` sets `G.run = startRun()` and `G.resumes = 0`; `resume()` does `G.resumes++`;
  - `gameOver()`'s `OVER_FADE` step also calls `board.open(...)`, and the 12 s timer goes;
  - `onClose` → `if (G.state === 'over') { G.state = 'rest'; hudOff() }`;
  - `stop()`, `resetRun()` and `dispose()` → `board.close(true)`.
  - No scoreboard request goes out before the first shot.

### 7. Accessibility and performance (binding)

- **Accessibility:**
  - WCAG 2.1 AA;
  - the dialog is labelled by its heading;
  - every control is labelled;
  - visible focus;
  - 44px targets on coarse pointers;
  - keyboard-only works end to end (Tab, Enter saves, Esc closes);
  - focus comes back on close;
  - reduced motion is respected.
- **Performance:**
  - nothing new runs per frame;
  - the board's code is in the blaster chunk (no new chunk on the page's first load);
  - layout reads only at open (none in rAF);
  - `obscenity` is server-only (it never reaches a client bundle).

## Task checklist

Order matters: T1–T3 are the server's pieces, T4 needs them, T5–T7 build the client on T4's shapes, and T8–T10 finish.

- [x] **T1: The plausibility rules in `rules.ts`.**
  - `maxScoreFor(wave, resumes)` and `minSecondsFor(wave)`, per §5.
  - Tests in `skills-rules.test.ts`:
    - the expected values for waves 0–4;
    - monotonic past the table;
    - each resume adds 100;
    - a node-env test (`src/__tests__/scoreboard-rules-node.test.ts`) that imports `rules.ts` without browser globals.
- [x] **T2: The country list and the validation.**
  - `src/data/countries.ts` (`COUNTRY_CODES`, a literal; generate it once with Node's `Intl` the way the mockup does, then commit the list).
  - `src/lib/scoreboard/validate.ts`: `cleanText`, `checkName`, `checkCity`, `isCountry`, `geoFrom(headers)`, `checkRun({ wave, score, resumes, elapsed })`.
  - `npm i obscenity`.
  - Tests in `scoreboard-validate.test.ts`:
    - the code count (250) with `US`, `PT`, `XK`;
    - each rule of §5, including the must-pass list and the leetspeak fails;
    - `geoFrom` decodes `S%C3%A3o%20Paulo` and drops a bad country;
    - `checkRun` on the boundaries.
- [ ] **T3: The store.**
  - `src/lib/scoreboard/store.ts`: the key layout of §4, `createRun`, `takeRun`, `readBoard({ player, score })`, `saveEntry`, the two rate limits, and `envPrefix()`.
  - A fake for tests: `src/__tests__/helpers/fakeRedis.ts`, an in-memory `@upstash/redis` with the commands used, including `pipeline().exec()`, `zrange` with `{ rev, withScores }`, `getdel`, `zadd` with `{ gt }`, and JSON values.
  - Tests in `scoreboard-store.test.ts`:
    - shared ranks on ties;
    - `GT` keeps the best;
    - `mine` and `at`;
    - `me` on the player's top row;
    - no player id in the output;
    - the env prefix (development, preview, production);
    - the TTLs.
- [ ] **T4: The routes.**
  - `src/app/api/skills/run/route.ts` (POST) and `src/app/api/skills/scores/route.ts` (GET, POST), per §3.
  - Move the wizard chat's `allowedOrigin()` into `src/lib/allowed-origin.ts` and use it in both. The wizard's tests must stay green.
  - Route tests (`/** @jest-environment node */`, `scoreboard-routes.test.ts`, on `fakeRedis`):
    - every status in §3's order;
    - a bad name doesn't consume the run;
    - a reused run → 410;
    - an impossible score → 422;
    - an early wave-4 claim → 422;
    - a run under the player's best → 409 with the board;
    - geo from headers;
    - `Cache-Control: no-store`;
    - 503 when Redis throws.
- [ ] **T5: The client API.**
  - `src/lib/skills/scoreboard-api.ts`, per §6.
  - Tests in `skills-scoreboard-api.test.ts` (`fetch` mocked): the shapes, the failure mappings, and the player id and profile in storage (including storage throwing).
- [ ] **T6: The board.**
  - `src/lib/skills/scoreboard.ts` + the `.sb` styles in `blaster.css`, a port of the mockup's look B per §1–2.
  - Tests in `skills-scoreboard.test.ts` (jsdom; stub `HTMLDialogElement.prototype.showModal`/`close` if jsdom lacks them; the API mocked):
    - each state: loading, pending in the top 10 and below the gap, a new #1, saved, under your best, offline + Try again, no ticket;
    - each error string;
    - the client-side checks send nothing;
    - the profile prefill beats geo;
    - user text via `textContent` (a `<b>` name renders as text);
    - Esc doesn't reach a window listener;
    - a backdrop click closes and an inner click doesn't;
    - the focus rules (kb / fine / touch);
    - the live region inside the dialog;
    - reduced motion.
- [ ] **T7: Wire it into the game.**
  - `blaster.ts` per §6.
  - Update the "game over" tests in `skills-blaster.test.tsx`:
    - the board is open at 1.7 s;
    - the state stays `'over'` past 12 s;
    - closing → `'rest'` and the readout off;
    - a shot after the fade starts a new game and closes the board;
    - `begin()` asks for a run once;
    - a resume counts.
  - Add a test: Esc or ✕ mid-game opens no board.
- [ ] **T8: The removal script and the docs.**
  - `scripts/scoreboard.mjs`, run as `node --env-file=.env.local scripts/scoreboard.mjs <cmd> [--env development|preview|production]` (default development):
    - `list [--n 20]` (rank, score, name, place, wave, date, player id);
    - `rm <playerId>` (`ZREM` + `HDEL`);
    - `clear` (deletes `board` and `who`; refuses `production`).
  - `CLAUDE.md`:
    - Key Files: the scoreboard modules and the routes;
    - Gotchas: the dialog's own tokens and live region, Esc and `cancel`, the `sb:{env}` keys, and that `.env.local` shares production's DB;
    - Commands: the script.
  - Verify `list` and `clear` against `--env development` only.
- [ ] **T9: Browser verification (dev server on :3000).**
  - **Desktop 1280×800 (mouse) and phone 375×812 (touch):**
    - lose a real run: `__skills.jumpToDrop()`, `G.hp = 1`, shoot air until hit;
    - save a name;
    - a second game over under that best;
    - offline (intercept `/api/skills/scores` → fail) and no ticket (intercept `/api/skills/run` → 503).
  - **Behaviour:**
    - keyboard-only (the name is focused, Enter saves, Esc closes, focus returns);
    - the summoned wizard stays when Esc closes the board;
    - reduced motion;
    - no `/api/skills/*` request before the first shot;
    - no console errors.
  - Screenshots are compared with the mockup's look B.
  - Finish with `clear --env development`.
- [ ] **T10: The version and the PR text.**
  - `package.json` → 1.9.0.
  - Write the PR text in this plan (Summary, What's in it, Decisions, Test plan for Phill, Screenshots to take).
  - Run the gates.
  - **Stop. Don't push:** the PR waits for Phill's go.

## Per-task verification

Always: `npx jest --no-watchman <the task's test files>` shows them passing; `npx tsc --noEmit` exits 0; `npm run lint > $SCRATCH/lint.txt 2>&1; echo $?` prints 0 (zsh has no PIPESTATUS). Paste the pass lines.

- **T1:** `npx jest --no-watchman src/__tests__/skills-rules.test.ts src/__tests__/scoreboard-rules-node.test.ts`.
- **T2:** `npx jest --no-watchman src/__tests__/scoreboard-validate.test.ts`, and `node -e` showing `COUNTRY_CODES.length === 250`.
- **T3:** `npx jest --no-watchman src/__tests__/scoreboard-store.test.ts`.
- **T4:** `npx jest --no-watchman src/__tests__/scoreboard-routes.test.ts src/__tests__/wizard-chat-route.test.ts src/__tests__/wizard-keepalive-route.test.ts`.
- **T5:** `npx jest --no-watchman src/__tests__/skills-scoreboard-api.test.ts`.
- **T6:** `npx jest --no-watchman src/__tests__/skills-scoreboard.test.ts`, and the full `npx jest --no-watchman` (the CSS lives in `blaster.css`).
- **T7:** `npx jest --no-watchman src/__tests__/skills-blaster.test.tsx src/__tests__/skills-play.test.tsx`, then the full suite.
- **T8:** `node --env-file=.env.local scripts/scoreboard.mjs list --env development` prints a table (or "empty"); `… clear --env production` refuses with a non-zero exit; `rm` is tested on a dev entry made through the running app or `curl`.
- **T9:** the screenshots (`docs/design/skills-game/tools/shoot.mjs` style, saved to the scratchpad), the network log and the keyboard path, with what each showed. Then `… clear --env development`.
- **T10:** the gates: `npx tsc --noEmit`, lint 0, the full `npx jest --no-watchman`, `npm run build` (then `git checkout -- next-env.d.ts`).

## Acceptance

1. **The gates:** `npx tsc --noEmit` 0; `npm run lint` 0 warnings; `npx jest --no-watchman` all green (record the suite and test counts); `npm run build` succeeds (then `git checkout -- next-env.d.ts`).
2. **The production build:** `npm run start` on :3000 (`__skills` is stripped, so this is a real run).
   - **Desktop 1280×800:** shoot one skill, then shoot air every ~2 s (it keeps the idle pause away) until the enemies end the run. That's a real game over, around waves 3–4.
   - **Then:**
     - the board opens after the fade;
     - type a name, keep the empty geo (local runs have no Vercel headers), and Save;
     - the row is highlighted with the right rank;
     - `list --env development` shows it.
   - That proves the real bounds accept a real run.
3. **Anti-cheat with `curl`** against :3000, with `-H 'Origin: http://localhost:3000'` unless noted:
   - `POST /api/skills/run` without the Origin → 403;
   - with it → 200 and an empty `geo`;
   - that run straight away with score 999,999 at wave 4 → 422 `score`;
   - the same run again → 410 `run`;
   - a fresh run with name `sh1t` → 422 `name`, then the same run with a good name and a plausible score after the wait → 200. That's a fake that passes once it waits; it's expected, and note it.
4. **The phone, 375×812 touch:** the board fits, nothing behind it is clickable, no keyboard pops up on open, and the Save row works.
5. **Keyboard-only,** from a skill to the saved entry and Esc out, with focus back on the page. Reduced motion: fades only.
6. **The network** on a fresh load: no `/api/skills/*` call until the first shot; then exactly one `POST /api/skills/run`; the GET at game over; the POST on Save.
7. **Cleanup:** `node --env-file=.env.local scripts/scoreboard.mjs clear --env development`, and `list` shows it empty. `git status` shows only intended files.

## Stop conditions / open questions (for Phill)

- **T10:** stop before pushing. Phill tries it locally and approves the PR text.
- **The filter blocks a must-pass name or place** (§5) and the library's whitelist can't fix it: stop and show Phill the cases.
- **New copy:** anything beyond §2 (including its three new strings) → stop.
- **Upstash:** if `.env.local`'s Upstash vars are missing or the DB doesn't answer, stop (it's shared with production; don't create a new DB).
- **A real run fails the bounds** in acceptance (2): that's a bug in §5's numbers. Fix the formula from the game's own timing, not by widening the slack blindly, and note it here.
- **The wizard chat open behind the board:** WizardChat's capture-phase Esc stops propagation, so one Esc may close both the chat and the board (the browser's `cancel` still runs). That's acceptable, and noted here. Stop only if either one ends up stuck.
- **Vercel:** no env changes are needed (no new secret). Previews write `sb:preview:*`.
