# Skills section: the Skill blaster (v1.8.0)

## Context

### What exists (v1.7.0, master d2765a1, branch `feat/skills-section`)
- The home page's Skills section is `src/components/SkillsSection.tsx` + `SkillCategory.tsx` + `SkillChip.tsx` (click-to-explode chips with particles) + `SkillScore.tsx` (a score counter that portals to `<body>`), reading `src/data/skills.json` (three categories). `skills.json` also feeds the Shroom Wizard's prompt (`src/lib/wizard-prompt.ts`, `{{SKILLS_JSON}}`) and the JSON-LD's `knowsAbout` (`src/lib/structured-data.ts`, the "Technical Skills" list). Tests that touch it: `skills-section`, `particle-burst`, `data-architecture`, `structured-data`, `wizard-prompt`, `integration`, `navigation(-extended)` (the `#skills` anchor).
- The site's one music player (`MusicPlayer.tsx` + `useAudioPlayer.ts`) registers itself in `src/lib/site-music.ts` as `{ getSource, isPlaying, toggle, open }`. Its `AudioContext` is created on the first play (`initializeAudioContext`); nothing else may make a second `<audio>` or call `createMediaElementSource`.
- PR #43 (merged) made the 3D resume's sounds config-driven (`SFX_CONFIG`) with CC0 recordings in `public/resume/sfx/`. That's the pattern to follow here.

### What we're building (designed with Phill over six mockup rounds, 2026-10-19/20; all his calls)
- **The section looks like content; a click reveals the game.** At rest it's the round 1 redesign Phill loved: the header, the AI skills in a glass panel with a note each, the other groups as quiet lines of words. Every skill is a `<button>` styled as text, so the list stays readable for recruiters, search and screen readers. Words lean toward a fine pointer, like magnets. There's no Play button and no game window.
- **The first click on a skill starts the Skill blaster:**
  - **The shot:** a laser, the word bursts into letters that snap home, and a 172 BPM liquid drum and bass beat starts.
  - **Waves 1–2, whack-a-mole:** skills light up with a closing ring as the timer.
  - **Wave 3, the drop:** a riser, a one-beat breath, then the full two-step beat. From here red skills shoot back (Area 51 style: bolt, crack, red flash, shake, 5 health). Elites take 3 hits; gold is worth 500.
  - **The beat** builds each wave and drops at wave 3.
  - **Game over:** score and best, with a link to numberslayers.com.
- **Every pitched note comes from a hit.** The drums are the only part that plays by itself. Each group is a band part, and what lights up is chosen musically (the "conductor"):

  | Group | Part |
  |---|---|
  | Cloud | a new chord (12 chords in D minor) |
  | Backend | the bass (a sine with drive, an octave down, gliding) |
  | AI | the lead (squares, a slow filter swell, wide late vibrato) |
  | Frontend | an arpeggio |
  | Quality | bleeps |
  | Product | FM bells |
  | Music & more | vocal chops |

  - **The mix:** everything goes through a ping-pong delay and a long reverb, pumping on the kick.
  - **The band** is the parts heard in the last two bars; the multiplier is its size.
- **One screen.** When the game starts, the section tightens to fit the screen: the header and AI notes hide, the type scales down a little, and the words slide into place. On phones and short windows, groups fold to "HEADING · n" and take turns opening each wave. It all goes back when the game ends.
- **The sounds are Phill's.** He tuned them by ear in the **Sound lab** (`docs/design/sound-lab/`, a static design tool). His three patches are baked into the reference engine's defaults (`docs/design/skills-game/round6/synth.js`):
  - **Bass, lead and vox** retuned.
  - **The ride:** a recorded K Zildjian cut to 1.7 s.
  - **The crash:** a recorded Meinl Byzance 18″, darker and pitched up.
  - **The riser:** a recorded "Percussive" one.
  - **The boom:** a recorded "Bass drop", pitched up 1.4×.

  The recordings are CC0, from Freesound. The site ships exactly that sound.

### Rejected (don't rediscover)
- **Opt-in games** behind a Play button (round 1: Skill Breaker, Type Invaders). Phill: "just another game they have to opt into".
- **Round 2 ideas on their own:** live skills, alchemy combos, magnets alone, the Micro Clown unlock.
- **Round 3:** the loop pedal and the Simon-style "trading fours".
- **Number Slayers' track in the game.** Its notes clash; the beat is generated instead.
- **Auto-playing chords and bass** (round 5): "kind of cheesy".
- **Guitar sounds.**
- **Synthesized ride cymbals:** "all pretty ugly".
- **A "your track" replay at game over**, and **shooting in tempo** ("too hard": hits are quantized for you).
- **A top-down/Vampire Survivors shooter:** it needs a game window. The site already has Play mode in the 3D resume, and numberslayers.com is the real thing.
- **The look:** a pixel font, chip walls, boxy cards, square corner brackets.
- **The Number Slayers sound packs:** paid licenses, and this repo is public.

## Binding — do not redesign

### 1. The mockup is the visual, interaction and sound contract
`docs/design/skills-game/round6/blaster-synth.html` + `blaster-synth.js` (the game) + `synth.js` (the sound engine). The rest state's markup and styles come from `round2/base.js` (`SECTION2.mount`), `skills.css`, `round2/base.css` and `../experience-refresh/round2/hud.css` (tokens).

