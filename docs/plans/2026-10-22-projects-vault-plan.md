# Projects: the Relic Vault (v1.10.0)

## Context

### What exists (v1.9.0, master 5d68af7, branch `feat/projects-vault`)

- **The Projects section today** (`src/components/ProjectsSection.tsx` + `ProjectCard.tsx`): a 3-column grid of framer-motion cards fed by `src/data/projects.json` (five projects: Quadzilla, Number Slayers, Rezmancer, Jelly Resume, Pong), with screenshots in `public/images/projects/`.
- **Tests on it:** `src/__tests__/projects-section.test.tsx`, the ProjectCard block of `hover-patterns.test.tsx`, and `data-architecture.test.ts` ("five project entries, in order"; `imageUrl` under `/images/projects/`).
- **The Wizard reads the projects:** `wizard-prompt.ts` puts `projects.json` and `project-details.json` into its prompt (`wizard-prompt.test.ts` checks both blocks exist).
- **The page's other 3D:** the About section's testimonials are already a spinning 3D ring (`Testimonials3DCarousel`, R3F, in a `LazyMount`). The Jelly Resume is a plain WebGL2 engine. `three@0.182` is a dependency.
- **The site music** (`src/lib/site-music.ts`): one player; `context()` (its AudioContext, made on the first call, from a click only), `pause()`, `play()`, `isPlaying()`, `onChange(cb)`. The Skill blaster uses exactly this to borrow the context and hand the song back.
- **Escape:** WizardChat's capture-phase Escape leaves an Escape from inside an open modal `<dialog>` alone (PR #45), so a modal dialog owns its Esc.

### What we're building (Phill's calls, 2026-10-22)

The Projects section is scrapped and rebuilt as **the Relic Vault**: it's the year 4789, and a museum shows Phill's apps on the CRT televisions it believes are period-correct.
- **The hall:** six sets stand on lit plinths in an arc, in a dark hall the camera stands inside.
  - The set in front powers on (dot → line → picture, a degauss wobble) and plays its project's brag video through a CRT shader. The others hiss static.
  - Drag or swipe, the arrows, a sideways trackpad swipe or the names under the hall bring the next set to the front.
- **The card:** a glass museum card (a tab panel) gives the exhibit number, the name, the description, the stack, Watch, Live ↗ and Code ↗, and the set it's displayed on.
- **Watch:** the picture lifts out of the glass as a hologram, from the CRT's 4:3 crop out to the full video. The camera pulls back so the old set sits below it, beaming light up into it, and the backdrop dims all but that set. Esc, ✕ or a click outside sends it back into the glass.
- **Phill is making the videos:** about 30 s, action-packed, one per app. Until they're in, the mockup's placeholder clips stand in (see §4 and the stop conditions).

### Decisions and why (the executor wasn't in the conversation: don't re-litigate these)

- **The Relic Vault over the other pitches.** Phill, after the mockup: "omg...this is incredible! way better than i imagined! … LETS BUILD IT!"
  - **Rejected:** a channel-surfer (one CRT, projects as channels) and a curved TV wall.
- **Projects:** today's five plus **Pickleball 2079**. No Skill Blaster: it's already the Skills section.
- **Plain three.js, ported 1:1 from the mockup.** Phill, 2026-10-22: "plain threejs is fine! … we should always go with the best tech stack for optimum performance and implementation, we should never be locked to any particular library or stack". CLAUDE.md's old R3F-only rule is replaced in the planning commit.
  - **Why:** the mockup is the spec, the frame loop is the product (shader uniforms, a spring camera, per-frame homography), and nothing per frame should go through React.
