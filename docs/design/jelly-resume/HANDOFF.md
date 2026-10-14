# Jelly Resume: design handoff

**Status (2026-10-13):** **ported to phillcodes.com** on the branch `feat/jelly-resume-site` (see "Ported to the site" below). The playground stays the design reference and the place to tune the look; the site's frozen copy of its defaults is `src/lib/jelly/config.ts`.

**Open it (needs the local server now):** `cd ~/Desktop/dev/phill-portfolio && python3 -m http.server 8765 --bind 127.0.0.1`, then http://127.0.0.1:8765/docs/design/jelly-resume/playground.html. Opened as a `file://` page, Chrome taints the hero canvas (no hero sparks) and silences the music analyser.

**Git:** the playground, this handoff, `tools/snapshot.mjs` and the plans are committed (first on `feat/jelly-resume-playground`, then carried into `feat/jelly-resume-site` with the port). `rezmancer-snapshot.js` (phone + email) and the `playground-v*.html` backups are gitignored; the repo is **public**, so they must never be committed.

## The idea

A "View Resume" button on phillcodes.com opens a full-screen 3D view of Phill's resume. It looks exactly like the PDF from his Rezmancer app and floats in a cyberpunk nebula. At rest it's just a readable page. When you click on it, it misbehaves in a Jelly Mario way:

- the clicked word and its neighbors break loose and float over the page;
- loose words bump into each other and into the text still on the page, and hard hits knock that text loose too (chain reactions);
- some loose words fly toward the camera (growing) or off past the edge into the distance (shrinking);
- on a hard impact, after floating a while, or when a loose word is clicked, a word bursts into glowing particles;
- the particles then swarm home and the word re-forms, so the page always heals itself.