Serve the repo root with `python3 -m http.server 8765` and keep `http://127.0.0.1:8765/docs/design/skills-game/round6/blaster-synth.html` open next to the real page. Port faithfully: markup, spacing, type, colours, glows, every effect, every timing and every number in `blaster-synth.js` and `synth.js`. Where this plan is silent, the mockup's code is the spec.

**Port all of this:**
- **Rest**
  - The section markup (§3 copy).
  - Dots between words, never at the end of a line (`markLineEnds`, layout reads on render/resize only).
  - The magnet lean: fine pointers only, never with reduced motion; a rAF only while the pointer moves; measured outside rAF.
- **The shot**
  - The reticle cursor while playing.
  - The laser beam from the bottom.
  - Letters keyframed out and snapped home (WAAPI).
  - Sparks, the shock ring, bloom on enemies, floating "+points ×mult".
  - The graze (an unlit word shakes and plays its part softly).
- **The game**
  - Waves (`WAVES`, `waveCfg`, `planFor`; the first enemy comes third in wave 3).
  - Kinds and points (`KIND`), elites' shields (+50), gold.
  - Rings that close as the timer; enemies aim, go hot at 70% of their life and fire on a beat.
  - The bolt, crack and vignette, shake.
  - Health (5, +1 per wave clear, a 250×wave bonus).
  - Banners.
  - Game over (best score in `localStorage['skill-blaster-best']`, then the list again after 12 s).
  - Pausing:
    - after 5 s without a shot (9 s by keyboard), and when scrolled offscreen;
    - the readout and arena leave 6 s after a pause;
    - ✕ and Esc stop.
- **The readout** (sticky bottom-left of the section):
  - mute and stop;
  - score with ×mult;
  - wave;
  - health;
  - the band pips;
  - a status line (important messages hold 1.8 s);
  - the Number Slayers link at game over.
- **The music** (`synth.js` + the clock in `blaster-synth.js`):
  - 172 BPM. The 25 ms look-ahead scheduler runs only while playing.
  - The beat per wave (`BEATS`); fills; the drop at wave 3 (riser over 2 bars, a one-beat breath, crash + boom).
  - Hits quantized (chords, bass and vox to the next 8th; the rest to the next 16th).
  - The conductor (`need()`), the band (2 bars, `drawBand` on each beat), headings that glow in their part's colour.
  - Enemy kill = crash (an elite: a snare fill first); a hit taken = a lowpass dip + the drums skip 2 beats; game over = tape stop.
  - The site's music is paused at start and resumed at stop.
- **One screen** (`fitArena`, `armArena`, `restage`, `arenaOff`, FLIP with `composite: 'add'`):
  - **Desktop:** `--fit` 1 → 0.76.
  - **Phones and short windows:** staged folding with a rotating core group (cloud on the drop).
  - Refit on resize. On stop, the section's top stays put when it's on screen.
- **Keyboard:** Enter/Space shoots the focused skill; L jumps focus to the oldest lit skill; Esc stops. Keyboard play gets 1.6× the time.
- **The live region:** polite and throttled (§5).

**Not to port (mockup chrome):**
- the mock bar: its Reduced motion checkbox (the site uses the OS setting), the Intensity select (ship **Arcade**, the default; drop the setting), "Jump to wave 3" (dev handle only), and the Sound lab link;
- `.mock-note`;
- the `SITE_MUSIC` stand-in and its ♫ button (use the real player, §4);
- `window.__bl` (a dev-only `window.__skills` instead).