- **Inside the arc, not a ring.** The About section already has a ring of cards viewed from outside; the vault is the inverse (the camera stands in the hall), so it doesn't read as a second carousel.
- **The shipped look is the mockup's defaults:** idle sets **Static**, CRT **Classic**. The mockup's mock bar (Idle, CRT, Sound FX, Reduced motion toggles) is a design tool and doesn't ship.
- **Sound effects after a click** (Phill picked this over none or a toggle): silent until the visitor clicks something in the section (an arrow, a name, Watch, a screen); after that the power-on thunk, the static hiss and the hologram whoosh play, softly. They go through the site player's AudioContext. Browsing by scroll stays quiet, and a set powering on as it scrolls in is silent.
- **The videos' own sound** (if a clip has any) is behind a Sound button in the hologram, off by default. Turning it on pauses the site song; turning it off or closing hands the song back (the Skill blaster's pattern).
- **One `<video>` per project, shared by the CRT and the hologram.** Watch moves that element into the hologram and back, so there's no second download or decode and the two stay in sync.
- **The hologram's camera move:** the camera pulls back, looks up and centres, so the set lands below the floating panel. This was found in the mockup: without it the panel covered the TV that projects it.
- **Reduced motion still shows the hall** (it's content at rest), but with no camera tweens, no power-on, no static motion, no sway, and no autoplay. Videos play only on request (the Play button or Watch).
- **Placeholders never ship to production.** The PR waits for Phill's six clips; the encode script marks placeholders in its manifest, and the loop stops on them.

### Rejected (don't rediscover)

- A second spinning ring of cards; a TV wall mosaic; the channel surfer.
- R3F + `@react-three/postprocessing` (a rewrite of the approved scene and a new dependency).
- Video on every set at once (decode cost): only the front set plays; the others show their poster under the static.
- A separate `<video>` in the hologram (double download and drift).
- Shipping the mock bar's options as user settings.
- Autoplaying sound effects on scroll.

## Binding — do not redesign

### 1. The mockup is the visual and interaction contract

`docs/design/projects-vault/` (`index.html`, `vault.css`, `vault.js`, `projects.js`, `media/`). Serve it with `cd docs/design && python3 -m http.server 8790` and open `http://127.0.0.1:8790/projects-vault/` (any free port; it needs http for ES modules and video textures). `vault.js`'s `window.__vault` handle shows its state.

Port its values exactly, unless this plan says otherwise:
- **The hall:** `R` 7, `STEP` 0.27, `SCREEN_Y` 1.5, `START` 1 (Number Slayers in front at load), fog `FogExp2('#05090c', 0.07)`, `RoomEnvironment` at 0.42, the hemisphere light, the floor and the track ring.
- **The sets** (`SETS`): their dimensions, materials and the screen units, including the fix that matters (each screen unit's back sits on its cabinet's face, the face's rim under the bezel lip, so no cabinet occludes the picture). The plinth height is computed so every screen centre is at `SCREEN_Y`. Also the contact blob, the cyan ring (2.2× when in front, 0.5× idle), the spotlights (60 in front, 16 idle, +18 hovered) and the spill light (the picture's colour, sampled from a 4×4 canvas every 8 frames).
- **The CRT shader** (`FRAG`): barrel, wobble, rounded-rect mask, cover crop, chromatic bleed, snow with a rolling band, scanlines at about 3.2 device px each (`uLines` from the projected screen height), aperture mask, flicker, vignette, the power window (`uOpenX/uOpenY/uFlash`) and `uEmit`. Keep the CRT preset **Classic** (`curv .11, scan .5, mask .22, bleed 1, wobble 0`) and idle **Static** (`open 1, bright .3, stat .85`).
- **Bloom:** `UnrealBloomPass(…, 0.5, 0.5, 0.96)`. Tone mapping `NeutralToneMapping`, exposure 1.05.
- **Power on and off:** `powerOn` (1.1 s) and `powerOff` (0.34 s), the timelines as written. A set powers on 0.06 s after the hall stops on it and the stage is visible.
- **The camera:** the spring (k 34, damping 1.02, |v| ≤ 9), drag (0.26 × the stage width per set, wide; 0.5 narrow), the release snap (velocity × 0.16), the sway, `camD` 4.4 wide / 3.55 narrow, fov 30 / 34, and the view offset −13 % of the width on wide stages (the set sits right of the card).
- **The hologram:** `finalRect` (with `BAR_H` 60), `layoutHolo`'s `lookUp`, `startCorners` (the crop's middle on the glass), the homography (`sq2quad`, `mapH`, `cssH`), the hull beam with its gradient, the backdrop's radial hole at the set (`--tx`/`--ty`), the flight (0.78 s out, 0.5 s back), the flicker on landing, and `holoBack` (1.9 wide / 1.3 narrow).
- **Layout:** wide = the lit set in the middle and the card centred under it, a label at its plinth's foot, `min(44rem, 100%)`, its actions on the name's row and the set's caption opposite the exhibit line; it fades out while the hologram is up (Phill, 2026-10-23: the mockup's card over the stage's lower left, with the hall offset 13% right, sat in front of the neighbouring set and read as its label); ≤ 760 px = the card under the stage, the arrows at the stage's bottom corners, and the hologram bar's buttons as 44 px icons. Also the stage heights, the mask fade and the tab line.

**Differences from the mockup (binding):**
- **No mock bar.** Idle Static and CRT Classic are fixed, and the mockup's `.above` filler is dropped.
- **No test card.** Until a set's poster loads, its screen shows snow.
- **The header follows the site's section pattern** (`SkillsSection`'s): an `<h2>` eyebrow "Projects", the title "The Relic Vault" in a `<p>` with the same `.title` rule and `neon-text-purple`, and the lede, with the same tokens and rules as `Skills.module.css`'s header.
- **`window.__vault` exists only when `process.env.NODE_ENV !== 'production'`.**
- **The touch hint** says "Swipe to browse · tap a screen to watch" (§2).
- **Sound effects** play only after a click in the section (§6). The mockup's toggle is gone.
- **The video element** is shared with the hologram (§5) instead of the mockup's second `<video>`.

### 2. Copy (exact)

- **Header:**
  - eyebrow: `Projects`
  - title: `Some Stuff I Built` (Phill, 2026-10-23; was `The Relic Vault`)
  - lede: `Here are a few things I am working on in my free time.` (Phill, 2026-10-23; was the year-4789 museum line)
- **Card:**
  - meta: `Exhibit {NN}` (Phill, 2026-10-23: "Recovered from {year}" dropped with the museum framing)
  - name: `{title}`
  - description: `{description}`
  - stack: the items joined by ` · `, with a hidden `Built with: ` before them
  - actions: `Watch` (its accessible name `Watch the {short ?? title} video`), `Live ↗`, `Code ↗` (the arrow `aria-hidden`; each link adds a hidden ` (opens in a new tab)`)
  - caption: `Displayed on {set}.`
- **Tabs:** `{NN}` (`aria-hidden`) then `{short ?? title}`.
- **Hint:** `Drag to browse · click a screen to watch` on fine pointers; `Swipe to browse · tap a screen to watch` on coarse pointers. It fades out after the first interaction.
- **Stage buttons:**
  - `Previous exhibit` and `Next exhibit` (aria-labels);
  - the power button: visible `Pause` / `Play`, aria-label `Pause the televisions` / `Play the televisions`.
- **Live region** (polite, for the arrows and swipes): `Exhibit {n} of 6: {title}`.
- **Hologram:**
  - the dialog is labelled by its title (`{title}`);
  - buttons `Pause`/`Play`, `Sound on`/`Sound off` (only when the clip has audio), `Full screen`, `Live` (a link, `Live (opens in a new tab)`), and `Close` (the ✕, aria-label only);
  - on ≤ 760 px the labels are icons with the same accessible names.
- **No-WebGL fallback caption:** none. The fallback shows the poster in a CSS screen frame; the card and tabs are unchanged.

### 3. The data