Reference: [Jelly Mario](https://jellymar.io/). Its `build/main.js` shows a GPU particle simulation stored in float textures, springs (stiffness 1700, damping 6), a grid for collisions, and sprites texture-mapped onto particle lattices. We copied the core trick, a texture mapped onto a spring lattice, on the CPU.

## Files (all untracked, in `docs/design/`)

| File | What it is |
|---|---|
| `jelly-resume/playground.html` | **The current playground.** ~1,560 lines. Raw WebGL2, no dependencies. |
| `jelly-resume/rezmancer-snapshot.js` | Generated (~1.5 MB), **gitignored** (it has Phill's phone and email). Exact layout of the Rezmancer resume: word boxes and styles, a text-layer PNG and a decorations PNG. Lazy-loaded by the playground (`loadResume()` injects it when a trigger is hovered, focused or clicked). |
| `jelly-resume/tools/snapshot.mjs` | Generates the snapshot from Rezmancer's printed HTML using headless Chrome (puppeteer-core). |
| `jelly-resume/playground-v1..v11.html` | Earlier versions, kept for reference (v1: floor and gummy boxes; v2: before space; v3: before site colors; v4: before the snapshot; v5: before finishes and 3D text; v6: before jazz, entrance, finder, black hole; v7: before the jazz engine was removed; v8: before map-style navigation; v9: before rotate-by-default and the bending paper; v10: before the scroll-stability fix; v11: before comet sparks). |
| `paper-shatters/playground.html` | Abandoned first concept: the page shatters into a neon "Career Skyline" of job towers. **Phill dropped the towers as too complicated.** Kept only for ideas, such as the glowing cracks and the shard shader. |

Refresh the snapshot after changing the resume in Rezmancer:

```bash
# in ~/Desktop/dev/rezmancer: regenerate out/*.html (pnpm resume), then
node ~/Desktop/dev/phill-portfolio/docs/design/jelly-resume/tools/snapshot.mjs \
  ~/Desktop/dev/rezmancer/out/Phill_Aelony_Resume_AI_Engineer.html \
  ~/Desktop/dev/phill-portfolio/docs/design/jelly-resume/rezmancer-snapshot.js
```

Refresh the **site's** snapshot (`public/resume/`, committed, so it has no phone or email):

```bash
# in ~/Desktop/dev/phill-portfolio, after regenerating Rezmancer's out/*.html
node docs/design/jelly-resume/tools/snapshot.mjs --web \
  ~/Desktop/dev/rezmancer/out/Phill_Aelony_Resume_AI_Engineer.html public/resume
```

`--web` deletes the phone and email `<li>`s from `ul.contact` before measuring (their `·` separators are `li + li::before`, so they go too), renders at 2× instead of 3×, and writes `snapshot.json` (words, page, content, dpr, image names) plus `text.webp` (lossy color, lossless alpha) and `decor.webp`. It exits with code 2 and writes nothing if it can't find exactly those two items or if any phone number, email, `mailto:` or `tel:` survives. It needs `sharp`, which resolves from the portfolio's `node_modules`. First run (2026-10-13): 631 words (the playground's 634 minus the phone's two words and the email), `text.webp` 257 KB (was a 1,002 KB PNG), `decor.webp` 7 KB (was 26 KB), `snapshot.json` 76 KB.

The tool lays the HTML out at 710 px (Letter 8.5in minus Rezmancer's 0.55in side margins, from `packages/render/src/resume.css` `@page`) at 3× resolution. It walks the text nodes with `Range.getClientRects()` to get one box per word and classifies each word as heading, bold or body. It takes two screenshots: text only on a transparent background, and decorations only (`color: transparent`, which keeps the bullets, tint bars, rules and separators). It hard-codes the puppeteer-core path from `~/.npm/_npx` and the system Chrome path; the env vars `PUPPETEER_CORE` and `CHROME` override them.

## How the playground works (map of the code)

- **Data:**
  - `DATA` is the resume in the same shape as `rezmancer/content/resume.yaml` (phone and email left out). It feeds the "Reflow from resume data" layout.
  - `window.REZ_SNAPSHOT` feeds the default "Exact Rezmancer output" layout. `snapshotBodies()` converts snapshot words into the same body records the reflow layout produces (1 page unit = 1 inch = 96 CSS px).
- **Bodies:** one jelly body per word (or per line run in the "ribbons" setting). Each body is a 3-row particle lattice with cell size 0.2. Springs: structural, shear (×0.7) and bend (×0.35). Bold words are softer (`boldSoft`); headings are stiffer and heavier.
- **States:** `HOME → LOOSE → (BURST → REFORM) | RETURN → HOME`.
  - A **home spring** (`homePull`) keeps the page readable.
  - A word breaks loose when its displacement exceeds `breakDist`, when clicked, or randomly in shroom mode.
- **Physics:** semi-implicit Euler, 4 substeps per frame, all in typed arrays.
  - **Float mode:** loose words are confined to a thin layer just above the page (z 0.03–0.085), "air hockey" style, so they collide with the text that's still on it.
  - **Collisions:** a hash grid over loose particles plus the particles of words still at home. Hitting home text transfers momentum scaled by `contagion`.
  - **Escapees:** words that escape skip the layer, then burst when they reach the camera or get far away.
- **Bursts:** each word stores 6–90 glyph sample points taken from the atlas alpha. On burst, the points are placed through the current lattice by bilinear lookup and fly apart. They drift for `burstTime`, then ease toward their home positions while the word fades back in.
- **Rendering** (WebGL2, premultiplied alpha):
  - **Backdrop:** a nebula baked once into an equirectangular texture (fbm with domain warp, a band, dust lanes, filaments, base haze), plus about 2,600 3D star points and about 16 instanced mist sprites (back ones, a halo behind the page, and front wisps that are off on Low quality).
  - **Page:** the decorations backing texture.
  - **Words:** atlas-textured lattices that discard empty pixels and write depth.
  - **Burst particles:** points.
  - **Distance fog:** in the word and particle shaders.
- **Camera:**
  - **Zoom:** 1 fits the whole page; smaller values zoom in.
  - **Mouse:** wheel scrolls, Ctrl or pinch zooms, dragging on empty space orbits (clamped), double-click or R resets.
  - **Touch:** drag scrolls, tap knocks words loose, long-press grabs, pinch zooms.
- **Controls:** every slider lives in `SCHEMA`; presets are in `PRESETS`. **Copy prompt** produces an implementation brief listing only the settings changed from the defaults, plus exact JSON.
- **Debug hook:** `window.__jelly` exposes `state, rebuild, chaos, burstAll, healAll, clickAt, rayAt, pickParticle, bodies(), cam` for scripted testing.

## Added 2026-10-12: finishes, 3D text, bigger bursts (backup before this: playground-v5.html)

- **Page finish:** textured paper (default), smooth, holographic foil, or brushed metal.
  - A grain/fiber/mottle texture is baked once on the GPU (`GRAINBAKE_FS`, 1024², mirrored-repeat) and used for bump lighting.
  - Foil is an iridescent tint driven by the view angle; metal has anisotropic streaks and reflects the nebula.
- **Text finish:** embossed (default), flat, chrome, or iridescent foil.
  - Normals come from the glyph alpha gradient, mapped into world space with a derivative-based tangent frame.
  - Chrome reflects the baked nebula (`skyLook(reflect(-V, n))`).
- **Text thickness:** the word face is lifted by `textDepth * 0.05` and the gap filled with 1–6 darker stacked copies (`uPass` 1). Phones (Low quality) are capped at 2.
- **Drop shadows** (`uPass` 2): words are projected onto the page along the light, the atlas is sampled with a mip bias to soften it, and the shadow fades with height.
- **Bursts:**
  - default force 5.5, about 1.8× more particles per word (`pDensity`);
  - a flash that enlarges and whitens particles right after the burst (per-particle age attribute), and a soft halo (`pGlow`);
  - a **shockwave** that shoves nearby words, which can chain into more bursts. It's skipped when more than 12 words burst in one frame, and by "Burst all".
- **New presets:** Chrome (chrome text on brushed metal) and Holo Foil.
- **Measured:** desktop 120 fps, physics about 1.5 ms. Emulated phone (4× CPU) 120 fps at rest, 113 with 200 words loose (physics about 7.6 ms).
- **Still to judge with Phill:** whether embossed and 0.35 thickness is the right default. At steep orbit angles the stacked layers can read as a doubled outline; lowering thickness or shadows fixes it.

## Added 2026-10-12, session 2: jazz, entrance, finder, black hole, tilt (backup before this: playground-v6.html)

Goal: make it unique, fun and impressive. Phill picked all four directions.

- **Drop shadows removed** (Phill: "making it look kind of messy"). The slider, the shader pass and the prompt line are gone.
- **Jazz (`JAZZ` module, Web Audio, all synthesized, no files):**
  - **Instruments:** Karplus-Strong guitar (words breaking loose) and bass; vibraphone, Rhodes (FM) or kalimba for bursts (`burstTone`); brush ghost notes for bumps; bell tinks when words re-form.
  - **Timing:** notes snap to a swung triplet grid over a ii–V–I–VI in F at `tempo` 126. A note is the chord tone nearest the word's height on the page, and the line walks there a step or two at a time, so chain reactions come out as runs. Each slot has a cap per instrument, and overflow slides to the next slots.
  - **Band:** a walking bass plus ride and hi-hat comes in when 3+ words are loose (`band`). When the page heals, a C13 → Fmaj9 cadence plays.
  - **Big moments:** Chaos plays an altered stab; Burst all plays a vibes glissando.
  - **Shroom mode:** switches to drifting lydian chords with heavy echo and detune.
  - **Mix:** generated-impulse reverb, dotted-eighth echo, compressor. Voices are capped at 48.
  - **Verified:** voices drain back to 0 at rest. **Not yet heard by Phill.**
- **Entrance:** the start screen is a neon "View Resume" button (Audiowide). Behind it, the resume waits as a two-armed spiral galaxy of its own glyph particles (`ptGal`, `galaxyAt`). Pressing it does the following:
  - the camera swings in (`introCam`);
  - a cyan scanline prints the page top to bottom (`uReveal` in the page shader);
  - each word's stardust streams in, and the word lands with a jelly splat, playing a note in a run down the page;
  - it ends on an Fmaj9 strum.

  ▶ Intro (I) replays it: the page dissolves into the galaxy first. The `INTRO` state and `bd.rt` give the landing its own re-form time.
- **Finder:** a search bar plus chips (AI, React, TypeScript, AWS, Node, Data, Impact, Music). `/` focuses it, Esc clears it.
  - Matches lift (z +0.7), scale to 1.6× and bob. They get a cyan/purple halo from a fixed-LOD blur of their own glyphs.
  - The page and the other words dim.
  - Dots flow along arcs between matches in reading order (`LINK` program).
  - "Impact" finds the metrics (numbers, %, ×, K/M, not years or the phone number). "Music" also brings the band in. Search plays an arpeggio.
- **Black hole:** hold Space at the cursor, or toggle 🕳 (G) and press and hold (works on touch).
  - It grows over about 2 s and pulls words with a swirl. The near end of a word is pulled harder than the far end, so lattices stretch like spaghetti.
  - It swallows words (state `EATEN`, with a gulp) and eats burst particles.
  - Sprite: a black core, a white photon ring, and a neon disk with real coverage so it reads over white paper.
  - Its drone drops in pitch as it grows.
  - Release sprays everything back out as particles with a shockwave and a boom; the words re-form. Setting: `holePull`.
- **Phone tilt** (📱, touch only; asks iOS for permission): loose words and particles slide downhill (`tiltForce`, handles landscape). A hard shake scrambles the page (`shake`). Only tested with synthetic events.
- **Layout:** the camera now measures the finder and the HUD (`measureUI` → `uiFrac`) and fits the page between them. The hints moved into the HUD's second row.
- **Measured:** desktop 120 fps, physics 1.1–2.8 ms, including a black hole with 140 words bursting. Emulated phone (4× CPU) 120 fps, physics about 4.8 ms at rest.
- **Debug hook:** `window.__jelly` adds `startIntro, find, startHole, moveHole, releaseHole, hole, tiltG, shakeIt, JAZZ (JAZZ.debug), intro(), go()`.

## Added 2026-10-12, session 3: the resume dances to music

Phill's idea: play a track and every word dances to it.
- **♫ Music** (HUD; P plays and pauses) opens a popover with the site's four tracks from `public/audio` (Micro Clown, Number Slayers, Forbidden Nebula, Pollution) plus "your own file". While a track plays, the jazz notes and the band rest.
- **`MUSIC` module:** an `AnalyserNode` (fftSize 2048) produces three things:
  - 40 log-spaced bands from 35 Hz to 14 kHz, each normalized by its own slowly falling peak;
  - a waveform smoothed to 96 points;
  - beats, detected as bass flux over a running average.
- **Dancing:** `updateTargets()` writes a per-particle target offset `off` each frame. The finder lift now lives there too. The home spring pulls toward `home + off`, so words dance like jelly. Targets ease over about 50 ms, and the break-loose distance grows while dancing; without both, the lag tore words loose and the whole page exploded. Styles (`danceStyle`):
  - **Groove:** a spectrum analyzer across the page (bass in the middle columns, treble at the edges) plus kick ripples.
  - **Equalizer:** the spectrum only.
  - **Waveform:** the live wave runs across the page, offset per line, and words ride it.
  - **Kick ripples:** only the rings that kicks send across the page.

  Other settings: `dance` (strength), `mosh` (big kicks knock words loose; off by default), `pulse` (the nebula and mist breathe with the bass).
- **File limitation:** opened from a local file, Chrome plays the MP3 but the analyser reads zeros (a cross-origin restriction), and the popover then shows a warning. Serve it instead: `cd ~/Desktop/dev/phill-portfolio && python3 -m http.server 8765 --bind 127.0.0.1`, then open http://127.0.0.1:8765/docs/design/jelly-resume/playground.html. Your own file (a blob URL) works either way.
- **On the real site:** the resume overlay should read the global music player's analyser. `useAudioPlayer` already exposes `getFrequencyData()` (fftSize 256, so 128 bins, which is enough for the spectrum). The waveform needs a `getByteTimeDomainData` accessor, or the hook should expose the analyser itself.
- **Measured:** 0 words torn loose over 8 s of Micro Clown at 120 fps, physics about 1.2 ms.

## Added 2026-10-12, session 4: map-style navigation (backup before this: playground-v8.html)

Phill: "hard to navigate the resume up and down … zoom a little more freely". Navigation now works like a map or Figma:
- **Zoom toward the cursor:** Ctrl-scroll, trackpad pinch (arrives as Ctrl+wheel), or a touch pinch at the midpoint between the fingers, via `zoomAt()`. The point under the cursor stays put; verified to about 0.003 world units over 12 steps. Closest zoom is now 0.15 (`ZMIN`).
- **Pan in 2D:** the camera has `scrollX` as well as `scrollY`. Trackpad two-finger scrolling pans both axes, Shift+wheel pans sideways, arrow keys pan a third of the view, and Page Up/Down a whole view.
- **Drag to pan:** dragging anywhere that isn't a word pans when zoomed in (cursor: grab/grabbing), and a release flings with momentum (`fling`, `cam.mom`). Dragging a word still grabs and throws it. When the whole page fits, a plain drag still orbits; right-drag or Shift-drag always orbits.
- **Limits:** when the page is bigger than the view, its edges stop at the edges of the free area. When it's smaller, it can slide around while staying fully on screen. Near the size where the page just fits, there's extra sideways room so zooming at the cursor holds the point. Wheel panning is off at whole-page view, and zooming back out to whole-page view recenters.
- **Navigator** (top right; on phones, below the finder): a thumbnail of the page (backing plus atlas words, `buildMiniMap`) with the cyan view box. Click or drag it to jump there; scroll on it to zoom. It has − / Fit / + buttons; the thumbnail hides at whole-page view, and on phones the whole widget hides then.
- **Keys and gestures:** double-click on paper or empty space zooms in there; at the closest zoom it goes back to the whole page. Double-clicking words does nothing extra. `+` / `−` zoom at the center, `0` or R resets.
- **Phones:** one-finger drag pans both axes with a fling, and a two-finger pinch zooms and pans at once. The HUD hides its keyboard-shortcut labels, bringing it from 4 rows to 3.
- **Rotate** (added after Phill asked where the 3D rotation went): the navigator has a ✥ Pan / ⟳ Rotate toggle (O). In Rotate mode, any drag rotates the page, even one that starts on a word, while clicks still knock words loose; one finger rotates on phones, so the navigator always shows there. Option-, Shift- and right-drag also rotate. The range is wider: yaw ±1.25, tilt −0.6…1.1.

## Added 2026-10-12, session 5: rotate by default, a living sheet of paper (backup before this: playground-v9.html)

- **Drag rotates by default** (Phill: "make it like it is in rotate mode"). Word drag-and-throw is removed completely: the `grab` physics, the long-press and `startGrab` are gone. Clicks still knock words loose and loose words still burst on click. The ✥ Pan / ⟳ Rotate toggle stays, defaulting to Rotate. Scrolling, the navigator and the keys still pan. One finger rotates on phones.
- **The page is a real sheet** (Phill: "some thickness … curves … like an actual piece of paper"):
  - **Thickness:** the page mesh now has a front grid (40 × pageH·4), a back grid and a rim (`aSide` 0/1/2/3; the rim carries its outward normal in `aUv`). Setting: `paperThick`, default 0.08.
  - **Bending:** one bend function, `BEND` / `bendZ` in `PAGE_VS`, is mirrored in JS (`bendZ`). Slow waves run through the sheet (`paperBend`, default 0.5). The bottom-right corner curls up and breathes, with a smaller curl at the top left (`paperCurl`, default 0.5). Shroom mode's old wobble moved into the same function. While a track plays, the waves swell with the bass.
  - **Lighting:** the front gets a geometric normal from finite differences, and the curves shade relative to flat, so a flat page still matches the PDF exactly. The back and edges are plain paper lit by the bend.
  - **CPU side:** a 24×32 table (`updateBend`, `bendAt`) is filled once per frame and sampled bilinearly. `updateTargets` adds the bend to every word's target, so words ride the paper. Loose words' slab, the page guard, burst-particle bounces and re-form targets all use `bendAt`.
  - **Measured:** physics about 1.2 ms at defaults and about 2 ms during Chaos at maximum bend, 120 fps.

## Fixed 2026-10-12: scrolling no longer knocks words off the page (backup before this: playground-v10.html)

A two-finger trackpad scroll sends dozens of wheel events per second. Each one added the "scroll slosh" kick, and the kicks piled up until every word broke loose: 634 of 634 in a test scroll. Now the slosh is a capped velocity (a wobble, never a fling). `navCalm` (1 while scrolling, panning, zooming or rotating, fading over ~0.5 s) triples the break-loose distance and pauses the hover squish. The same test scroll now leaves 0 words loose.

## Added 2026-10-12, session 6: comet sparks (backup before this: playground-v11.html)

Phill picked "comet sparks" from the options; the other ideas were ink-to-ember, glyph shards and code glyphs.
- **Rendering:** particles are now instanced quads (`drawArraysInstanced`, 4-vertex strip per spark) instead of points. Each one is a capsule from its tail (`ptTail` = position − smoothed recent velocity × 0.05 × `trail`; `updateTrails`) to its head, with the screen-space length capped at 160 px. The core is thin (0.9–4.5 px) with a soft halo.
- **Color** (`pColor: 'comet'`, the new default): white-hot at the burst, cooling cyan → electric → deep blue → indigo. Fast sparks are pulled back toward cyan, and slow cooled sparks dim like embers. Violet was dropped because violet dots on white read pastel.
- **Glow on white:** one premultiplied pass (ONE, ONE_MINUS_SRC_ALPHA) both darkens the paper under the streak (coverage up to 0.95) and adds the color, so sparks glow on white paper and in space alike.
- **Swirl** (`swirl`): while drifting, sparks follow a divergence-free flow (the curl of sin(1.3x + 0.7t)·cos(1.1y − 0.6t)), like the hero vortex.
- `pDensity` dropped from 1.8 to 1.2, because streaks fill more space.
- **Measured:** 120 fps; physics 2.1–2.3 ms during Burst all (634 words, ~25K sparks).

**Particle look (open, Phill asked for options):** he finds the cyan/purple/green dots "Easter colored" and likes the hero's Vortex. The hero uses about 200 comet streaks along a simplex-noise flow, hues 190–290 (cyan → blue → violet, no green), with additive "lighter" compositing and two blur passes for bloom.

## Session 7: hero → resume transition, built in the playground (2026-10-12)

Plan: `docs/plans/2026-10-12-jelly-resume-hero-transition-plan.md` (T0–T12, one commit each on `feat/jelly-resume-playground`). Phill's approved idea: the hero photo disintegrates into comet sparks that become the galaxy and print the resume.

- **Site mock** (`#site`, setting `entrance: 'hero' | 'button'`): a copy of the phillcodes.com hero over the stage, checked side by side against the live site. Only the chrome is DOM (nav with logo, links, Resume button, GitHub/LinkedIn; the hero photo; the tagline; a Skills strip; 🍄 and ♫). The **canvas** draws the site background, the hero's pulsing GlowEffect (magenta → purple → cyan layers) and the vortex sparkles (desktop only, like the site), so the dissolve can fade them into the nebula. Layout uses container queries on the stage.
- **Lazy load** (`loadResume()`, cached promise): no snapshot at page load. Every trigger prefetches on `pointerenter`/`focus`. Physics and the page/word/spark passes are skipped while `NP === 0`. `?slow=<ms>` delays the load for testing; `__jelly.loadState()` reports it. The page size starts at Letter (8.5 × 11) so the camera doesn't move when the snapshot lands.
- **Hero spark pool** (`hp`, `buildHeroSparks`): the PNG is drawn at its displayed size and sampled on a stratified grid (~18K cells, ~6K on Low; `heroSparks` multiplies it), each colored by its cell's average. A spark keeps its pixel (relative to the photo, so the hover lift doesn't force a resample); at rest its world position is that pixel unprojected onto a plane in front of the camera (`heroHome`), re-derived whenever the camera moves. The comet program gained `aHeat` and a photo mode: heat 0 is an opaque dot in the photo's color, heat 1 the comet ramp. `__jelly.heroSparks(true)` swaps the `<img>` for the pool. While the mock is up, the camera is pinned to the pre-intro pose.
- **Dissolve** (`openResume({ origin, find })`): a ragged front (distance from the photo point nearest the origin, plus value noise) sweeps the photo in `dissolveTime × 0.42`. Released sparks heat to white-hot and then the comet ramp over 0.25 s, kick outward, ride the swirl and ease into galaxy slots (`galaxySlots`, the same distribution as the resume's stardust) within `dissolveTime` (default 1.6 s, ×0.7 on Low). The chrome fades and blurs, the site background fades to the nebula, and the whoosh plays.
- **Straight to the page (2026-10-13, Phill: "cooler if it just went right from the hero image to the resume"):** the new default, setting `heroPath: 'page' | 'galaxy'` (the galaxy path is kept for comparison). Released sparks heat, kick and swirl, then hover near the photo instead of heading for a galaxy. Once all are hot and the resume has loaded, the glyph sparks take over **rank for rank in reading order** (48 bands, top to bottom then left to right), so the photo's top becomes the page's header. They keep the hero sparks' velocity and comet age, and the entrance runs in `intro.direct` mode: each word's sparks keep flying until its turn, then swarm straight in while the scanline prints. All 634 words land in ~4.5 s (vs ~6–7 s through the galaxy). The orderings are sorted ahead of time in idle callbacks (`heroOrder`/`pageOrder`, cached per build) so the handoff frame stays cheap. Measured: desktop 120 fps; emulated phone 104 fps open, 86 fps close.
- **Handoff, galaxy path** (`heroHandoff`): once loaded and every spark has arrived, resume particle k takes hero spark k mod H's position, slot, velocity and tail. Twins (k ≥ H) fade in instead of doubling, and covered hero slots switch off on the same frame. Then `startIntro()` runs from the pre-state. Verified frame by frame with `?slow=6000`: no visible pop.
- **Triggers** (superseded 2026-10-13: the Resume button is a plain download again and the Skills chips are gone; see below): the Resume button (primary, opens from itself); the hero is a real `<button aria-label="Open the interactive resume">` (hover/focus: the canvas glow brightens, the photo lifts, a cursor-following "✨ click to open my resume" hint; a click opens from the cursor, Enter/Space from the center); Skills chips; 🍄: a speech bubble ("Shall I summon Phill's resume? ✨", Summon / Not now) opens it from the mushroom, with the heat ramp starting blue-violet (#996bff; the site violet read pink once white-hot). Mocked: no wizard, no chat API, no network. The resume HUD has **⤓ PDF** (`download`) and a top-right **×**. Hidden UI is `inert`.
- **Close** (`closeResume`: ×, Esc, Back): every word bursts into the hero pool (spark i starts at resume glyph point i mod NPT, on its live lattice). The sheet un-prints bottom to top behind the scanline, and the camera swings back out. The sparks fly to their pixels over ~1.4 s, cooling from comet colors to the photo's. On landing, the `<img>` and chrome cross-fade back in, the view resets, and the resume waits as a galaxy again, so open → close repeats cleanly (tested 3× plus a close mid-Chaos).
- **URL:** opening pushes `#resume` (or `#resume?find=React`); `popstate` reconciles (Back plays the reverse, Forward reopens), including after a transition ends. A deep link skips the hero and runs a quick galaxy intro once the load lands, then the Finder. × on a deep link drops the hash in place.
- **Skills chips** (removed 2026-10-13): `openResume({ origin: chip, find })`; the names were checked against `CHIPS`.
- **Reduced motion** (the media query, or the setting `simReduced`): every trigger opens a plain HTML resume dialog built from `DATA` (no phone or email). Focus moves in, Tab is trapped, Esc closes and focus returns to the trigger; it has Download PDF. No dissolve runs.
- **Settings:** a "Site integration" group with `entrance`, `dissolveTime`, `heroSparks` and `simReduced`. Each adds a Copy-prompt line, and the brief now describes the integration.
- **Debug hook:** `window.__jelly` adds `openResume, closeResume, loadResume, loadState, heroSparks, hp, diss(), closing(), openPanel, closePanel`.
- **Measured:** desktop 120 fps throughout (the dissolve and the 18K-spark pool at rest). Emulated phone (390×844, 4× CPU, 6K sparks): 104 fps dissolve, 79 fps reverse. **Known hitch:** if the resume wasn't prefetched, the cold load lands mid-dissolve as one ~257 ms frame on the throttled phone (the snapshot parse plus the synchronous `rebuild()`). Preloaded, the worst frame is 25 ms. On a phone, hover prefetch doesn't happen before a tap, so this is worth fixing before shipping (idle-chunked rebuild, a worker, or the smaller WebP snapshot).
- **Bug fixed on the way:** with nothing loaded, the front mist drew opaque (blending was only re-enabled in the skipped block).
- **Version bump:** none here (no PR). When the integration is ported in a PR, bump `package.json` minor.

## Changes 2026-10-13 (Phill's feedback after the loop)

- **Straight to the page** (see the session 7 list above): no galaxy step by default.
- **No Skills strip under the hero** (Phill: "I'd like to keep the page as it is because it looks really clean"). The chip deep-link trigger is gone; `#resume?find=X` deep links still work.
- **The nav Resume button stays a plain PDF download** (Phill: no friction for people who just want the file). The hero photo (and the 🍄 summon) are the ways into the 3D resume, and focus returns to whichever opened it.
- **Physics: "Into the Void" is how it runs** (Phill: "let's just set it to the into the void setting"): the defaults are now `space: 'fly'`, `floatTime: 3.5`, `burstForce: 4.5`. Clicked words fly off into 3D space, toward the camera or past the page edge, and burst into comet sparks that swarm home. The other feel presets keep their old float-over-the-page physics (`FLOAT`).
- **Phill's tuned look is the default** (pasted from Copy prompt, 2026-10-13): Into the Void physics with burstForce 5.4; chrome text (shine 0.75, thickness 0.5); comet sparks at size ×0.75, trails ×1.3, swirl ×1.4, glow 1.5, flash 0.95, shockwave 0.5; corner curl 0.55; nebula seed 1, stars ×1.7, front mist 1.0, mist drift 1.3, fog 0.55, bass pulse 0.7; hero dissolve 2.1 s. The Copy prompt now reads "no changes". Measured: desktop 118–120 fps; emulated phone (4× CPU) 108 open / 120 Chaos / 89 close.
- **The bottom bar ships** (Phill: "that stuff is fun for the user"): PDF, Chaos, Burst all, Heal all, Shroom, Black hole, Sound, Intro, View, plus × and the site's ♫.
- **The sidebar is a dev tool only.** The real site ships one fixed configuration (whatever the Copy prompt says at the time) and no settings panel. Visitors get the resume, its HUD (PDF, Chaos, Burst, Heal, Shroom, Black hole, Sound, Intro, View, ×) and the site's ♫ player.
- **One music player:** the site's ♫ button now lives outside the mock and stays on screen when the resume opens (the HUD makes room for it), so a song started on the site keeps playing and the resume dances to it. The resume's own "♫ Music" HUD button is gone; P still plays/pauses. Closing the resume doesn't stop the song. On the real site, the overlay must not cover `MusicPlayer`/`MusicFAB` (they already sit outside the shroom wrappers), and the resume reads the shared `useAudioPlayer` analyser.

## Porting to the real site: plan ready (2026-10-13)

The plan is `docs/plans/2026-10-13-jelly-resume-site-integration-plan.md`. Phill decided: a `/resume` route (intercepting route over the home page), a web snapshot without phone or email, the engine ported as plain TS with its own canvas (an exception to the R3F rule), and a touch-only "tap to open" tag. The notes below are background.


- **Trigger:** `HeroImage` (and the 🍄) open the resume. Nav's `ResumeDownloadButton` stays a plain download (Phill, 2026-10-13); the resume's HUD also has ⤓ PDF.
- **Hero:** `HeroImage` becomes the sampling source and a real button. Sample the `next/image` element at its rendered size; it's same-origin, so `getImageData` is fine. The `Vortex` and `GlowEffect` are what the canvas fades out.
- **Route (Phill decides):** a `/resume` Next route vs a `#resume` hash. The playground uses a hash only.
- **Contact details (Phill decides):** the public resume needs a Rezmancer "web" snapshot without phone and email.
- **Music:** read the shared `useAudioPlayer` analyser instead of the playground's own.
- **Performance rules:** follow CLAUDE.md's. Lazy-load Three/the resume via `next/dynamic` behind the triggers, use one canvas, and never setState per frame.

## Ported to the site (2026-10-13)

The integration plan (T0–T14, with what was done and measured for each task) is `docs/plans/2026-10-13-jelly-resume-site-integration-plan.md`.

- **Routes:**
  - From the home page, `/resume` is an intercepting route (`src/app/@modal/(.)resume`): the overlay opens over the still-mounted home page, so the hero can dissolve and the reverse close can land on it.
  - A direct visit or reload gets `src/app/resume/page.tsx`: the semantic resume (`src/data/resume.ts` + `ResumeContent`, the AI Engineer variant) with the overlay over it.
  - `?find=React` runs the Finder once the page lands (the playground's `#resume?find=`).
  - Back, × and Esc close it: in reverse onto the photo over the home page, else a fade home.
- **Host and triggers:**
  - `JellyResumeHost` is mounted in the root layout, outside the shroom wrappers, at z-50 above the page and Nav and below `MusicPlayer`. It follows the URL through `resumeRoute` and keeps the canvas alive for the close.
  - The ways in are the hero photo (`HeroImage` is now a real button with a hover hint and a touch tag, and prefetches on hover, focus and touchstart) and the 🍄 wizard's `offer_resume` tool (Summon opens it from the photo's center with the blue-violet heat).
  - The nav Resume button stays a plain PDF download.
- **Engine:** `src/lib/jelly/*`, plain TS on one WebGL2 canvas (the R3F rule's one exception). The playground's code map above still applies module by module (`world`, `physics`, `render` + `shaders`, `hero`, `intro`, `camera`, `dance`, `music`, `sfx`, `finder`, `order`, `bend`, `galaxy`, `input`), behind `engine.ts`'s API. The HUD is React around it (`JellyFinder`, `JellyNavigator`, `JellyHudBar`, × in `JellyResumeCanvas`). Dev only: `window.__jelly` (w, hp, diss(), closing(), intro(), cam, setTimeScale) and `window.__jellyHost` (open, back).
- **Not ported:**
  - the settings sidebar, presets and Copy prompt;
  - the runtime reflow layout;
  - `SITEBG_FS` and the fall-mode floor;
  - the resume's own music and the playground's mock hero, nav and wizard.
- **Different from the playground, for the site:**
  - **Snapshot:** `public/resume/` (the `--web` snapshot: no phone or email, 2×, WebP), loaded with `fetch` → `createImageBitmap`.
  - **Load:** stepped one job per frame (physics, atlas and GPU in batches); shaders compile in one batch.
  - **Hero:** the photo is decoded off the main thread and sampled at 1× on phones.
  - **HUD:** it mounts once the resume has loaded, and the minimap draws the text layer.
  - **Music:** one player. The resume taps the site's `MusicPlayer` (`src/lib/site-music.ts`); P plays and pauses it.
  - **Shroom mode:** it follows the site's (the HUD's Shroom still toggles it for the resume alone).
  - **Accessibility:** the overlay is a modal dialog with a screen-reader copy of the resume, and the page under it is `inert`. Reduced motion gets the plain page and never loads the engine.
  - **No WebGL2, or a lost context:** the plain page for the rest of the session.
- **Measured (production build):**
  - **Emulated phone (390×844, 4× CPU), first visits in fresh browser contexts:** worst frame 74–83 ms, ~112 fps through the open. The playground's known cold-load hitch was a 257 ms frame; the site's first unoptimized port had a 400–500 ms one.
  - **Desktop (1440×900):** open 118.7 fps, Chaos 120, close 120. The same holds with site shroom mode on.
  - **Home first-load JS:** +2.3 KB gzip; the engine, HUD and snapshot load only behind a trigger.
- **Changing the look:** tune in the playground, then copy the values into `JELLY_CONFIG` (`src/lib/jelly/config.ts`). Regenerate `public/resume/` after editing the resume in Rezmancer (command above).

## The cast: Phill and the shrimp (2026-10-14, v1.4.0)

- **What:** Phill (the Number Slayers model, llamas and all) orbits the page: behind it across the top, in front along the bottom (he can cover the bottom lines for a few seconds a lap; Phill is fine with that, people can knock him away). Shrimp drift through the nebula like slow planets. Click either to send it spinning off (Phill flails through the game's die clip); the black hole eats and spits them out; Chaos knocks them all. Phones: he dances on a stage above the page at 0.55×.
- **With the site's music:** he goes from idle to dancing (a shuffled round: his own game dance, the zombie's breakdance, and the human, garlic, lasagna and moose dances), moving on every ~16 s at a loop's end, with a squash-and-stretch bounce on the beat and a brighter neon rim on the bass. Each shrimp follows its own slice of the spectrum (swells and glows) and bends along its body (a vertex-shader wave: a swim driven by the music, with the live waveform rippling on top; the raw waveform alone averaged out to an invisible ~1% bend).
- **Files:** `src/lib/jelly/cast.ts` (behavior), `actors.ts` (GPU, `Pose`), `gltf.ts` (GLB reader), `CAST_VS`/`CAST_FS` in `shaders.ts`, `CAST_CONFIG` in `config.ts`, `JellyCastTune.tsx` (`/resume?tune`, dev only), `public/resume/phill.glb` (775 KB; 800 KB with Play mode's clips) and `shrimp.glb` (120 KB), built by `tools/actors.mjs`.
- **Borrowed dances:** `actors.mjs --dances … --arms 1` retargets other characters' clips onto Phill's 24-bone Meshy rig (Meshy rigs by name, Mixamo by a name map), through each bone's direction since the bind poses differ. Checked on the llama-free moose first: every dance matched its source. On Phill the llamas ride his arms, so `--arms 1` keeps his idle arms. The wizard's six dances also retarget (`--dances <wizard glb>`) but weren't included.
- **Measured (production build, music playing):** desktop 120 fps, worst frame 9.4 ms; emulated phone (390×844, 4× CPU) 119.8 fps, worst 17.5 ms. The cast chunk loads after the page prints, so the cold open didn't change.
- **Ideas for later:** a llama-free Phill for full-arm dances; a higher-detail Meshy model. (Play mode: built in v1.5.0, below.)

## Play mode: read the resume walking down it (2026-10-14, v1.5.0)

- **What:** 🎮 Play (first in the bar, J) or **PLAYER 1 START** (an arcade button on the page beside the name) turns Phill into a Mario-style platformer hero ~0.5 units tall (~90 px on desktop, ~60 px on a phone). He dives out of his orbit onto the name, and you read the resume walking down it to the bottom line: every visual line is a one-way platform (land only while falling with your feet above it; ↓ drops through; gaps wider than his foot are pits; off the paper's edge is the void: a flail and back at the last checkpoint). Space smashes the words in front of him (knees to chest, two lines) into comet sparks his way (the attack clip's llama chop, a hit-stop, a camera shake); ↓ in the air ground-pounds through a line. The 27 Impact numbers glow green (coins: "+1 IMPACT"); the six roles are checkpoints (2026 → 1998: a toast, a flag, the title glows); landing on the bottom line finishes the run (the clock freezes, the line lights up, its sparks fire up, he dances; THE END card with time, Impact and best; Play again). The clock starts on the first move; the best time stays in this browser. With the music on, standing still makes him dance; the words keep dancing under him. Phones get on-screen pads (◀ ▶ / A B ▼), a ♫ remote (the site's ♫ hides while playing), and compact stats; Esc or ✕ Exit leaves Play (a second Esc closes the resume).
- **Files:** `src/lib/jelly/play.ts` (the controller, pose, jelly pushes, camera, smash/pound/flail, entrance/exit, idle dance; its own lazy chunk, 14 KB), `platforms.ts` (the level from the snapshot), `playRun.ts` (the rules), `engine.play` in `engine.ts`, `cast.drive()`/`rig()`/`place()` in `cast.ts`, the `aGlow` channel (coins green, lit lines cyan; neither lifts the word, unlike the Finder) in `render.ts`/`shaders.ts`, Play sounds in `sfx.ts`; UI `JellyPlayHud.tsx`, `JellyPlayerStart.tsx`, `JellyTouchPads.tsx`, `JellyPlayTune.tsx` (dev, `/resume?tune` while playing; Copy → `PLAY_CONFIG`). Plan and every decision: `docs/plans/2026-10-14-jelly-play-mode-plan.md`; UI contract: `play-mode/mockup.html` (amended at the feel check, see the plan).
- **Clips:** `phill.glb` (800 KB) now keeps the game's `walk` (the run, sped up) and `attack` (the smash: its strike window 0.45–0.8 s, hit at 0.67 s) and has the Mixamo `jumping` (`tools/fbx2glb.py`, then `actors.mjs --dances …,jumping.glb --arms 1`), scrubbed by the jump's state (wind-up skipped; `Pose`'s `noLift` keeps its hip rise out, physics lifts him). `walk`, `attack` and `jumping` never join his orbit dances (by name). `actors.mjs` now also re-skins what he holds in his left hand to the hand (`handHeld`: 44 leg weights had stretched a sliver from his hand to his knee in the jump and in several dances).
- **Decisions at the feel check (Phill):** read it walking down (it was a climb up); Space smashes and W/↑ jump (Command declined: Cmd+Space is Spotlight, Cmd+←/→ is Back/Forward, Cmd+W closes the tab, and macOS drops other keys' keyups while Cmd is held); his soles on the text (his planted foot joint pinned to the line, drawn along the camera's line of sight); standing weight 2; a bigger, crisper shake; controls always on screen; a labeled Exit; PLAYER 1 START on the page.
- **Measured (production build, music on):** desktop 120.0 fps playing (worst 9.4 ms), 119.2 entering; emulated phone (390 × 844, 4× CPU) 99.1 fps playing (worst 18.5 ms), 98.2 entering (worst 65.2 ms). Per-frame code must not read layout (a 38 ms forced layout on the phone was the one miss, fixed).
- **Ideas for later:** shrimp as stompable enemies; a Mixamo "Running" clip if the sped-up walk ever reads as speed-walking; Shift as a thumb jump key; gamepad.

## Earlier plan pointer

The hero → resume plan (T0–T12) is `docs/plans/2026-10-12-jelly-resume-hero-transition-plan.md`.

## Next to workshop (after session 2)

2. **Real phone:** tilt, shake, audio unlock and GPU cost. This still needs the artifact link or a local network URL.
3. **Burst particle noise:** big chain reactions (black hole, chaos) leave lots of stray dots. Consider capping bursts per second or shortening `burstTime` while many words are bursting.
4. **Finder on phones:** matches are tiny at full-page zoom. Consider auto-zooming to the densest cluster.

## Decisions Phill has made (don't re-litigate)

- **No towers or skyline.** Just "View Resume" → the 3D page → chaos on click.
- **No drop shadows** (2026-10-12: messy).
- **No jazz / musical notes on interaction** (2026-10-12: removed; `playground-v7.html` keeps the old `JAZZ` engine). Clicks are silent. Sound is only `SFX`: the black hole's drone, gulps and boom, and the entrance whoosh. Music comes from real tracks (the dance feature).
- **Pure text.** No gummy boxes behind loose words (the `gummy` slider exists but defaults to 0; he said the boxes made it less fun).
- **No ghost text.** Knocked-off words leave clean holes; the drama is the point.
- **The whole page is visible by default.** Zoom 1 = fit page; a floor must never cover the page.
- **The formatting must match the Rezmancer PDF exactly.** Hence the snapshot approach rather than re-implementing Rezmancer's CSS.
- **Outer space with a nebula, not an HDRI.** The nebula is procedural and baked once, so there's no download and it can be tuned live.
- **Colors come from the site's tokens** (`src/app/globals.css`): cyan `#80eaff` (primary), electric `#00d4ff`, purple `#d580ff` / `#c44dff` (secondary family), green `#00ff2b` (accent, used sparingly), deep blue `#141f52` (muted), teal `#0e2525` (background-end). Burst particles default to the "site neon" mix (≈45% cyan, 40% purple, 15% green).
- **Performance and mobile are hard requirements.**

## Measured so far

- **Desktop:** 634 words, about 1.1–1.9 ms physics per frame, 112–120 fps (Chrome on an M-series Mac).
- **Emulated phone** (390×844, CPU 4× slower): 116–120 fps at rest, about 90 fps during Chaos, physics up to about 6–10 ms.
- **Not yet tested on a real phone.** The GPU side (sky lookup, about 11 mist sprites, points) is the unknown.

## Open items and ideas to workshop next

1. **Feel tuning.** Settled 2026-10-13: Into the Void. (Was: Phill hasn't settled the physics.) Have him try presets (Bumper Cars default, Popcorn, Zero-G Drift, Domino Chaos, Gravity, Into the Void, Wobbly Jello, Total Melt) and copy the prompt when something feels right.
2. **Real-phone test.** Publishing the playground as a private artifact link was offered so he can open it on his phone, but not done yet. If he wants it, the snapshot JS has to be inlined or published as a supporting file.
3. **Phone readability.** The exact Letter page is small on a portrait phone until you pinch-zoom. Options: start phones zoomed to the top of the page, or fall back to the reflow layout on narrow screens.
4. **Contact details.** The snapshot includes phone and email because the PDF does. The public site probably wants a Rezmancer "web" variant without them; ask Phill.
5. **Snapshot size.** About 1 MB of the 1.5 MB is the 3× text PNG. Before shipping, use WebP/AVIF or 2× resolution.
6. **Missing separators.** The contact-line separators (`·`, drawn by CSS `::before`) are very faint or missing in the backing image. Check against the PDF.
7. **Burst look.** Particles now have a flash and a halo. Still open: trails or streaks, and whether the glow reads on white paper (the halo shows mostly over space).
8. **Shroom mode** (S) melts, drips and hue-cycles everything. Not reviewed much since the space backdrop went in; check that it still looks good over the nebula.
9. **Sound.** Not explored. Pops on burst, or reacting to the site's music player (`useAudioPlayer` exposes live frequency data), could be fun.
10. **Accessibility in the real build.** The semantic DOM resume stays the source of truth (SEO, screen readers); `prefers-reduced-motion` shows only the DOM resume.

## Before the port (superseded 2026-10-13: see "Ported to the site")

- **Location:** phillcodes.com is Next 16 + R3F, in `~/Desktop/dev/phill-portfolio`. Follow its CLAUDE.md Performance Rules: lazy-load Three via `next/dynamic` behind the button, use one canvas, never setState per frame, mutate refs inside `useFrame`.
- **Physics:** port the CPU physics as plain TS modules driven from `useFrame`. Consider a Web Worker if mobile physics gets heavy.
- **Data flow:** Rezmancer's publish step (its PR 4b deploy isn't done yet) should produce the snapshot (layout JSON + text layer + decorations) next to the PDF. The site fetches it and revalidates on publish.
- **Process:** use the make-loop-prompt workflow (plan doc + /loop) once the design is final. Paste the playground's **Copy prompt** output into that plan.

## Starter prompt for the next session

> Read docs/design/jelly-resume/HANDOFF.md in ~/Desktop/dev/phill-portfolio (the "Ported to the site" section first), then open docs/design/jelly-resume/playground.html. The Jelly Resume is on the site (`src/lib/jelly/`); tune in the playground and port values into `src/lib/jelly/config.ts`. Next I want to: …