**Site specifics:**
- **The nav:** the arena's top offset (`barH`) is the sticky `<header>`'s height (the mock bar's role).
- **Screen-wide effects** (`.bl-screen`: beams, bolts, cracks, banners, the vignette) are appended to `document.body`. Filters on `#shroom-target` break `position: fixed` (CLAUDE.md gotcha).
- **The wizard** sits bottom-left (about 120×150 px) when summoned; the summon and music buttons sit bottom-right. The readout must not end up under any of them. At 1280 and 375, check it with the wizard summoned. If it collides, keep the readout's look and move it (e.g. centre it while the wizard is out). If that isn't clean, stop and ask (Stop conditions).

### 2. The sound: `synth.js` at its defaults, exactly
The site's engine (`src/lib/skills/synth.ts`) is a TypeScript port of `docs/design/skills-game/round6/synth.js`'s `create()`: same graph, instruments, drums, harmony, hits, pump, beat and recorded sets. Every setting value comes from `SKILL_SYNTH_CONFIG` (`src/lib/skills/synthConfig.ts`), which must deep-equal `SKILL_SYNTH.defaults()` from `synth.js`; a Jest test proves it.

The lab's schema (labels, ranges) stays in `synth.js`; don't ship it. Recorded sets ship only what's picked, each with its synth fallback when it can't load:

| Kind | Shipped set | Files (CC0, from `docs/design/sound-lab/audio/`) | Fallback |
|---|---|---|---|
| ride | `k` | `ride-k.mp3` | `metal` |
| crash | `meinl18` | `crash-meinl18-1.mp3` … `crash-meinl18-4.mp3` (soft 1–2, hard 3–4) | `synth` |
| riser | `perc` | `riser-perc.mp3` | `synth` |
| impact (boom) | `bassdrop` | `boom-bassdrop.mp3` | `synth` |

- **Where the files go:** `public/skills/sfx/`, with a `CREDITS.md` built from the rows of `docs/design/sound-lab/audio/CREDITS.md`, about 370 KB in all.
- **When they load:** fetched 400 ms after the engine starts (never on the first shot's frame).
- **Matching loudness:** each set is matched over its `norm` window. Keep the gains: `CRASH_G` 0.3, `BOOM_G` 0.48, `RISER_G` 0.12, the ride's 0.055.
- **The engine's own lessons** (from round 6's refactor, proven by offline renders):
  - The delays are `createDelay(1)`; `createDelay(2)` was not transparent.
  - The reverb's pre-delay is only routed in when it's > 0; a 0 s DelayNode isn't a wire.
  - Unison voices mix at `√(2/n)`.
  - Settings snap to their step: a fractional octave made NaN frequencies.

### 3. Copy and data (exact)
`src/data/skills.ts` = `docs/design/skills-game/skills.js`:
- **headline:** "AI first. Full stack."
- **lede:** "What I build with, agents and LLM features first, then the web, mobile and cloud stack under them."
- **the seven groups in order:** AI (featured; caption "Agents, tools and LLM features in production"; 16 skills each with its `note`), Frontend & mobile (15), Backend & data (14), Cloud & DevOps (12), Quality & security (10), Product (8), Music & more (6). 81 skills in all.

Drop `power` and `POWERS` (round 1's breaker only). Employer SaaS stays generic ("SSO / OIDC", "Feature flags"). Add nothing.

The section's eyebrow is the `h2` **Skills** (`id="skills-h"`); the section keeps `id="skills"` (the nav's `#skills`) and `aria-labelledby="skills-h"`. The game's words are the mockup's, verbatim (status lines, banners, live-region sentences, the HUD's aria-labels).

### 4. The site's player shares its audio graph
`SiteMusic` gains:
- `context(): AudioContext | null`: the player's context, created on first call (only ever called from a click);
- `pause(): void`;
- `play(): void`: resume the current track;
- `onChange(cb: (playing: boolean) => void): () => void`: told when the player starts or stops; returns an unsubscribe.

The game creates its engine on `getSiteMusic()?.context()`. Only if no player is registered (tests) does it fall back to its own `AudioContext`. When the game starts it pauses the site's music if it was playing; it calls `play()` when it stops. If the visitor presses play on the site's player mid-game, the game hears it through `onChange` and pauses ("Paused · the music player is on"); one track at a time. Sound only ever starts on a click.

### 5. Accessibility, performance, sound (from the handoff; binding)
- **Accessibility:** WCAG 2.1 AA. The skills stay text: buttons with their names; the AI notes are part of the name's button. Keyboard access, visible focus, and ≥ 44 px targets on coarse pointers (in the arena too).
- **Reduced motion:** `prefers-reduced-motion` stops everything that moves by itself. Rings dim instead of closing; no letters, beam, shake or lean; points sit still and fade; no FLIP (the arena just appears).
- **The live region** (polite): what started, waves, hits as "{name}. {score} points." throttled to ~1.3 s apart, pauses, game over. The HUD's visible numbers are `aria-hidden`.
- **Performance:**
  - no React state per animation frame (the game is imperative DOM, like the 3D resume);
  - no layout reads inside rAF;
  - an IntersectionObserver pauses the game offscreen;
  - **lazy-load:** the game, its engine and its CSS are one chunk, `import()`ed on the first click (prefetched when the section nears the viewport), and the recordings come after that. None of it is in the initial bundle.
- **Sound:** through the site's one player and audio graph (§4).

## Task checklist

Order matters as written. T5 needs T1. T6 needs T5. T7 needs T3–T6. T8 needs T2, T3 and T7. T9 needs T7.

- [x] **T0: baseline.** On `feat/skills-section`, which is already fast-forwarded to master and holds the design + this plan in one commit, run the four gates. Record them here.
  - **2026-10-20, at 4c929e1 (v1.7.0):**
    - `npx tsc --noEmit`: exit 0.
    - `npm run lint`: exit 0, zero warnings.
    - `npx jest --no-watchman`: 58 suites, 644 tests passed (6.5 s).
    - `npm run build`: exit 0 (Next 16.4.0 Turbopack, 13 static pages).
    - The baseline for T11: Lighthouse accessibility on `/` (production build, Lighthouse's default mobile run) = **100**. The only audit below 1 is `label-content-name-mismatch`, which has no weight in the score.
- [x] **T1: `src/data/skills.ts` and its consumers.** Per Binding §3:
  - Export `SKILLS` (headline, lede, groups `{ id, name, featured?, caption?, skills: { name, note? }[] }`) and a `skillCount`.
  - **The Wizard:** `wizard-prompt.ts`'s `{{SKILLS_JSON}}` becomes the groups as `{ group, skills: [name or "name: note"] }`.
  - **JSON-LD:** `structured-data.ts`'s `knowsAbout` becomes the skill names of the ai, frontend, backend, cloud and quality groups.
  - **Delete** `skills.json` and the `SkillCategory` type if unused.
  - **Tests:**
    - new `skills-data.test.ts`: 81 skills; the 7 groups in order with the counts above; every AI skill has a note and no other has one; names unique; "SSO / OIDC" and "Feature flags" present;
    - update `data-architecture`, `structured-data` and `wizard-prompt`: the prompt contains "MCP servers" and "a person confirms every write".
  - **Done 2026-10-20:** `skills.ts` matches `skills.js` exactly, minus `power` (checked with a script that loads both). Until T5 rewrites it, the old section reads `SKILLS` mapped to its old `{ category, skills }` shape. `skills-section` and `integration` now expect the seven group headings instead of the old three categories. `SKILLS.groups` mapped to `{ group, skills }` in the Wizard's prompt; `TECH_GROUPS` for the JSON-LD. Verification: `npx jest --no-watchman skills-data data-architecture structured-data wizard-prompt skills-section integration` passed (8 suites, 81 tests); `npx tsc --noEmit` exit 0; eslint exit 0 on the touched files.
- [x] **T2: `SiteMusic.context()`, `pause()`, `play()`, `onChange()`.** Per Binding §4:
  - `useAudioPlayer` exposes `getAudioContext()`, which initializes if needed and returns the context.
  - `MusicPlayer` registers the four via refs, like `toggle`; `onChange` listeners are called from an effect on `isPlaying`.
  - **Tests** (in `site-music.test.tsx` or the music tests, with the existing AudioContext mocks): `context()` returns the player's one context and creates no second `createMediaElementSource`; `pause()`/`play()` drive the player; an `onChange` listener hears play and pause, and stops hearing them after its unsubscribe.
  - **Done 2026-10-20:** `onChange` fires only on a change, not on mount. The three tests that fake a `SiteMusic` (experience-section, jelly-resume-canvas, jelly-play-hud) got the four new no-op members. Verification: `npx jest --no-watchman site-music music-` passed (10 suites, 159 tests); the faked-player suites passed too (13 suites, 224 tests); `npx tsc --noEmit` exit 0; eslint exit 0.
- [x] **T3: the engine.**
  - `src/lib/skills/synth.ts` (`createSynth(ac, config = SKILL_SYNTH_CONFIG)`, the constants, `CHORDS`, `PARTS`, `ON_8TH`, `BEATS`) and `src/lib/skills/synthConfig.ts`, per Binding §2.
  - **Generate `synthConfig.ts`, don't type it:** write `docs/design/sound-lab/tools/bake-skills-config.mjs`. It loads `round6/synth.js` in Node with a stub `window` and writes `synthConfig.ts` from `defaults()`, typed and frozen, with a header saying it's generated and how. Run it.
  - **The recordings:** copy the files in the §2 table to `public/skills/sfx/` with `CREDITS.md`.
  - **Tests** (`skills-synth.test.ts`, a fake AudioContext like `jelly-sfx.test.ts`):
    - the config deep-equals `require('../../docs/design/skills-game/round6/synth.js')`'s `window.SKILL_SYNTH.defaults()`;
    - `inChord`/`at01`;
    - the chord timeline;
    - a Cloud hit sets the chord and other hits snap to it (note choice per group, per `HIT`);
    - recorded sets fall back to the synth when `fetch` fails.
  - **Done 2026-10-20:**
    - **What changed in the port:**
      - **Lab-only parts left out:** the schema, `clean`/`setPatch`/`diff` and the room cache (the config is fixed).
      - **Pre-delay:** the node is only made when `rPre > 0`.
      - **Loading:** files decode with the promise form of `decodeAudioData`, so a failed decode isn't an unhandled rejection. With no `fetch`, the synth plays.
      - **Recorded sets:** only the four Phill picked are in `SETS`.
      - **The ride's level:** 0.055, now named `RIDE_G`.
      - **Unchanged:** the order of `Math.random` calls (the room, then the noise buffer), for T11's seeded comparison.
    - **Test fake:** a shared fake AudioContext in `src/__tests__/helpers/fakeAudio.ts`, for T7/T8.
    - **The checks:**
      - `npx jest --no-watchman skills-synth`: 18 passed.
      - Re-bake: `wrote src/lib/skills/synthConfig.ts: 9 parts, 189 settings`, and `git diff --exit-code` exit 0.
      - Parity break: `kickPitch` 150 → 151 failed the test (`- "kickPitch": 150, + "kickPitch": 151`); reverted, 18 passed.
      - `curl -sI localhost:3002/skills/sfx/ride-k.mp3`: `200 OK`, `Content-Type: audio/mpeg`, 75821 bytes.
      - `public/skills/sfx/`: 380 KB.
      - `npx tsc --noEmit` exit 0; eslint exit 0.
- [x] **T4: the rules as pure modules.** `src/lib/skills/rules.ts`, ported from `blaster-synth.js`:
  - `WAVES`/`waveCfg`/`planFor` (inject the RNG);
  - `KIND` points;
  - `need(group, state)` (the conductor's weights);
  - `levelFor`;
  - the band size;
  - the phone staging order (`core` per wave + the rotation in `fitArena`, as a pure function of `wave`).
  - **Tests** (`skills-rules.test.ts`): the wave table and the extrapolation past wave 5; the first enemy third in wave 3; the conductor's weights in each case; the staging order for waves 0–6 (cloud first on wave 3).
  - **Done 2026-10-20:** `rules.ts` also holds:
    - **constants:** `MAX_HP`, `FIRST_FOE_WAVE`, `HEARD_BARS`, `ORDER`, `SHIELD_PTS`;
    - **helpers:** `clearBonus`, `isFoe`, `lifeFor` (the 1.6× keyboard time) and `pickWeighted` (`pickTarget`'s weighted pick, same RNG order).
    - **The best-score key:** the mockup stores it as `skill-blaster-band-best`, Binding §1 says `skill-blaster-best`, and the plan's key wins (T7).
    - **Verification:** `npx jest --no-watchman skills-rules` 16 passed (it failed first with `Cannot find module`); `npx tsc --noEmit` exit 0; eslint exit 0.
- [x] **T5: the section at rest.**
  - **Rewrite `SkillsSection.tsx`** from `skills.ts` to the mockup's rest markup: header, AI glass panel (each skill a button with name + note), the groups (h3 + a list of buttons with dots), every button `type="button" data-skill data-group`.
  - **Styles:** `src/components/skills/Skills.module.css`, ported from `skills.css` + `round2/base.css` + the round 6 static rules (tokens mapped to the site's, as the Experience section did).
  - **Line ends:** a client effect marks them on render and resize.
  - **Delete** `SkillCategory.tsx`, `SkillChip.tsx`, `SkillScore.tsx`, their CSS if any, and `particle-burst.test.tsx`.
  - **Rewrite `skills-section.test.tsx`:** region named Skills with `id="skills"`; the h2; 81 buttons named by the skill (the AI ones' names include the note); 7 group headings; dots `aria-hidden`.
  - **Visual:** match the mockup's rest state at 1280 and 375.
  - **Done 2026-10-20:**
    - **The markup:** `SkillsSection.tsx` is a server component.
      - **Line ends:** `LineEnds.tsx` is a tiny client island running `markLineEnds` (`data-eol`, on render, when the fonts are in, and 120 ms after a resize). The pure function is named `markLineEnds.ts`, not `lineEnds.ts`: on macOS's case-insensitive disk that name shadowed `LineEnds.tsx`.
      - **JS hooks for the game:** `data-skill`/`data-group` on each skill, `data-sk-group` on each group's box, `data-name` on an AI skill's name, `data-words` on a group's list, `data-sk-list`, and `data-sk-live` on the polite live region.
      - **The AI buttons' names:** a space text node sits between name and note, so the accessible name is "name note" in every engine (a grid ignores it visually).
      - **The AI list:** `aria-labelledby` its heading, like the other groups.
    - **The header:** tokens and header classes as in the Experience section (`--magenta` = the site's secondary; the headline is `var(--ink)` + `neon-text-purple`), so the two sections match.
    - **Measured against the mockup** (`#skills` top to h2, title, lede, AI panel, first group heading): identical at 1280×800 (128/155/244/370/920 px) and 375×812 (72/99/197/320/1557 px).
      - **Height:** the section is 98 px shorter than the mockup's, because the mockup's hidden readout already takes space at rest (`visibility: hidden`); the readout comes in T7.
      - **At 375:** `scrollWidth` 375 = `innerWidth` 375, and every skill button is ≥ 44 px (coarse pointer).
      - **At 1280:** fine-pointer words are 34 px tall, as in the mockup.
    - **Tests and gates:** `npx jest --no-watchman skills-section a11y landmarks integration navigation` passed (8 suites, 62 tests); `npx tsc --noEmit` exit 0; `npm run lint` exit 0.
- [x] **T6: the lean and the lazy start** (`src/components/skills/SkillsPlay.tsx`, a client island inside the section):
  - The magnet lean per Binding §1.
  - Prefetch the game chunk with an IntersectionObserver (rootMargin ~600px) or on the first pointerover/focus in the section.
  - **On the first activation of a skill:** get the audio context synchronously in the click handler (`getSiteMusic()?.context() ?? new AudioContext()`, then `resume()`), then `await import('@/lib/skills/blaster')` and start it with that button and the click's point (keyboard: the button's centre).
  - **Later clicks** go to the running game.
  - **Test:** clicking a skill calls the mocked module's start with that skill; Enter on a focused skill does too.
  - **Done 2026-10-20:**
    - **The lean:** `src/lib/skills/lean.ts` (`createLean`), ported from the mockup's magnets.
      - **Measuring:** the words are measured on the pointer's first move after it enters the section, or after a resize, never in the frame. `measure()` is exposed for the game's reflows.
      - **The game:** `labelOf` is shared with it.
    - **The island:** `SkillsPlay.tsx` does four things:
      - prefetches `import('@/lib/skills/blaster')` (IO with `rootMargin: 600px 0px`, or on the first `pointerover`/`focusin`);
      - on the first skill click, makes and resumes the AudioContext inside the click;
      - then imports the game and runs `createBlaster({ section, ac, lean }).shoot(shot)`;
      - forwards every later click in the section to `shoot`, with `skill: null` for a shot at nothing.
    - **Held keys:** a held Enter or Space doesn't repeat.
    - **`blaster.ts` for now:** it only holds the API (`Shot`, `BlasterOptions`, `Blaster`); T7 fills it.
    - **Verification:**
      - `npx jest --no-watchman skills-play skills-section` passed (13 tests).
      - A test trap, noted in the test: `toMatchObject` on DOM nodes walks React's fiber tree and hangs Jest at 99% CPU, so DOM nodes are compared with `toBe`.
      - `npx tsc --noEmit` exit 0; `npm run lint` exit 0.
    - **Browser** (dev server, 1280×800, fresh contexts, `/api/wizard/chat` stubbed):
      - **The chunk:** no game JS or audio is requested at the top of the page. `src_lib_skills_blaster_ts_….js` arrives once the section is within 600 px, or right away on a load at `#skills`.
      - **The lean:** a mouse near Docker leans 2 words (`translate3d(1.43px, 0.55px, 0px) rotate(1.43deg) scale(1.017)`), and none are left leaning once the pointer leaves.
      - **Reduced motion:** 0 words lean and 0 animations run.
    - **Noted for T11:** a React hydration-mismatch error appears only with reduced motion, from `AnimatedSection` (framer-motion `opacity`/`transform` styles in About, Projects, Contact and the footer). That code isn't touched here; T11 compares it with master.
- [x] **T7: the game, core.** `src/lib/skills/blaster.ts` + `src/lib/skills/blaster.css` (the `bl-*` classes).
  - **Verify first with context7:** importing global CSS from a lazily imported module in the App Router. If that's not supported, inject the stylesheet from the module.
  - **Port everything in Binding §1 except the music and the arena:** shots and effects, waves, kinds, enemies, health, banners, the readout, game over, best score, idle/offscreen pause, stop, keyboard, the live region, reduced motion.
  - `window.__skills` in development only (`process.env.NODE_ENV !== 'production'`): `G`, `startWave`, `stop`, `jumpToDrop()`, `meter()`.
  - **Tests:** the pure parts are in T4. For the runtime, write a smoke test in jsdom with a fake engine: start → a lit target after the first bar; Esc stops; the live region speaks.
  - **Done 2026-10-20:**
    - **The CSS question:** context7 is behind an auth step here, so I read the docs Next ships in `node_modules/next/dist/docs/` (16.4.0) instead. They allow global CSS from any app component but don't cover a lazily imported module. So I checked it on a production build:
      - `blaster.css` becomes its own file (`2--oa3osb91vt.css`), not in the initial HTML;
      - it arrives with the game chunk (prefetched near the section);
      - its 18 rules apply after the click.
      - No stylesheet injection needed.
    - **Seams for T8 and T9:** the music (`partHit`, `SFX`, `MUS`, `handOff`/`handBack`, the conductor's `musicState().on`) and the arena (`armArena`, `arenaOff`, `restage`) are no-op seams.
    - **The clock** (`M.zero`, bars, `onGrid`) runs on the audio clock already, so waves start on a bar and enemies fire on a beat.
    - **The dev handle:** `window.__skills` (`G`, `M`, `keys`, `ac`, `startWave`, `stop`, `jumpToDrop()`, `meter()`) is stripped from the production build (checked: `undefined`).
    - **The best score:** stored under `skill-blaster-best`.
    - **The Shroom Wizard** (a site system the mockup didn't have):
      - no skill lights up under its box;
      - while it's out, the readout centres where that clears it (desktop: 449–831 px vs the wizard ≤ 311);
      - where it can't (phones), the wizard steps aside: Phill's call, 2026-10-20. `src/lib/wizard-aside.ts` carries it; `ShroomWizard3D` walks off and back with its walk, its canvas stops drawing while parked, and it leaves the tab order.
    - **Esc layering:** while the game runs, Esc stops it and calls `stopPropagation()`, so the wizard and shroom mode (window listeners) don't also go. An open chat or the 3D resume still catch Esc first.
    - **Tests:** `skills-blaster.test.tsx` (8): start, a lit skill after the first bar, a hit scores, Esc stops and says the score, Esc doesn't reach the wizard, the idle pause and resume, a graze scores nothing, the wizard steps aside and back. Plus `readoutClears` in `skills-rules`. `npx jest --no-watchman skills ShroomMode site-music`: 8 suites, 77 passed.
    - **Gates:** `npx tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run build` exit 0.
    - **Browser** (dev, 1280×800 mouse and 375×812 touch, `__skills`):
      - the full flow at both sizes: the first hit (letters, ring, +100), waves 1–4, red skills from wave 3, a hit taken (crack, vignette, health 4 of 5), game over (best saved, the Number Slayers link), the idle pause after 5 s, a shot resumes, Esc;
      - no effect elements left (the layer holds 0 elements, the screen only `bl-vig`); the live region says "Stopped. 200 points.";
      - the readout is clear of the music and summon buttons;
      - with the wizard summoned: centred at 1280; at 375 the wizard parks at left −300 and walks back to −41 after Esc.
- [x] **T8: the game's music.**
  - Wire the engine (T3) to the game:
    - the clock and drums per wave;
    - hits → `engine.hit` quantized;
    - the conductor in `pickTarget`;
    - the band (pips, lit and glowing headings);
    - enemy kill/clear/hurt/tape stop;
    - mute;
    - the site's music handed off and back (§4);
    - "Paused · the music player is on".
  - The recordings load after the first shot.
  - **Tests:** with fakes, the first shot creates the engine on the site player's context; the site's music is paused then resumed on stop; mute silences the master.
  - **Done 2026-10-20:**
    - **What's ported:** the round 6 music, into `blaster.ts`:
      - the engine on the given context, made with the first shot (`init`);
      - the 25 ms look-ahead scheduler (`tick`/`step`, only while `M.on`), the breath before the drop, fills, `M.muteUntil`;
      - `partHit` (8ths for chords, bass and vox, 16ths for the rest), `hear`/`bandSize` (2 bars), `glow`;
      - the conductor (`musicState().on`);
      - `SFX` (Arcade levels) and `MUS` (kill, clear, hurt, tape stop, the riser);
      - `drawBand` (pips, `bl-live` headings with `--pc`).
    - **Mute:** `E.setMuted`.
    - **The site's music:** `handOff`/`handBack` through `getSiteMusic()`. `onChange(true)` mid-game → "Paused · the music player is on".
    - **Dev handle:** gained `part`, `E`, `chordAt`, `active()`, `made()`, `drums(on)`, `meter()`.
    - **Tests:** `skills-blaster` music block (6):
      - the engine is made on the given context with the first shot;
      - the site's music pauses at start and comes back on Esc;
      - play mid-game pauses the game (nothing handed back);
      - mute → the master's gain targets 0;
      - a kick on the first 16th;
      - a lit hit joins the band (the Cloud heading `bl-live`).
    - **Results:** `npx jest --no-watchman skills site-music` (see the commit); `npx tsc --noEmit` exit 0; `npm run lint` exit 0.
    - **Browser** (dev, 1280×800 mouse and 375×812 touch, the site's song playing first):
      - the song pauses at the first shot (the context `running`);
      - the band's pips and a `bl-live` heading follow the parts;
      - the riser is placed (`dropBar` 15/16), the recorded sets are loaded before the drop (`samplesReady` true), and the drop is level 2 (meter RMS 0.035 desk, 0.025 phone);
      - a hit taken skips the drums (`muteUntil` +0.5 s); wave 4 is level 3 with the recorded ride ready;
      - game over: the tape stop, voices back to 0, the song handed back (playing again);
      - pressing play on the player mid-game → paused with "Paused · the music player is on";
      - at the end: 0 voices, no effect elements (layer 0, screen `bl-vig` only), no console errors.
- [ ] **T9: one screen.** The arena per Binding §1:
  - fit levels and staging;
  - FLIP from the clicked word (its letters fly from where it was);
  - restage on new waves on phones;
  - refit on resize (width changes and window resize);
  - arena off on stop, 6 s after a pause, and 12 s after game over;
  - `barH` from the sticky header.
  - **Check in the browser at 1280×800** (all 81 visible at fit 1), **1366×640** (fit 0.88), **1440×900**, **375×812 touch** (staged; the arena's height ≤ the viewport) and **390×844**.
- [ ] **T10: docs + version.**
  - **`CLAUDE.md`:**
    - Key Files: `src/data/skills.ts` (the Skills content and its test), `SkillsSection.tsx` + `components/skills/`, `src/lib/skills/` (`synth.ts`, `synthConfig.ts` generated by `bake-skills-config.mjs`, `rules.ts`, `blaster.ts` + `blaster.css`), `public/skills/sfx/` (credits), `SiteMusic.context/pause/play/onChange`, the Sound lab (`docs/design/sound-lab/`: how to serve it and how a patch gets baked: into `synth.js`'s defaults, then the bake script, then the parity test).
    - The gotcha line about `SkillScore` portalling: now `.bl-screen` on `<body>`.
  - **The Sound lab's lede:** the Skill blaster bank is the site's sound once baked.
  - **`package.json`:** 1.7.0 → **1.8.0**. All four gates green.
- [ ] **T11: the browser pass** on a production build (`npm run build && npm run start`), at 1280×800 (mouse) and 375×812 (touch), in a fresh browser context. Use `docs/design/skills-game/tools/shoot.mjs` with a step file ported from `tools/flow-steps.mjs` to `window.__skills`; stub `/api/wizard/chat`. Check, and record here:
  - the full flow (first shot starts the beat, waves 1–4, the drop at wave 3 with the recorded riser/crash/boom, a hit taken, game over + tape stop, idle pause, resume, Esc);
  - the site's music paused and handed back;
  - no voices left after stop (the dev handle's `active()`) and no leftover effect elements;
  - the arena fits (T9's sizes);
  - reduced motion;
  - keyboard only (Tab, Enter, L, Esc, visible focus);
  - the readout clear of the wizard and the music/summon buttons;
  - no game JS or audio files requested before the first click (the network log);
  - a Chrome trace on an emulated phone (390×844, 4× CPU) during waves 3–4: no task > 50 ms from the game, no layout inside rAF;
  - Lighthouse accessibility on `/` ≥ the T0 baseline;
  - no console errors;
  - the offline render comparison of `synth.ts` against `synth.js` (adapt `docs/design/sound-lab/tools/render-compare-skills.mjs`; the recorded kinds set to their synth fallbacks for the seeded comparison): every case ≤ −80 dB.
- [ ] **T12: PR text. STOP before pushing:** Phill tries it locally on desktop and his phone first. Write the PR description under this task: summary, decisions, the measurements, the test plan, screenshots to take.

## Per-task verification

| Command | What it runs |
|---|---|
| `npx jest --no-watchman <pattern>` | targeted Jest. Watchman isn't running on this machine, so plain `npx jest` fails. |
| `npx tsc --noEmit` | the typecheck |
| `npm run lint` | lint; must be zero warnings |
| `npm run build` | the production build |
| `python3 -m http.server 8765` (from the repo root) | serves the mockups |
| `npm run dev` | the dev server, on :3000; if that's taken, `npm run dev -- -p 3002` |

Run the full suite only in T0, T10 and T11.

| Task | Verification |
|---|---|
| T0 | The four gates pasted here, with their numbers (suites/tests). |
| T1 | `npx jest --no-watchman skills-data data-architecture structured-data wizard-prompt` green; `npx tsc --noEmit`. |
| T2 | `npx jest --no-watchman site-music music-` green. |
| T3 | `node docs/design/sound-lab/tools/bake-skills-config.mjs` regenerates an identical file (`git diff --exit-code src/lib/skills/synthConfig.ts`). `npx jest --no-watchman skills-synth` green. Break the parity once on purpose (change a value in `synthConfig.ts`), see it fail, revert. `curl -sI localhost:<port>/skills/sfx/ride-k.mp3` → 200 `audio/mpeg`. |
| T4 | `npx jest --no-watchman skills-rules` green. |
| T5 | `npx jest --no-watchman skills-section a11y landmarks integration navigation` green. Dev server next to the mockup: screenshots at 1280×800 and 375×812 of the rest state; at 375, `document.documentElement.scrollWidth === innerWidth`. |
| T6 | `npx jest --no-watchman skills-play` green. In the browser, the network panel shows the game chunk only after scrolling near or clicking; a fine pointer near a word makes it lean, and reduced motion makes it not lean. |
| T7–T9 | Their tests green. The browser flow at both sizes with the dev handle (screenshots: first hit, a wave, the drop, an enemy's shot landing, game over, the arena at 1280 and 375 staged). No console errors. |
| T10 | All four gates pasted. |
| T11 | The numbers recorded under T11. |

## Acceptance

On a production build (`npm run build && npm run start`), in a fresh browser context:
1. **`/` at 1280×800:** the Skills section at rest matches the mockup's rest state (header, AI glass panel with notes, quiet group lines, no dot at a line's end). Words lean toward the cursor.
2. **The first click on a skill** bursts it, starts the beat, and slides the section into the one-screen arena with all 81 skills visible. The game runs as the mockup does through wave 4, including the drop at wave 3 with the recorded riser, crash and boom, and enemies that shoot back.
3. **Every pitched note comes from a hit:**
   - a Cloud skill changes the chord;
   - the band pips and the multiplier follow the parts played;
   - the ride (recorded K Zildjian) comes in at wave 4.
4. **The site's music player:** if it was playing, it pauses at the first shot and resumes at stop. Pressing play mid-game pauses the game.
5. **At 375×812 touch:** groups fold and take turns per wave; 44 px targets; the arena fits the screen; no horizontal scroll.
6. **Keyboard only:** Tab to a skill, Enter shoots, L jumps to a lit skill, Esc stops; focus is always visible. The live region speaks the start, waves, hits (throttled), pauses and game over.
7. **Reduced motion:** nothing moves by itself (`document.getAnimations().filter(a => a.playState === 'running')` is empty at rest and shows no letter, beam or shake animations in play); rings dim instead of closing.
8. **Lazy loading:** no game JS or audio requested before the section nears the viewport or a click.
9. **The Wizard and JSON-LD:** the Wizard's prompt carries the new skills (tested). The JSON-LD `knowsAbout` lists the tech skills.
10. **Clean:** no console errors on `/` and `/resume`; all four gates green.

## Stop conditions / open questions (for Phill)

- **T12:** stop before pushing; Phill tries it on desktop and his phone and approves the PR text.
- **The readout and the wizard** (Binding §1): if no clean placement keeps the readout clear of the summoned wizard at some width, stop and show Phill the options.
  - **Resolved 2026-10-20:** no clean placement at 375 (the wizard's box is 192×144, the readout ~283 px wide). Phill picked "the wizard steps aside" over "the readout above the wizard", "the readout at the top" and "leave it". Desktop keeps the readout, centred while the wizard is out.
- **Anything the mockup can't decide** (a site system it didn't have, e.g. shroom mode's hue cycle over the game's colours, or the wizard chat's Esc): pick the behaviour that keeps both working and note it here. Stop if it changes what Phill sees or hears.
- **Freesound originals (not blocking):** the shipped ride/crash/riser/boom files were made from Freesound's ~180 kbps previews, because the original WAVs need a login. If Phill downloads the originals (their pages are in `public/skills/sfx/CREDITS.md`), re-encode them the same way (cut, fade, peak −1 dB, VBR mp3) and recheck the levels.
- **New copy or numbers:** none beyond the mockup's. If a sentence is needed that the mockup doesn't have, stop.
- **More sound tuning:** if Phill sends another Sound lab patch mid-loop, bake it into `synth.js`'s defaults first (the lab's source), then run the bake script; the parity test keeps them together.