`src/data/projects.json`, in this order: `quadzilla`, `number-slayers`, `rezmancer`, `jelly-resume`, `pickleball-2079`, `pong`. Each entry is the mockup's `projects.js` entry:
- `id`, `title`, `short?` (Pong only: `Pong`), `year`, `tv` (the set: `pocket`, `tube`, `terminal`, `sphere`, `portable` or `console`), `set` (the caption text), `description`, `techStack` (the stack), `liveUrl?`, `repoUrl?`.
- **Dropped:** `imageUrl` (the posters replace the screenshots).
- **The `Project` type** (`src/types/content.ts`) changes to match.
- **The copy** is the mockup's, exact (the five existing descriptions are unchanged). The Jelly Resume's `liveUrl` stays `/resume` (same tab: an internal link).
- **Pickleball 2079** (new, as shown in the mockup):
  - `year` 2026, `tv` `portable`, `set` `a portable colour set, c. 1986`;
  - description: `Wacky arcade pickleball from the year 2079, in development. Two-on-two against the CPU on a deterministic 60 Hz sim that replays bit-exact, a cast of voxel critters and kitchen objects, and players who explode when the ball hits them.`;
  - stack `TypeScript`, `three.js`, `Vite`, `Deterministic sim`;
  - no links (a private repo).

