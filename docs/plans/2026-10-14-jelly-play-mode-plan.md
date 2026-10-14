# Jelly Resume: Play mode (the Career Climb)

Phill runs, jumps and smashes his way up his own 3D resume, Mario style. Designed with Phill on 2026-10-14; the UI contract is the mockup at `docs/design/jelly-resume/play-mode/mockup.html` (open it from the repo; file:// is fine).

## Context

### What exists (v1.4.0, PR #40 merged)

- **The engine** `src/lib/jelly/` (plain TS on one WebGL2 canvas; read CLAUDE.md and the "The cast" section of `docs/design/jelly-resume/HANDOFF.md` first). Words are jelly bodies: a 3-row particle lattice per word (`world.ts`: `Body`, `w.pos/vel/home`, `ROWS`, `PAD_TOP`, `PAD_X`), springs to home, states `HOME / LOOSE / RETURN / BURST / REFORM / INTRO / EATEN` (`config.ts`). `physics.ts` has `loosen`, `burst` (comet sparks + a shockwave that knocks the neighbors loose), `clickAt`, `healAll`. Bursts heal by themselves (burst 2.2 s + re-form 1.1 s). The music makes the words dance (`dance.ts` writes per-particle target offsets `w.off`), the sheet bends (`bend.ts`).
- **The cast** (`cast.ts`, `actors.ts`, `gltf.ts`): Phill (`public/resume/phill.glb`, the Number Slayers model, 24-bone Meshy rig, llamas welded to his arms) orbits the page at 3.4 units tall; with music he dances a shuffled round of clips. **Today every clip except `idle` and `die` counts as a dance.** `Pose` crossfades clips and holds the root's x/z at rest. The cast is its own lazy chunk, loaded once the page has printed (skipped with Save-Data).
- **The HUD** (`src/components/jelly/`): `JellyResumeCanvas.tsx` (engine, keys in the capture phase, Esc layering, a11y), `JellyHudBar.tsx`, `JellyFinder.tsx`, `JellyNavigator.tsx`, `hudStyles.ts` (`PANEL`, `BTN`, `ON`, `KEY`), `JellyCastTune.tsx` (dev-only `?tune` sliders).
- **Clips available:** the game model (`~/Desktop/dev/number-slayers/apps/web/public/models/glb/phill.glb`) has `idle, walk (1.13 s), turn, dance, attack (2.87 s), die`; `docs/design/jelly-resume/tools/actors.mjs` keeps only `idle/dance/die` today. The jump is `~/Downloads/Jumping.fbx` (Mixamo, FBX Binary, With Skin, 30 fps, 58 frames = 1.93 s; 53 MB, never commit it).

### The scale fact that shapes the game

The page is 8.5 × 11 world units (1 unit = 1 inch = 96 CSS px of the snapshot). Lines sit 0.17–0.19 units apart. In Play, Phill is **~0.5 units tall (about 3 lines)**, so lines can't be separate floors with headroom: he stands on one line with the next two behind him. Hence **every line is a one-way (jump-through) platform**: jump up through lines, land on tops, ↓ drops through. The level is ~17 Phills wide × 22 tall, so it plays like Donkey Kong / Ice Climber (vertical) more than a long horizontal run. The resume's shape is the terrain: ragged line ends are ledges, short lines are small platforms, the gap before a right-aligned date is a pit, section headings are taller drops, and the page edges drop into the void.

### What we're building (agreed with Phill; all his picks)

- **Career Climb.** Start on the **lowest line** (today: `EDUCATION · B.A. Jazz Studies`) and climb to the name at the top. The resume is newest-first, so climbing it bottom-up walks the career in order (1998 → now). **Checkpoints** are the dated job lines (1998, 2018, 2021, 2022, 2023, 2026); the **summit** is landing on the name. Falling off the page = a flail and a respawn at the last checkpoint. No lives, no game over. A timer (starts on the first move) and the best time (`localStorage`).
- **Impact coins:** the words the Finder's Impact chip finds (`#metrics` in `finder.ts`, 27 today: ~1.4M, 50K+, ~2.7×, 130K, 1.7M, #1, …) glow green. Smash one: +1 ("Impact 8/27").
- **Smash = an instant burst** into comet sparks, sprayed the way he punches (the strike of the `attack` clip), with ~60 ms hit-stop and a small camera shake; `burst()`'s shockwave knocks the neighbors loose (chain reactions for free).
- **Jelly feel for free:** landing squashes the word under him (platforms wobble), jumping up through lines nudges the words he passes, loose words are debris he shoves. Ground-pound (↓ in the air) smashes the word he lands on and drops him through.
- **Follow-cam** (Phill ~90 px tall on desktop, ~60 px on a phone), Mario-style: a dead zone, leading the way he faces, moving vertically when he lands on a new line. Yaw 0 with a slight tilt so the page still reads as 3D.
- **Sound:** small synthesized jump, land, smash, coin and summit sounds through `sfx.ts`, only while Sound is on (clicks outside Play stay silent, per Phill's earlier decision).
- **Music:** the words keep dancing (platforms bob to the beat). Standing still ~1.5 s with music on, he dances (from the rotation); any input stops it. The summit is a dance. `walk`, `attack` and `jumping` are excluded from the dance rotation **by name**.
- **Off while playing:** page gestures (rotate, pan, pinch, knock), the Finder, the navigator, the HUD bar, the black hole, Chaos/Burst/Heal. Shroom mode keeps working (it drops words: the floor crumbles). The shrimp stay in the backdrop.

### Clip decisions (and why)

- **Run** = the game's `walk`, sped up with his speed. If it looks like speed-walking at the feel check, Phill downloads a Mixamo "Running" clip (same pipeline as the jump). Don't fetch Mixamo yourself (it needs his login).
- **Jump** = Mixamo `jumping`, retargeted with `actors.mjs --dances <jumping.glb> --arms 1` (`--arms 1` keeps his idle arms: free arms fling the welded llamas and tear his poncho; already verified the retargeted jump lifts the hips correctly: 0.85→1.40 vs the source's 0.92→1.51). The clip has a crouch wind-up and a landing recovery, and a game jump must leave the ground the frame you press, so **the clip is scrubbed by the jump's state** (rising/apex/falling frames from vertical velocity; landing frames on touchdown; wind-up skipped). The clip **lifts his hips itself**; in the game the physics lifts him, so the root's height is **clamped to its standing height** while the jump plays (crouches still go down, the rise is cut) or the jump looks double-height.
- **Smash** = the strike window of the 2.87 s `attack` (a native clip, so the llamas move as in the game), played fast (~0.3 s).
- **Turn:** no `turn` clip; flip facing with a quick (~0.1 s) yaw turn.
- **Size:** the three clips go into `phill.glb` (a few tens of KB; budget below). No separate file.

### Rejected (don't rediscover)

- **Head-bonk smashing from below:** he's 3 lines tall, so his head is always inside the lines above.
- **Smash = knock the word loose into the void** (bursts when far): slower and softer than an instant burst. Phill picked the burst.
- **Free play only / a keyword hunt** as the goal: Phill picked the Career Climb (free play still happens: ignore the climb and smash).
- **Shrimp as stompable enemies:** later, not v1.
- **Gamepad, leaderboards (need a backend), tilt-to-run, a virtual joystick, tap-to-move:** later / no.
- **A separate animations-only GLB for Play:** the clips are small; one file.
- **R3F:** the engine is the approved plain-TS exception (CLAUDE.md).

## Binding — do not redesign

**The mockup** `docs/design/jelly-resume/play-mode/mockup.html` is the UI contract: six screens (desktop with the Play button, desktop playing, desktop summit, phone portrait, phone landscape, phone summit), a parts sheet, and numbered notes per screen. Match its layout, sizes, copy and behavior. Its Phill is a placeholder silhouette (in the build he's the 3D model) and its glows are CSS stand-ins for shader tints. Highlights:

- **Entry:** `🎮 Play (J)` first in the HUD bar (phones too), in the `.btn.play` look (the `ON` border/text + a soft glow + a faint fill). `aria-keyshortcuts="J"`, title "Play as Phill (J)". Always present: **Loading…** (`aria-busy`, a spinner) while Phill or the Play chunk is still loading, then Play starts by itself; **Play unavailable** (disabled, the title says why) if they fail. With Save-Data (the cast skipped), pressing Play loads it on demand.
- **Entrance:** he dives out of his orbit, shrinking from 3.4 to ~0.5 units, and lands on the start line with a jelly splat while the camera eases from the whole-page view to the play view (~0.8 s). **Exit:** he jumps off the page and grows back into his orbit; the camera eases back to the whole-page view (`resetView`). (The mockup's note says he lands on "Guitarist & Composer"; the start is the **lowest** line, `EDUCATION · B.A. Jazz Studies`, with the 1998 checkpoint three lines up.)
- **While playing:** the Finder, navigator and HUD bar fade out and go `inert`.
  - **Stats** (top-left, `PANEL`): time and Impact count in Press Start 2P (`font-pixel` / the site's pixel accent), coins in the site green `#00ff2b`, best time muted under them (desktop). Phones: one 44 px row (time + coins); landscape adds the current year.
  - **×** (top-right, same spot and look as the resume's ×): leaves Play, not the resume. `aria-label="Leave Play mode (Esc)"`. **Esc:** the first leaves Play, the second closes the resume.
  - **Climb meter** (right edge, glass backing): 1998 at the bottom to NOW at the top, ticks at the checkpoints at their true page heights (labels nudge apart where they crowd), lit once reached, a marker at his height. `aria-hidden`. Shown when the viewport is ≥ 560 px tall; phones get the slim one (ticks only + the current era by the marker); under 560 px tall, no meter (the stats show the year).
  - **Key legend** (bottom-center pill, desktop): `← → run · Space jump (hold: higher) · ↓ drop · in the air: pound · X smash · Esc leave`; fades ~4 s after the first move; `?` shows it again. Also A/D run, ↑/W jump, S drop, K smash.
  - **Checkpoint toast** (top-center; under the top row on phones): `✓ CHECKPOINT` tag + `2022 Software Engineer · Sessions` (the year in pixel type, then the line's words minus its date), ~2.5 s. A small cyan flag plants at the end of that title and the title glows briefly.
  - **Coins** glow green and pulse gently; a smash pops "+1 IMPACT" (rising and fading ~0.8 s), the count bumps; a collected coin re-forms plain.
  - **Desktop:** the site's ♫ FAB stays (P still plays/pauses).
- **Touch (coarse pointer):** pads over the game, glass at 50%, pressed = cyan.
  - Move pad bottom-left: ◀ ▶ 64 × 64, 8 px apart, 16 px from the edges plus `env(safe-area-inset-*)`; sliding between them without lifting switches direction.
  - Action pad bottom-right: **A** jump 72 × 72 (hold: higher), **B** smash 64 × 64, **▼** drop 56 × 44 (standing: drop through; in the air: ground-pound). Multi-touch (run + jump at once). `aria-label`s.
  - The site's ♫ FAB **hides while playing** (it sat under the thumbs) and a ♫ button (44 × 44, left of ×) plays/pauses the site's player (a remote, like P; still one player).
  - A touch hint above the pads on entering (`Hold ◀ ▶ to run · Ⓐ jump · Ⓑ smash · ▼ drop`), fading after the first moves.
  - The camera keeps him in the upper two-thirds, clear of the pads.
- **Summit:** landing on the name ends the run: the timer freezes (green), the name lights up, comet sparks fire up from it, he dances; the camera holds on the name offset so the card doesn't cover him. **Card** (`PANEL`, beside the name; on phones full-width with 16 px gutters, stacked 44 px buttons, pads hidden): `SUMMIT` (Audiowide), "1998 → now. You climbed the whole career.", TIME / IMPACT / BEST cells in pixel type, a green `NEW BEST!` tag when beaten; actions **↻ Play again (Enter)** (focused; drops him back at the bottom, the camera sweeps down, timer and coins reset, holes heal), **⤓ Resume PDF** (the HUD's download), **Back to the resume (Esc)** (= leave Play). A polite live region reads the result.
- **Falling off:** off a page edge → the die-clip flail into the nebula (~1 s) → he drops back in at the last checkpoint with a splat; the timer keeps running.
- **Reduced motion:** unchanged: the engine never loads, so no Play mode.
- **Announcements:** a polite live region for coins ("Impact 8 of 27", throttled to ~1 per 1.5 s), checkpoints and the summit.

**Starting values** (tunable at `/resume?tune` while playing; Phill fixes them at the feel check, T6). Put them in `config.ts` as a frozen `PLAY_CONFIG`:

| key | start | meaning |
|---|---|---|
| `size` | 0.5 | his height in Play (units) |
| `runSpeed` / `accel` / `decel` / `air` | 2.6 / 18 / 22 / 0.65 | units/s, units/s², units/s², air-control share |
| `jumpHeight` / `tapHeight` / `apexTime` | 1.0 / 0.45 / 0.36 | held jump apex, tapped apex (units), seconds to apex |
| `fallMul` / `maxFall` | 1.6 / 9 | gravity × while falling, terminal speed |
| `coyote` / `buffer` / `dropTime` | 0.1 / 0.12 / 0.22 | seconds |
| `poundSpeed` | 10 | ground-pound fall speed |
| `reach` / `strike` / `smashCooldown` | 0.42 / (find it) / 0.32 | strike box length ahead; the `attack` clip's strike window [a, b] s; s |
| `hitStop` / `shake` | 0.06 / 0.04 | s; camera shake amplitude (units, ~0.2 s decay) |
| `pxDesktop` / `pxPhone` | 90 / 60 | his on-screen height |
| `lookAhead` / `tilt` / `lean` | 0.6 / 0.08 / 0.06 | camera lead (units), tilt (rad), yaw lean toward his run direction |
| `squash` / `weight` / `wake` | 0.12 / 0.6 / 1.2 | landing impulse per unit/s of fall; standing push; push on words he passes through |
| `face` | 0.35 | how far he turns toward the camera from side-on (rad) |
| `idleDance` | 1.5 | seconds still (music on) before he dances |
| `runRate` | 1.6 | `walk` clip playback rate at full speed |

## Task checklist

Order matters: each task builds on the ones before it. One task ≈ one commit (the task + the plan's tick together).

- [x] **T0: branch + green baseline.** `git fetch origin && git switch -c feat/jelly-play-mode origin/master` (the local `feat/jelly-phill-orbit` is merged; `AGENTS.md` and `next-env.d.ts` are dev/build-touched and never committed). Run the four gates; record the results here. Commit this plan + `docs/design/jelly-resume/play-mode/mockup.html`.
  - *Done 2026-10-14:* branched off origin/master (3eaf334, upstream unset so nothing pushes to master by accident). Baseline: `npx tsc --noEmit` exit 0 · `npm run lint` exit 0, no warnings · `npx jest --no-watchman` 47 suites / 478 tests passed (6.4 s) · `npm run build` exit 0 (11 routes).

- [ ] **T1: the clips.** Copy the Blender converter into the repo as `docs/design/jelly-resume/tools/fbx2glb.py` (usage: `blender --background --python fbx2glb.py -- <in.fbx> <out.glb> <clip name>`; it does `read_factory_settings(use_empty=True)` → `import_scene.fbx` → renames the action(s) → `export_scene.gltf(export_format="GLB", export_animations=True, export_image_format="NONE", export_materials="NONE", export_force_sampling=True, export_frame_step=1)`; a working copy is at `/private/tmp/claude-501/-Users-phillipaelony/d6b60518-5a5b-441d-9027-b62f9fb61649/scratchpad/blend/fbx2glb.py` if it still exists; Blender is `/opt/homebrew/bin/blender`). In `actors.mjs`: keep `walk` and `attack` too (`keep = idle, dance, die, walk, attack`), and **name a file's only clip after the file** (one-line change: `const only = doc.getRoot().listAnimations().length === 1`, then `clip.getName() === 'dance' || only ? file : null`). Update its header (the commands, including `--dances …,<scratch>/jumping.glb`). Convert `~/Downloads/Jumping.fbx` → a scratch `jumping.glb`, then rebuild `public/resume/phill.glb` and `shrimp.glb` with the existing dances plus `jumping.glb`, `--arms 1` (run actors.mjs from a scratch copy with its own deps, per its header). Update `src/__tests__/jelly-cast.test.ts`'s clip list.

- [ ] **T2: Pose and the dance set.** In `cast.ts`, exclude Play clips from the rotation by name (`PLAY_CLIPS = walk, attack, jumping`; dances = every clip but idle, die and those). In `actors.ts` `Pose`: `seek(t)` (set the current clip's time) and `time`; a per-clip **root-lift clamp** (the root's height never above its standing height, taken from `idle` at t = 0; going below stays) applied while `jumping` plays. Find the `attack` strike window (the forward arm/llama joint's peak speed; confirm on a screenshot strip) and record it in `PLAY_CONFIG.strike`. Jest tests on the real `phill.glb`.

- [ ] **T3: the level from the snapshot** (`src/lib/jelly/platforms.ts`, pure functions, no GL). Cluster bodies into **visual lines** by the bottom of their boxes (`line.top − line.lh`), within 0.04 units (4 px): `line.top` is per word, and one line's words differ by a few px (`TimelyCare` 280 / `· virtual…` 281 / its date 282; a 20 px heading beside 16 px text). Today that's **47 lines**, at most 1 px apart inside a line, pitch ≥ 15.9 px. Words sorted by x. Each line's **ink top** (its tallest glyphs: from the words' spark samples, `ptLv`, as an offset below the lattice's top row; words' boxes include line-height padding, so standing on the box floats him a few pixels). **Surface query**: the highest solid surface under a foot span `[x − f, x + f]` at or below a height, following the words' current top-row lattice (they wobble, dance and bend; bilinear like `bilerp`), plus its z. **Solid** = `HOME`, or `RETURN` with strength ≥ 0.5; `LOOSE` and hidden states aren't. Also derive: the **start line** (lowest), the **summit line** (the name: the top line), **checkpoints** (lines with a right-aligned date range; year = its start year; climbing order, keep a line only if its year is greater than the last kept: today 1998, 2018, 2021, 2022, 2023, 2026; title = the line's words minus the date), and **coins** (the `#metrics` words via `finder.ts`). Jest tests on the real `public/resume/snapshot.json` (via `snapshotBodies` + `physicsSteps`, no atlas needed for the line structure; ink offsets can be a fixture).

- [ ] **T4: run and jump** (`src/lib/jelly/play.ts`, its own lazy chunk, `import('./play')` on the first Play). Engine API `engine.play`: `enter()`, `exit()`, `input` (a plain mutable `{ left, right, jump, down, smash }`, written by keys/pads, never React state), `state()` (for the HUD, read in `onFrame`), `onEvent(cb)`, `isOn()`. While playing: page pointer input is off (`attachInput`'s `enabled()`), the black hole is off, the Finder query is cleared. **The cast hands Phill over** (a drive hook: Play owns his position, rotation, size and clip; the cast keeps drawing him; `kickAll`/knocks skip him while driven). **Controller:** run with accel/decel and air control; variable jump (`jumpHeight`/`tapHeight`, `apexTime`, `fallMul`, `maxFall`), coyote time, jump buffer, one-way landing (land only when falling and the feet were above the surface last step), ↓ drop-through (`dropTime`). **His z** = the surface's z plus half his depth plus a margin (the page hides anything behind it). **Facing:** ±(π/2 − `face`), a ~0.1 s turn. **Clips:** idle; `walk` at `runRate` × speed; `jumping` scrubbed by state (rise/apex/fall from vy; landing frames on touchdown; wind-up skipped). **Jelly:** landing squash and standing weight on the top-row particles under his feet, the wake through lines he passes, loose words shoved; **never tear a word loose by standing or landing** (keep the push under the break distance: `breakDist` 0.45). **Camera:** zoom from `pxDesktop`/`pxPhone` (from the canvas height, recomputed on resize), look-ahead, vertical follow on landing (and directly when he leaves the view), yaw 0 + `tilt` + `lean`; the existing pan clamp keeps the page edges at the screen edges (Mario's level bounds). **Keys** in `JellyResumeCanvas.tsx` (capture phase, as today): J enters; in Play the map in Binding, M and P still work, everything else is ignored; Esc leaves Play (stopPropagation); window blur / tab hidden clears the input. The **Play button** in `JellyHudBar.tsx` (final look; Loading…/unavailable states can stay basic until T9). Dev-only `JellyPlayTune` sliders for `PLAY_CONFIG` at `?tune` (pattern: `JellyCastTune.tsx`; Copy → `PLAY_CONFIG`). Expose `play` on the dev `window.__jelly`. Basic enter/exit (snap is fine; T8 animates them).

- [ ] **T5: smash, ground-pound, falling off.** **Smash** (X/K): plays the strike window fast; on the strike frame, words whose current box overlaps the strike box (in front of him from hips to chest, `reach` ahead) get a velocity kick in the facing direction, then `burst()` (so the sparks spray that way; the shockwave stays on); `hitStop` freezes the controller and his pose; the camera shakes. Cooldown `smashCooldown`. **Ground-pound** (↓ in the air): fall at `poundSpeed`, burst the solid words under his feet on landing, keep falling through that line. **Falling off** (past a page edge, or below the page): the `die` flail ~1 s, then drop back in at the last checkpoint (or the start) with a splat.

- [ ] **T6: FEEL CHECK — STOP for Phill.** Leave a note under "Stop conditions" with how to try it: `npm run dev` → open the resume → 🎮 Play (or J) → `/resume?tune` for the sliders; Copy pastes `PLAY_CONFIG`. He decides: the feel (speeds, jump, camera, size), whether the sped-up walk reads as running (or he grabs a Mixamo "Running"), the smash reach. Apply his values and tick T6 only after his go.

- [ ] **T7: the game.** **Coins:** a per-body coin glow (a new per-vertex attribute next to `aHl`, green `#00ff2b`, gentle pulse; not the Finder highlight, which lifts words and dims the rest); smashing a coin (by any smash or pound) collects it (event + "+1 IMPACT" pop: DOM, projected once at the smash, CSS-animated); collected coins re-form plain. **Checkpoints:** reaching (standing on or above) a checkpoint line records it (event, the title glows briefly via `hlT`, the flag: a small DOM marker projected each frame in `onFrame`, mutating style only). **Summit:** landing on the name: the timer freezes, the name lights up, comet sparks fire up from it (launch copies of the name's sparks upward while the name stays lit and solid; if that needs a new particle path, keep it small), he plays a dance (from the rotation) and Play input stops. **Timer** starts on the first input; **best** in `localStorage` (`jelly-play-best`, ms; try/catch). **Play again:** heal everything, reset coins and timer, drop him back at the start from above. Jest tests for the state machine (coins, checkpoints in order, summit, best).

- [ ] **T8: entrance and exit.** Entrance: from wherever he is (orbit, knocked, eaten → take him back), a ~0.8 s dive arc to the start line while shrinking from his orbit size to `size`, a jelly splat on landing (a bigger squash), the camera easing from the whole-page view at the same time. Exit: a hop up and back toward his orbit spot while growing, the cast's orbit takes over; `resetView`. Play again: the camera sweeps down to the start. Instant exit (no animation) for a resume close or a lost context.

- [ ] **T9: the Play HUD** (`JellyPlayHud.tsx`; layout per the mockup): stats (time and coins written through refs in `onFrame`, ≤ 10×/s; never React state per frame), climb meter (full / slim / hidden by viewport height; marker moved in `onFrame`), key legend (fade + `?`), checkpoint toast, "+1 IMPACT" pops, the summit card (focus to Play again; Enter/Esc; NEW BEST!), the × behavior, the Finder/navigator/bar fade + `inert`, the polite live region (throttled coins, checkpoints, summit), the Play button's Loading…/unavailable states, `setUiInsets` for the play HUD. RTL tests: the Play button (label, `aria-keyshortcuts`, states), Esc layering (first Esc leaves Play, not the resume), the summit card's focus and buttons, the meter's breakpoints.

- [ ] **T10: touch.** `JellyTouchPads.tsx` (only for `(pointer: coarse)`, via `useMediaQuery`): the pads per Binding with pointer events (`setPointerCapture`; the move pad hit-tests ◀/▶ across the pad so a slide switches direction; `touch-action: none`, no callout/selection/context menu), multi-touch, pressed visuals by `data-` attributes or classes (no per-frame state). Hide the site's ♫ FAB while playing on touch (a class on `<html>`, e.g. `jelly-play-touch`, and a rule in `globals.css` against a class added to `MusicFAB`), the ♫ remote button (`getSiteMusic()?.toggle()`), the touch hint, the pad-aware framing (a bigger bottom inset). RTL tests: pads render only for coarse pointers, a pointerdown sets the input, the FAB class toggles.

- [ ] **T11: sounds.** `sfx.ts`: jump (a short rising blip), land (a soft thud scaled by fall speed), smash (a crunchy pop), coin (a bright two-note chime), summit (a short flourish), all synthesized (no files), all through `live()` (silent unless Sound is on). Init on the Play gesture.

- [ ] **T12: music and the edges.** Idle dance after `idleDance` s with music on (any input stops it); the summit dance. Shroom mode while playing (words drop: fine; nothing breaks). Resize and phone rotation mid-play (zoom recomputed, pads move). Tab hidden (input cleared, the timer doesn't count hidden time). Closing the resume while playing (route Back, or `close`) exits Play instantly first. A lost WebGL context while playing. Save-Data: Play loads the cast on demand. Play pressed before the cast loads → Loading… then it starts; the cast or Play chunk fails → Play unavailable. Phill knocked or eaten when Play is pressed. No console errors in any of these.

- [ ] **T13: performance** (production build, `npm run build && npm run start`, a fresh isolated browser context per run; count `DrawFrame` events). Desktop ≥ 110 fps; emulated phone (390 × 844, 4× CPU) ≥ 50 fps with no frame over 100 ms; while playing (run, jump through lines, 10 smashes, a ground-pound, music on) and while entering Play (the chunk loads). The Play chunk isn't in the engine's or the cast's chunk. Record the numbers here.

- [ ] **T14: docs + version.** `CLAUDE.md` (Key Files: `play.ts`, `platforms.ts`, the Play HUD and pads; the tune panel), `HANDOFF.md` (a "Play mode" section: what, files, decisions, measured), `actors.mjs`/`fbx2glb.py` headers. `package.json` 1.4.0 → **1.5.0**. All four gates green (the full Jest suite).

- [ ] **T15: PR text. STOP before pushing and ask Phill.** Write the PR title/body here (summary, what's in it, measurements, screenshots list, test plan, `🤖 Generated with [Claude Code](https://claude.com/claude-code)` at the end). On Phill's go only: `git push -u origin feat/jelly-play-mode` + `gh pr create --base master`.

## Per-task verification

All gates: `npx tsc --noEmit` · `npm run lint` (zero warnings) · `npx jest --no-watchman <changed test files>` (the full `npx jest --no-watchman` at T0, T14 and in Acceptance) · `npm run build` when dynamic imports change (T4, T13, T14).

Browser checks: `npm run dev` (port 3000; start it detached if it isn't running; restart stale servers freely), then the chrome-devtools MCP in an **isolated background tab** (`new_page` with `isolatedContext` and `background: true`). Read `list_console_messages` after every browser task. Drive Play from scripts through the dev-only `window.__jelly.play` (set `input.right = true`, wait, read `state()`), and take screenshots.

| Task | Prove it with |
|---|---|
| T0 | The four gates' output, recorded here. `git log --oneline -1` shows the plan + mockup commit on `feat/jelly-play-mode`. |
| T1 | `node` over the new `phill.glb` (the clip-listing snippet: parse the GLB JSON chunk) lists `idle, walk, dance, attack, die, zombie, human, garlic, lasagna, moose, jumping`. `phill.glb` ≤ **860 KB** (was 757 KB). The jest cast test passes. A screenshot strip of `jumping` at 0 / 0.5 / 1.0 / 1.5 s in the browser (via `__jelly.cast` and `pose.play('jumping')`): no flung llamas, no torn poncho. |
| T2 | Jest: the dance set has no `walk/attack/jumping/idle/die`; `seek` lands on the right sample; with the clamp, `jumping`'s root height ≤ the idle standing height at every sampled frame and < it in the crouch frames. The strike window is recorded with the screenshot strip. |
| T3 | Jest on the real snapshot: 47 lines; start line = the lowest (`B.A.` …), summit line = the name; checkpoint years `[1998, 2018, 2021, 2022, 2023, 2026]` with titles; 27 coins; the surface under a foot over a word = its line's ink top; over a gap wider than the foot = none; a `LOOSE` word isn't solid. |
| T4 | Browser: enter Play; `input.right` for 1 s → x advanced ≈ `runSpeed` (± 15%); a held jump's apex ≈ `jumpHeight` and a tapped one ≈ `tapHeight` (± 0.1); landing on a line puts his feet on its ink top (± 0.01, screenshot zoomed); ↓ drops him one line; jumping up through 5 lines lands on top; after 20 jumps no word near him went `LOOSE` from landings alone; the camera holds him at ~90 px tall (measure from his projected bounds) and leads his facing. The tune panel changes take effect live. Screenshots of running, mid-jump and landing. |
| T5 | Browser: a smash next to a known word bursts it (state `BURST`) and its sparks' mean velocity points his way; a coin among them is reported (event); a ground-pound from 3 lines up bursts the word below and he ends a line lower; walking off the page's left edge → flail → respawn at the start/last checkpoint. Screenshots. |
| T6 | Phill's go, and his `PLAY_CONFIG` pasted into `config.ts` (git diff). |
| T7 | Jest for the state machine. Browser: smash a coin → `Impact n/27` event and the glow gone after it re-forms; climb past the 1998 line → a checkpoint event with "1998"; a scripted climb to the name (teleport him near the top via `__jelly.play` and jump) → summit event with the time; `localStorage['jelly-play-best']` set; Play again resets coins/timer and puts him at the bottom. Screenshots of a glowing coin and the summit. |
| T8 | Screenshots at 0 / 0.3 / 0.6 / 1.0 s after Play and after leaving: he dives and shrinks / hops and grows, the camera eases (no pop); the cast's orbit resumes; enter → exit → enter ×3 without errors. |
| T9 | RTL tests pass. Browser screenshots at 1440 × 900 match the mockup's desktop screens (stats, meter, legend, toast, summit card). Keyboard only: J → play → ? → Esc leaves Play → Esc closes the resume. The live region's text after a coin, a checkpoint and the summit. |
| T10 | RTL tests pass. Emulated phone (390 × 844 and 844 × 390, touch): screenshots match the mockup's phone screens; scripted pointer events on the pads move him; holding ▶ and tapping A jumps forward; the site's ♫ FAB isn't visible while playing and is back after leaving; the ♫ remote toggles the player. |
| T11 | With Sound on, each event schedules a sound (spy on the `AudioContext` graph or the `sfx` calls in the browser); with Sound off, none. |
| T12 | Each edge case run in the browser with its observed result written here; no console errors. |
| T13 | The trace numbers recorded here; `npm run build` output; a grep showing a `play.ts`-only string is in a separate chunk from the engine's and the cast's. |
| T14 | `git diff` of the docs and `package.json`; all four gates green (full Jest). |
| T15 | The PR text here. **No push without Phill's go.** |

## Acceptance

After T14, on the **production build** (`npm run build && npm run start`) in a fresh isolated tab:
1. The resume opens exactly as before; the Play button is first in the HUD bar; nothing about Play loads until it's pressed (network log).
2. 🎮 Play: he dives off his orbit onto the bottom line; the HUD swaps to the Play HUD; the camera follows.
3. Run, jump through lines, drop, smash words and coins, ground-pound, fall off the side and respawn: all as specified; checkpoints toast in order 1998 → 2026; the meter tracks him.
4. Reach the name: summit card, dance, sparks, time and best; Play again; then leave with Esc (Play first, the resume on a second Esc).
5. Music on: the words dance under him; standing still he dances; the play clips never show up in his orbit dances after leaving.
6. Phone emulation (portrait and landscape, touch): pads, ♫ remote, FAB hidden while playing and back after, the summit card stacked.
7. Reduced motion: the plain `/resume` (no engine, no Play).
8. Desktop ≥ 110 fps; emulated phone ≥ 50 fps, no frame over 100 ms; no console errors; `public/` has no phone number or email.
9. The four gates are green, `git status` is clean (apart from `AGENTS.md`/`next-env.d.ts`), nothing is pushed.

## Stop conditions / open questions (only Phill can decide)

- **T6 feel check:** stop and wait for Phill's go and his `PLAY_CONFIG`.
- **Mixamo "Running":** if Phill wants it at T6, he downloads it (his Mixamo login); then rerun T1's pipeline with it as `running` and use it for the run.
- **`phill.glb` over 860 KB** after T1: stop with the sizes and options (e.g. drop a dance, resample harder); don't drop clips on your own.
- **The retargeted jump tears the poncho or flings the llamas** even with `--arms 1`: stop with screenshots.
- **Anything in the binding mockup that can't be built as drawn** (e.g. hiding the site's ♫ FAB on touch breaks the music player): stop and describe the options.
- **Performance budgets missed** after reasonable optimization: stop with the numbers and the trace's hot spots.
- **Push / PR (T15):** never push without Phill's explicit go. The repo is public.
- **Notes from the loop** (add below as they come up):