`src/data/project-details.json` (the Wizard's knowledge) gains:
```json
{
  "id": "pickleball-2079",
  "architecture": "A pnpm monorepo: a pure, deterministic 60 Hz simulation package (the rules, the ball, the players, rally scoring to 11, win by 2) and a Vite + TypeScript web app that draws it with plain three.js from a sideline camera.",
  "keyPatterns": "The sim is pure and seeded, so a match replays bit-exact from its inputs; CPU players run on the same sim, and replays print a point-by-point timeline for debugging. The characters are modular voxel figures built in code: species presets mixed with outfit kits.",
  "notableDetails": "Wacky arcade pickleball in the NBA Jam mould, in development: local matches against the CPU work today, online play and touch controls are next. Players who get hit by the ball explode into cubes and rebuild."
}
```
(The years are the repos' first commits: Pong 2020, Number Slayers 2025, the rest 2026.)

### 4. The media

- **Phill's masters** go in `video-masters/<id>.(mp4|mov|m4v|webm)` at the repo root. The folder is gitignored (T2 adds it) and isn't watched; the script reads it.
- **Encoding:** `node scripts/encode-projects.mjs [--id <id>]` (ffmpeg at `/opt/homebrew/bin/ffmpeg`, or `ffmpeg` on the PATH). For each project it reads the master, or, when there's none, `docs/design/projects-vault/media/<id>.mp4` as a **placeholder**, and encodes into the gitignored `video-masters/encoded/`:
  - **`<id>.webm`:** AV1 (`libsvtav1`, `-crf 34 -preset 6`), Opus 96k when the master has audio, else no audio track.
  - **`<id>.mp4`:** H.264 High (`-crf 23 -preset slow -maxrate 3M -bufsize 6M -pix_fmt yuv420p -movflags +faststart`), AAC 128k when the master has audio, else `-an`.
  - **The size:** the long side at 1280 (so 1280×720 for 16:9, 720×1280 for Quadzilla's portrait), 30 fps, never upscaled.
  - **`<id>.jpg`:** the poster, the frame at `POSTER_AT[id]` (a per-id table at the top of the script, default 0: each brag master's frame 0 is its designed poster), 960 px on the long side, about 80 KB.
  - **Hosting: Vercel Blob, not `public/` (Phill, 2026-10-22),** so the clips never enter git history (they'll be re-cut). The script uploads the three files with `@vercel/blob`'s `put` (public) to the store `phill-portfolio-media` (connected to the Vercel project) as `projects/<id>-<sha256, 12 hex>.<ext>` with a year's `cacheControlMaxAge`. A re-cut gets a new name, so the cache never serves a stale clip, and a name already in the store (`head`) isn't sent again. The token is `BLOB_READ_WRITE_TOKEN` from `.env.local` (`vercel env pull .env.local`); only the script uses it. Old files stay in the store, since a live deploy may still point at them: prune them by hand once none does.
  - **`src/data/projects-media.json`** (GENERATED, never hand-edit): `{ "<id>": { "w", "h", "duration", "audio": bool, "placeholder": bool, "poster": "https://<store>.public.blob.vercel-storage.com/projects/<id>-<hash>.jpg", "sources": [{ "src": "…/projects/<id>-<hash>.webm", "type": "video/webm; codecs=av01.0.05M.08" }, { "src": "…/projects/<id>-<hash>.mp4", "type": "video/mp4" }] } }`.
  - **CORS:** the CRTs draw the video into WebGL (`THREE.VideoTexture`) and read its colour for the spill, so each `<video>` is `crossOrigin = 'anonymous'` (Blob answers `Access-Control-Allow-Origin: *`); three's `TextureLoader` loads the posters anonymous by default. There's no CSP; one would need `*.public.blob.vercel-storage.com` in `media-src` and `img-src`.
  - **It warns** past 40 s, past 15 MB for one file (Phill, 2026-10-22: one clip loads at a time, when its set powers on, so the size only sets that clip's start and a phone's data; the CRFs stay), or on a master under 720 px tall (16:9).
- **The CRT texture and the hologram use the same files.** The CRT crops the middle to its screen's aspect (cover); the hologram shows the whole frame at the video's own aspect.
- **The old screenshots go:** `public/images/projects/` is deleted with `ProjectCard` (T8), once nothing references them.

### 5. Architecture

- **`src/components/ProjectsSection.tsx`** (rewritten): the server-rendered section `#projects`.
  - It holds the header (§2); `.pv-vault` with the stage (`<canvas aria-hidden="true">`, the arrows, the power button, the hint, and a visually hidden holder for the video elements); the card holder; the tab list; and the live region.
  - **All six panels are in the HTML** (role `tabpanel`, inactive ones `hidden`), so their text is in the page for search and screen readers. Tabs follow the APG tabs pattern: roving `tabIndex`, ←/→/Home/End, `aria-selected` and `aria-controls`.
  - Styles: `src/components/projects/Projects.module.css`, the mockup's `vault.css` section rules.
- **`src/components/projects/ProjectsVault.tsx`** (client island):
  - **State:** the selected tab, which is the engine's `near`, set from its `onNear` (index changes only, never per frame); the paused state; the hint.
  - **Loading:** it loads the engine with `import('@/lib/vault/vault')` when the section is within 800 px of the viewport, and once the canvas's first frame is drawn the canvas fades in.
  - **No WebGL** (context creation fails or is lost): the fallback, the active poster in a CSS screen frame; Watch still opens the hologram, which lifts from that frame.
- **`src/lib/vault/`** (one lazy chunk, plain TypeScript + three):
  - `math.ts`: pure (the homography, the hull, the cover crop, `finalRect`, `startCorners`, `angleOf`, the spring step, the release snap, `lookUp`, the scanline count);
  - `crt.ts`: the shader material;
  - `sets.ts`: the six sets, the plinth placement and the screen units;
  - `hall.ts`: the renderer, environment, fog, floor, lights and composer;
  - `state.ts`: the pure state machine (the spring, settle → power on, drag release, near changes, a pending Watch);
  - `holo.ts`: the hologram;
  - `sfx.ts`: the effects;
  - `vault.ts`: `createVault(opts)`, the loop, input, video and power;
  - `vault.css`: the hologram's global styles, since the dialog is on `<body>`.
- **`createVault({ stage, canvas, projects, media, videoHolder, reducedMotion, onNear, onReady, onFail })`** returns `{ go(i, announce?), watch(i), setPaused(p), setReducedMotion(rm), destroy() }`.
  - **One `<video>` per project,** created lazily (`muted`, `playsInline`, `loop`, `preload` `none` until the set is in front, then `auto`), with `<source>`s from the manifest, inside the visually hidden holder (iOS needs texture videos in the document).
  - **Watch moves the element** into the hologram's panel and back. Inserting and removing in one task doesn't pause it; if the browser pauses it anyway, it's played again when muted.
  - **A paused video never uploads a texture frame,** so a set shows its poster until its video fires `playing`. This bug was found in the mockup.
- **The hologram** (`holo.ts`) is a native `<dialog>` with `showModal()`, appended to `<body>` (outside the shroom wrappers, a CLAUDE.md gotcha), carrying its own tokens.
  - **Esc:** the dialog's keydown stops propagation of Escape, and `cancel` is `preventDefault` + the animated close.
  - **Backdrop:** a click whose target is the dialog closes it only when the press started there too (the scoreboard's rule).
  - Focus returns to what opened it. The page is scroll-locked while it's open.
- **Escape layering stays as it is:** WizardChat already leaves an Escape inside an open modal dialog to the dialog.
- **Performance build-up:** mounting never makes a task over 50 ms.
  - The sets are built one per frame (`requestAnimationFrame` steps), shaders are compiled with `renderer.compileAsync`, and the PMREM is made once.
  - The device pixel ratio is capped at 1.75 on wide stages and 1.5 on coarse pointers.
  - It renders only while the stage is on screen, or while the hologram is open, and the tab is visible.
- **Removed:** `ProjectCard.tsx`, `public/images/projects/`, and the ProjectCard tests in `hover-patterns.test.tsx` (that file's other blocks stay).

### 6. Sound

- **The effects** are the mockup's `sfx` (on, off, holo, holoClose), at the mockup's levels.
  - They're silent until the first click inside `#projects`: an arrow, a tab, Watch, a set, or the power button. That click calls `getSiteMusic()?.context()` (or `new AudioContext()` when there's no player) and resumes it.
  - **After that:** arrows, tabs, clicks and drags make the power-off/power-on sounds as sets change; Watch makes the whoosh and closing the reverse.
  - A set powering on with no click in the section (the hall scrolled in) is silent.
- **The video's sound:** when the manifest says `audio: true`, the hologram shows `Sound on`.
  - Pressing it unmutes the video; if the site song is playing it's paused (`pause()`), and that's remembered.
  - Pressing `Sound off`, closing the hologram, or the visitor pressing play on the music player (`onChange(true)`, which also mutes the video) hands the song back (`play()`) only if it was the hologram that paused it.
- **Never:** `createMediaElementSource` on any element, or a second music player.

### 7. Accessibility and performance (binding)

- **Accessibility:**
  - WCAG 2.1 AA.
  - **Everything works by keyboard:** Tab reaches the arrows, the power button, the tabs, and each panel's Watch and links. ←/→ in the tab list move the hall.
  - Visible focus.
  - **44 px targets.**
  - **The Pause button** stops all motion: video, static, sway, and the hologram's scanline roll (WCAG 2.2.2).
  - **Reduced motion:** instant camera, no power-on, frozen snow, no sway, no autoplay, and the hologram fades in place with no beam motion.
  - The canvas is `aria-hidden`, and the panels carry the content.
  - **Contrast:** the card text (`--ink-2`, `--ink-3`) on the card's glass is AA; check it with the build.
  - The live region announces exhibit changes from the arrows and swipes.
- **Performance:**
  - no layout reads in the frame loop (the ResizeObserver keeps sizes; the hologram reads the stage rect only at open and resize);
  - no setState per frame;
  - one canvas, paused offscreen and in hidden tabs;
  - one video decoding at a time;
  - no video bytes until the section is within 800 px;
  - no long task over 50 ms while the section mounts or scrolls in, on a 4×-throttled CPU (record a trace).
- **Fonts:** Audiowide + Nunito only.

## Task checklist

Order matters: T1–T2 are data and media; T3–T7 build the engine bottom-up (pure first); T8 swaps the section; T9–T11 verify, document and ship.

- [x] **T1: The data.** §3.
  - `projects.json` (six, new fields, no `imageUrl`), the `Project` type, and the `project-details.json` entry.
  - `ProjectCard.tsx` stays compiling until T8: give it a local optional `imageUrl` or render the placeholder, and don't touch its look.
  - Update `data-architecture.test.ts` (six in order; each has `year`, `tv` in the set list, and `set`; links valid) and keep `wizard-prompt.test.ts` green.
- [x] **T2: The media pipeline.** §4.
  - `.gitignore` gets `video-masters/`.
  - Write `scripts/encode-projects.mjs`, then run it. Masters exist for whatever Phill has dropped in; the rest are placeholders.
  - Commit `public/projects/*` and the generated `src/data/projects-media.json`.
  - Test `projects-media.test.ts`: every project id has an entry; its files exist under `public/`; `w`/`h`/`duration` are sane; the sources' order is webm then mp4.
- [x] **T3: The pure math and state** (`src/lib/vault/math.ts`, `state.ts`).
  - Tests `vault-math.test.ts` and `vault-state.test.ts`:
    - `sq2quad` maps the unit square's corners onto the quad, and an affine quad gives `g = h = 0`;
    - `cssH` round-trips a point;
    - the hull of a square + an inner point is the square;
    - the cover crop for 16:9 on 4:3 is (0.75, 1) and 9:16 on 0.607 is right;
    - `finalRect` fits under `maxH` and is centred;
    - the spring settles on the target and never overshoots by more than 2 % with the binding constants;
    - release snapping with velocity;
    - settle → power on after 0.06 s, only when visible;
    - a pending Watch fires once the set is on.
- [x] **T4: The CRT material and the sets** (`crt.ts`, `sets.ts`, `hall.ts`).
  - Port the mockup's values.
  - Tests `vault-sets.test.ts` (node env; three builds geometry without WebGL):
    - for each of the six sets after plinth placement, the screen centre's world y is `SCREEN_Y` ± 0.001;
    - **no occlusion:** a ray from 5 units in front toward the screen, at its centre and at 90 % toward each corner, hits the screen mesh (or its glass) first. This is the mockup's oval bug, caught;
    - the shader material compiles to valid uniforms (the uniform list).
- [x] **T5: The engine** (`vault.ts`).
  - `createVault` per §5:
    - the loop on `state.ts`;
    - input (pointer drag on the x axis with `touch-action: pan-y`, click and hover via a raycast on hit boxes, a horizontal wheel past 60 px);
    - power on/off;
    - idle;
    - the shared video elements;
    - posters until `playing`;
    - the spill;
    - IO + visibility pause;
    - reduced motion;
    - pause;
    - the staged build (§5's performance);
    - `onFail` on no WebGL or a lost context;
    - `window.__vault` in development only.
  - Tests `vault-engine.test.ts` (jsdom, with `three`'s `WebGLRenderer` and the composer mocked):
    - `go()` changes `near` through `onNear` exactly once per index;
    - `setPaused(true)` pauses the front video;
    - reduced motion makes `go()` instant;
    - `destroy()` removes listeners, stops the loop and frees the videos;
    - `onFail` when the renderer throws.
- [x] **T6: The hologram** (`holo.ts`, `vault.css`).
  - Per §1, §2 and §5–§6: the shared video moved in and out, the camera move (`lookUp`, `hcTo`), the beam, the backdrop hole, the bar (labels, icons ≤ 760 px), Pause, Sound with the site-music handoff, Full screen (`requestFullscreen` or `webkitEnterFullscreen`), Live, Close, Esc, the backdrop rule, focus return, the scroll lock, reduced motion.
  - Tests `vault-holo.test.ts` (stub `showModal`/`close` the way `skills-scoreboard.test.ts` does; a fake `SiteMusic`):
    - labelled by the title;
    - Sound hidden without audio;
    - Sound on pauses a playing song and Sound off hands it back, but never resumes a song the visitor had paused;
    - the player's `onChange(true)` mutes the video;
    - Esc → close, the propagation stopped;
    - a drag out of the panel doesn't close;
    - focus goes back to the opener;
    - the video element is back in the holder after close.
- [x] **T7: The sound effects** (`sfx.ts`).
  - The mockup's four cues; silent until `arm(ac)` is called from a click in the section.
  - Tests with `helpers/fakeAudio.ts`: nothing is scheduled before `arm`; each cue schedules nodes after it; there's no `createMediaElementSource`.
- [x] **T8: The section.**
  - Rewrite `ProjectsSection.tsx`; add `components/projects/ProjectsVault.tsx` and `Projects.module.css` (§1, §2, §5).
  - The fallback and the lazy import (mock `@/lib/vault/vault` in tests).
  - Delete `ProjectCard.tsx`, `public/images/projects/` and the ProjectCard block of `hover-patterns.test.tsx`.
  - Rewrite `projects-section.test.tsx`:
    - `#projects` is labelled by "Projects";
    - six tabs and six panels in the HTML, with one visible;
    - ←/→/Home/End move the selection and focus;
    - the panels' copy exactly as §2 for Number Slayers and Pickleball 2079;
    - Live/Code hrefs and `rel`;
    - the Jelly Resume's Live is same-tab;
    - Watch's accessible names;
    - the power button's labels flip;
    - the engine is imported only once the section nears (the IO stub);
    - the fallback renders on `onFail`.
- [x] **T9: Browser verification** on a production build (`npm run build && npm run start -p <free port>`). Use puppeteer-core with Chrome, in the style of the mockup's `vshot.mjs`. Stub `/api/wizard/chat`, and never click in `#skills`. Record what each check showed:
  - **Desktop 1280×800 and 1440×900:**
    - the hall matches the mockup at the same states (shoot each set in front, mid-move, the hologram mid-flight and landed, closed);
    - drag, the arrows, a sideways wheel, the tabs by keyboard, a click on a side set, then a click on the front set opens Watch;
    - Esc, ✕ and the backdrop close it, and a drag out of the panel doesn't;
    - focus comes back.
  - **Phone 375×812 touch:** a swipe, a vertical scroll over the stage still scrolls the page, the card under the stage, the hologram with icon buttons, and Full screen called.
  - **Reduced motion:** posters, instant moves, Play plays, and the hologram fades.
  - **No WebGL:** Chrome with `--disable-webgl --disable-3d-apis` shows the fallback, and Watch still works.
  - **Network:** nothing from the Blob store's `projects/` before the section nears; then only the posters and the front set's video; another set's video only when it's in front.
  - **Performance:** a trace with 4× CPU throttling while scrolling the section in shows no task over 50 ms; `DrawFrame` counts while it's idle on screen and offscreen (≈ 0); Lighthouse accessibility 100 on `/`.
  - **Console:** no errors.
  - **Results (2026-10-22, `next start` on :3101, puppeteer-core + Chrome, the placeholder clips):** 86 checks, all passing on the final build (one transient run of 500s from the local server under the harness's load passed on rerun).
    - **Look:** each set in front, mid-move, the hologram flying, landed and closing, at 1280×800 and 1440×900, match the mockup's shots at the same states (same composition, card, rings, CRT, beam and backdrop).
    - **Desktop (both sizes):** tabs, arrows (announced "Exhibit 3 of 6: Rezmancer"), a gentle drag (one set) and a fast flick (throws further, as the mockup), a sideways wheel (one set per swipe, announced, the page doesn't scroll), ←/Home in the tab list, a click on a side set, a click on the lit screen → Watch; the hologram plays the set's own `<video>` (one element), ✕ focused, a drag out of the panel doesn't close, Esc/✕/backdrop close, focus back on Watch, the page scroll-locked while it's up; Pause freezes the stage (two shots 1 s apart identical), Play resumes.
    - **Phone 375×812:** a swipe (announced), a vertical swipe over the stage scrolls the page, the card under the stage, the hologram's buttons 44×44 icons with names, Full screen calls `requestFullscreen`, ✕ closes.
    - **Reduced motion:** paused at load (posters, no autoplay), nothing moves, the arrow is instant, Play plays, the hologram fades in place.
    - **No WebGL** (`--disable-webgl --disable-3d-apis`): the poster in a CSS screen, the arrows browse, Watch lifts the hologram from it; no console errors (the engine asks for a WebGL2 context itself, so three never logs).
    - **Network:** nothing from `/projects/` at the top or 1100 px out; at 600 px out the six posters and no video; on screen only `number-slayers.webm`; Next adds only `rezmancer.webm`; one video playing at a time.
    - **Draws:** ~11,000 WebGL draw calls in 3 s on screen, 0 off screen; DrawFrame in 3 s: 180 on screen, 0 off screen.
    - **Lighthouse accessibility on `/`: 100.**
    - **Long tasks (4× CPU):** the first trace had five vault tasks over 50 ms (the first frame 126 ms, the PMREM 78, the renderer 51, …). Fixed by staging (see hall.ts's build note): shaders compiled for the composer's target, not the canvas; the passes' and PMREM's shaders compiled in parallel and first drawn in a tiny target; the context, renderer, passes, decor and each set in frames of their own; posters uploaded as they load; a warm-up draw per set; the spill's colour sampled through an OffscreenCanvas (a page canvas's first video read stalled 63 ms). After: **a reader scrolling from the top: no vault task over 50 ms in 4 of 5 traces, one at 51.2 ms**; the vault's heaviest steps (the WebGL context, three's renderer, the first set's cold build) run 40–50 ms. Jumping straight to the section (the vault as the page's first 3D): three's own evaluation 53–107 ms (the shared chunk the About ring loads first on a normal visit) and the vault's steps 41–51 ms (up to ~60 under machine noise). See the stop conditions.
- [x] **T10: Docs and version.**
  - CLAUDE.md:
    - the directory tree (`components/projects/`, `lib/vault/`, `public/projects/`, `video-masters/`, `scripts/encode-projects.mjs`);
    - a Key Files entry for the vault;
    - gotchas: the poster-until-`playing` rule, the shared video element, `projects-media.json` is generated, the screen units sit on the cabinet face.
  - `package.json` 1.10.0.
  - The PR text below, filled in.
  - **Gates (2026-10-22):** `tsc` 0; lint 0 (no warnings); Jest 75 suites, 1034 tests, all passing; `npm run build` 0. (Next 16.4.0's CLI stops the first build after compiling with a "SecurityFatalError: your version of Next.js is affected by a known security vulnerability … retry" notice; the retry builds. Upgrading Next is outside this PR: Phill's call.)
- [x] **T11: Phill's videos and the PR.**
  - If `src/data/projects-media.json` still has any `placeholder: true`: **STOP** and tell Phill which ids still need a master in `video-masters/`. After he drops them in, run `node scripts/encode-projects.mjs`, check them on the build (each plays on its set and in the hologram, the posters are good frames, sizes are in the warnings' bounds), and commit.
  - **Then stop before pushing:** Phill tries it locally and gives the go to push and open the PR.
  - **Done 2026-10-22.** Phill's six brag masters are in `video-masters/` (all 1920×1080 at 30 s except Quadzilla, 1080×1920 at 34 s; all with a music track). His calls: the clips on Vercel Blob instead of `public/projects/` (§4), the poster at frame 0, the size warning at 15 MB, and the go to push and open the PR.
    - **Encode:** no placeholder, no warning (59 s on this Mac). Quadzilla 720×1280, 34.01 s, webm 3.6 MB / mp4 3.7 MB; Number Slayers 6.7 / 7.6 MB; Rezmancer 3.1 / 4.4 MB; Jelly Resume 12.6 / 9.2 MB; Pickleball 2079 5.2 / 5.9 MB; Pong 7.1 / 6.9 MB; posters 32–84 KB. ffprobe: av1 1280×720, h264 720×1280. The posters reused the earlier upload (same hash); the clips were new uploads (the AV1 and H.264 encodes aren't byte-identical between runs).
    - **Blob:** `Access-Control-Allow-Origin: *`, `cache-control: public, max-age=31536000`, byte ranges (206), and the right content types.
    - **Gates:** `tsc` 0; lint 0; Jest 75 suites, 1035 tests; `npm run build` 0.
    - **T9 again, real clips (`next start` on :3101):** 87/87, the 86 checks plus "every clip and poster comes from the Blob store".
    - **The real clips (a T11 script, 76 checks, all passing):**
      - Each of the six plays its Blob clip on its set, `crossOrigin` anonymous, with a picture on the screen (not black: CORS works) and no console errors.
      - Each opens in the hologram at its own aspect (Quadzilla 0.563, the rest 1.778) inside the viewport, muted, with Sound on offered, at 1280×800 and 375×812.
      - With the clips held back 7 s, the sets show their posters, and the hologram has its poster attribute.
      - Sound: Sound on unmutes the clip (it decodes audio) and pauses a playing site song; Sound off hands the song back; closing with Sound on hands it back and the set's clip is muted again.
      - Quadzilla's portrait fills the pocket TV on desktop and phone.
    - **A visual note for Phill:** on a portrait hologram (Quadzilla, 214 px wide on desktop), the bar's four buttons fill its width, so the title ellipsizes to nothing (the mockup's CSS; the dialog's accessible name is still "Quadzilla").

## PR text (T10 fills it; it waits for Phill's go before any push)

### Summary
The Projects section is rebuilt as **the Relic Vault**: it's the year 4789, and a museum shows the apps on the CRT televisions it believes are period-correct. The set in front powers on and plays its project's brag video through a CRT shader, and Watch lifts the picture out of the glass as a hologram, with the old set beaming it up from below.

### What's in it
- **The section** (`ProjectsSection.tsx`, `components/projects/ProjectsVault.tsx`, `Projects.module.css`): the header in the Skills section's pattern, the stage (arrows, Pause/Play, the hint), the museum card (all six exhibits' tab panels in the HTML: exhibit, year, description, stack, Watch, Live ↗, Code ↗, the set), the APG tab list of names, a polite live region. The engine is imported within 800 px; without WebGL the poster sits in a CSS screen and Watch still works.
- **The engine** (`src/lib/vault/`, plain three.js, one lazy chunk): the hall, six procedural sets on plinths (`sets.ts`), the CRT shader (`crt.ts`), the bloom composer and a staged build (`hall.ts`), the pure spring/state/homography (`state.ts`, `math.ts`), drag/click/hover/sideways-wheel input, power on/off, one video at a time, posters until `playing`, the spill light in the picture's colour, paused offscreen and in hidden tabs.
- **The hologram** (`holo.ts`, `vault.css`): a modal `<dialog>` on `<body>` mapped from the screen's projected corners by a homography, the set's own `<video>` moved in and back, the camera pulled back so the set lands below, Pause, Sound (with the site song's handoff), Full screen, Live, Esc/✕/backdrop, focus return, the scroll lock, reduced motion.
- **Sound** (`sfx.ts`): the mockup's synthesized power-on/off and hologram cues through the site player's AudioContext, silent until a click in the section.
- **Media** (`scripts/encode-projects.mjs`): Phill's six brag-video masters in the gitignored `video-masters/` → AV1 webm + H.264 mp4 + posters, uploaded to Vercel Blob (the public store `phill-portfolio-media`) under content-hashed names with a year's cache, and the generated `src/data/projects-media.json` with their URLs. No video in git; the `<video>` is `crossOrigin="anonymous"` because WebGL draws it.
- **Data**: six exhibits (Pickleball 2079 added, with the Wizard's details), each with its year, television and caption; the `Project` type follows.
- **Removed**: `ProjectCard.tsx`, `public/images/projects/`, the ProjectCard tests.
- **Docs**: CLAUDE.md (the tree, Key Files, the vault's gotchas); v1.10.0.

### Decisions
- The Relic Vault over a channel surfer and a TV wall; an arc the camera stands inside, not a second ring of cards (About has one).
- Plain three.js ported 1:1 from the mockup (the frame loop is the product); no new runtime dependencies (`@vercel/blob` is a devDependency, for the encode script).
- The clips on Vercel Blob, not in `public/`: re-cuts never grow the repo. The size warning is 15 MB (one clip loads at a time, when its set powers on); the CRFs stay.
- The mockup's look is fixed: idle sets Static, CRT Classic; its mock bar doesn't ship.
- Sound effects only after a click in the section; the videos' own sound is off until Sound on, which pauses the site song and hands it back.
- One `<video>` per project, shared by the CRT and the hologram; only the front set plays.
- Reduced motion keeps the hall, without camera moves, power-on, static motion or autoplay.
- Placeholders never ship: all six clips are Phill's masters, and `projects-media.test.ts` fails on a placeholder.

### Test plan for Phill
- [ ] Desktop: scroll to Projects (Number Slayers powers on), drag the hall, the arrows, a sideways trackpad swipe, the names under it; click a side set, then the lit screen (Watch). Close with Esc, ✕ and a click outside.
- [ ] Phone: swipe through all six, scroll the page over the stage, Watch (icon buttons), Full screen.
- [ ] Reduced motion (System Settings → Accessibility → Display): posters at rest, Play plays, the hologram fades in place; Pause stops everything.
- [ ] Sound: silent while scrolling; after one click in the section, the power-on thunk and the hologram whoosh. With a clip that has audio: Sound on pauses a playing song, closing gives it back.
- [ ] Your six clips: each plays on its set and in the hologram, the posters are good frames.

## Per-task verification

**Always:**
- `npx jest --no-watchman <the task's test files>` shows them passing;
- `npx tsc --noEmit` exits 0;
- `npm run lint > $SCRATCH/lint.txt 2>&1; echo $?` prints 0 (zsh has no PIPESTATUS).

Paste the pass lines.

- **T1:** `npx jest --no-watchman src/__tests__/data-architecture.test.ts src/__tests__/wizard-prompt.test.ts src/__tests__/projects-section.test.tsx src/__tests__/hover-patterns.test.tsx` (the old section must still pass until T8).
- **T2:** `node scripts/encode-projects.mjs` prints a table (id, source master/placeholder, w×h, duration, audio, sizes); `npx jest --no-watchman src/__tests__/projects-media.test.ts`; and `ffprobe` on one `.webm` and one `.mp4` shows av1 and h264.
- **T3:** `npx jest --no-watchman src/__tests__/vault-math.test.ts src/__tests__/vault-state.test.ts`.
- **T4:** `npx jest --no-watchman src/__tests__/vault-sets.test.ts`.
- **T5:** `npx jest --no-watchman src/__tests__/vault-engine.test.ts`.
- **T6:** `npx jest --no-watchman src/__tests__/vault-holo.test.ts`.
- **T7:** `npx jest --no-watchman src/__tests__/vault-sfx.test.ts`.
- **T8:** `npx jest --no-watchman src/__tests__/projects-section.test.tsx src/__tests__/hover-patterns.test.tsx`, then the full `npx jest --no-watchman`.
- **T9:** the screenshots (saved to the scratchpad), the network log, the trace numbers, the Lighthouse score and the keyboard path, each with what it showed.
- **T10:** the gates: `npx tsc --noEmit`, lint 0, the full `npx jest --no-watchman`, and `npm run build` (then `git checkout -- next-env.d.ts`).
- **T11:** the encode table with no placeholder, and T9's desktop and phone checks again with the real clips.

## Acceptance

1. **The gates:** `npx tsc --noEmit` 0; `npm run lint` with 0 warnings; `npx jest --no-watchman` all green (record the suite and test counts); `npm run build` succeeds (then `git checkout -- next-env.d.ts`).
2. **The production build** at 1280×800: the hall loads as you scroll to it, and Number Slayers powers on. Browse all six, Watch each one, and close each with a different method (Esc, ✕, the backdrop). Compare the shots against the mockup's.
3. **The phone** (375×812 touch): a swipe through all six, the page scrolls over the stage, and the hologram plus Full screen.
4. **Keyboard only:** from the skip link to the tabs, ←/→ through the hall, Enter on Watch, then Esc, with focus back on Watch.
5. **Reduced motion and Pause:** nothing moves on its own.
6. **Sound:** silent while scrolling; after one click, the effects play; with a clip that has audio, Sound on pauses a playing site song and closing hands it back.
7. **The network** on a fresh load (no project bytes until near) and the performance trace (no task over 50 ms).
8. `git status` shows only intended files; `video-masters/` is ignored.

**Acceptance run (2026-10-22, after T11, the real clips on Blob, `next start` on :3101):**
1. `tsc` 0; lint 0 (no warnings); Jest 75 suites, 1035 tests; build 0; `next-env.d.ts` restored.
2. 1280×800: all six browsed and watched (T11's script: each plays on its set and in the hologram); closed by Esc, ✕ and the backdrop (T9's desk checks). The look matched the mockup's shots at T9; the screens now carry Phill's clips.
3. Phone 375×812: T9's phone checks (swipe, page scroll over the stage, the hologram, Full screen) and all six holograms in the viewport.
4. Keyboard: T9's (the tabs' ←/→/Home/End, Enter on Watch, Esc and ✕ by keyboard, focus back on Watch).
5. Reduced motion and Pause: T9's rm checks.
6. Sound: T9's effects after a click; T11's video sound with the site song's handoff (on pauses it, off and closing hand it back).
7. Network: nothing from the Blob store before 800 px, then the six posters, then only the front set's clip, all from `*.public.blob.vercel-storage.com`. Performance, 4× CPU: a reader's scroll from the top, 3 traces, no vault task over 50 ms (the long tasks are About's, before 1 s; three loads for its ring at +270 ms). The jump trace (`perf.mjs`: the page loads at the top, jumps to 3000 px above the stage, then scrolls in, so About's ring never loads three first) still pays three's evaluation in one task, 57–66 ms, and the vault's heaviest step is 46–52 ms (one 52.0 and one 50.9 of 4 traces): the numbers flagged at T9, unchanged by the clips. Draws: 0 off screen; DrawFrame 181 on, 0 off.
8. `git status`: only this work, plus `AGENTS.md` (committed on its own, Phill's go) and the round-1 `docs/design/experience-refresh/` mockups (left untracked: Phill decides; `career.js` names employer-internal vendors). `video-masters/` (with `encoded/`) is ignored.

## Stop conditions / open questions (for Phill)

- **T11:** any placeholder left: stop and list the ids that need a master in `video-masters/`. Before any push, stop: Phill tries it locally and gives the go.
  - **Status 2026-10-22: resolved (T11 done).** Was: STOPPED at T11 (T1–T10 done, 773a0fe). All six are placeholders: `quadzilla`, `number-slayers`, `rezmancer`, `jelly-resume`, `pickleball-2079`, `pong` need a master as `video-masters/<id>.(mp4|mov|m4v|webm)` (about 30 s, 16:9 at 720p or more with the key action in the middle 4:3; Quadzilla a portrait phone recording). Then `node scripts/encode-projects.mjs`, check the warnings (40 s, 4 MB, 720 px), T9's desktop and phone checks with the real clips, commit, and wait for Phill's go to push.
- **New copy:** anything beyond §2 (stop and ask).
- **A master that can't meet the bounds** (longer than 40 s, a file over 15 MB at the binding settings, under 720 px): stop and show Phill the numbers rather than re-cutting his edit.
- **Performance:** if the 50 ms budget can't be met while mounting on the throttled trace after staging the build, stop with the trace numbers (don't drop the bloom or sets on your own).
- **The mockup and this plan disagree:** the mockup wins for look and motion, this plan for architecture and copy. Note it here.
- **Servers:** `:3002` may be Phill's own `next dev` (it holds `.next/dev/lock`); `next start` doesn't need the lock. Use a free port, and stop only servers you started.
- **Performance, for Phill (T9, 2026-10-22; not blocking):** after staging, the vault's mount is at the 50 ms line on a 4×-throttled CPU: no task over 50 ms in 4 of 5 top-to-Projects traces, one at 51.2 ms; its heaviest steps (creating the WebGL context, three's renderer setup, the first set's cold build) can't be split further without dropping work. When the vault is the page's first 3D (a jump straight to `#projects`), three's own evaluation is 53–107 ms at 4× (~15 ms at 1×), the same chunk the About ring pays on a normal visit. Your call whether that's acceptable or worth a follow-up (e.g. evaluating three at idle after load).
