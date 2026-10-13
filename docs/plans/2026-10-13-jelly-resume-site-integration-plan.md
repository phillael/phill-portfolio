# Jelly Resume → phillcodes.com: site integration

**Date:** 2026-10-13 · **Owner:** Phill · **Branch:** `feat/jelly-resume-site`. T0 creates it from `feat/jelly-resume-playground`, which already sits on `origin/master` and carries the playground, `HANDOFF.md` and the earlier plan.

## Context

### What exists
The **Jelly Resume** is a 3D, physics-driven copy of Phill's Rezmancer resume, and it's finished as a design. It lives in one self-contained playground, `docs/design/jelly-resume/playground.html` (~3,500 lines of raw WebGL2, no dependencies).

**Read first:** `docs/design/jelly-resume/HANDOFF.md`. It has the code map, every decision, all measurements, and the sections "Session 7", "Changes 2026-10-13" and "Porting to the real site". The playground is the **reference implementation**: port its behavior and its look, not its playground scaffolding (the settings sidebar, presets, Copy prompt, data box and the site mock).

To run the playground (it needs the gitignored `docs/design/jelly-resume/rezmancer-snapshot.js` locally, which exists on Phill's machine): `python3 -m http.server 8765 --bind 127.0.0.1` from the repo root, then http://127.0.0.1:8765/docs/design/jelly-resume/playground.html.

### What we're building
Phill approved the following through the playground loop and his feedback on 2026-10-13:

- **The home page stays exactly as it is.** No new strip, no new buttons. The **hero photo** becomes the way in.
  - It's a real button with a hover/focus hint: the glow brightens, the photo lifts, and a "✨ click to open my resume" tooltip follows the cursor.
  - On touch screens, a small "✨ tap to open my resume" tag sits under the photo (decided 2026-10-13: phones have no hover).
- **Clicking the hero dissolves it into the resume.**
  - The photo is sampled into ~18K comet sparks (~6K on phones) that sit exactly on its pixels.
  - A ragged front sweeps out from the click. Each spark heats from the photo's color to white-hot and then follows the comet ramp, while the page chrome fades and blurs away to reveal the nebula.
  - The photo then **reshapes straight into the page**: glyph sparks take over the hero sparks rank for rank in reading order, and stream into their words top-first while a scanline prints the page. There is **no galaxy step** (Phill: "cooler if it just went right from the hero image to the resume").
- **The nav Resume button stays a plain PDF download.** Phill: no friction for people who just want the file. The resume's HUD also has ⤓ PDF.
- **A real `/resume` URL** (decided 2026-10-13):
  - Opening from the hero shows the resume over the home page at `/resume`; Back closes it, playing the reverse; Forward reopens it.
  - A direct visit or shared link to `/resume` opens straight into a quick galaxy intro (there's no hero to dissolve).
  - `/resume?find=React` runs the Finder after the page lands.
  - The `/resume` route also renders a **semantic HTML resume** for SEO and screen readers.
- **Close** (×, Esc, Back) plays the dissolve in reverse: the words burst into sparks that fly home to the photo's pixels, cooling back to the photo's colors, and the hero and chrome cross-fade back in.
- **The HUD ships** (Phill: "that stuff is fun for the user"): ⤓ PDF, Chaos, Burst all, Heal all, Shroom, Black hole, Sound, Intro, View, the Finder (search + chips), the navigator (mini map, ✥ Pan / ⟳ Rotate, − / Fit / +) and ×. The settings sidebar does **not** ship.
- **One music player.** The site's `MusicFAB`/`MusicPlayer` stays on screen above the resume. A song started on the site keeps playing when the resume opens, and the words dance to it. The resume has **no music button of its own**; P still toggles the site player.
- **The 🍄 Shroom Wizard can offer the resume.** Like its existing `offer_mushroom` tool, an `offer_resume` tool shows an offer bubble ("Shall I summon Phill's resume? ✨"); confirming opens the resume with the blue-violet heat tint. Verification never calls the real chat API.
- **No phone or email on the web** (decided 2026-10-13): the repo is public, so the web snapshot drops them. LinkedIn and GitHub stay, and the PDF keeps everything.
- **prefers-reduced-motion:** the hero (and every trigger) navigates to the plain `/resume` page with no WebGL at all. That page is the playground's "plain HTML resume dialog" promoted to a real page, with the same content and Download PDF.
- **Physics and look:** Phill's tuned defaults (Binding, below). "Into the Void" physics: clicked words fly off into space, toward the camera or past the page edge, burst into comet sparks, and swarm home.

### Why the engine is ported as-is (an exception to CLAUDE.md's R3F rule)
CLAUDE.md says "Use R3F + drei, not raw Three.js boilerplate". **Phill approved an exception on 2026-10-13.** The engine isn't Three.js: it's custom WebGL2 with hand-written shaders, instanced comet sparks, CPU soft-body physics on typed arrays, a CPU-mirrored bend function and a baked nebula. A rewrite in R3F would be large and risky, and could lose the tuned feel.

So port it as **plain TypeScript modules plus one WebGL2 canvas**, loaded with `next/dynamic({ ssr: false })` behind the triggers. Every other CLAUDE.md performance rule still applies: lazy-load, one canvas, never setState per frame, pause when hidden. T13 records the exception in CLAUDE.md.

### Architecture (recommended; verify the Next 16 APIs with context7 before relying on them)
- **Engine:** `src/lib/jelly/`, framework-free TS modules split from the playground: shaders, physics, bend, particles and trails, camera and navigation, sky/stars/mist, finder, black hole, SFX, hero pool, dissolve/handoff/close, and input. The constructor takes a canvas, a snapshot, a config and callbacks; it exposes `open({ origin, find })`, `close()` and `dispose()`. React never re-renders per frame.
- **Overlay host:** a client `JellyResumeHost` mounted once in `src/app/layout.tsx`, **outside** `#shroom-target`/`#shroom-warp` (CLAUDE.md gotcha: filters and transforms there break `position: fixed`).
  - It owns the canvas, the engine and the HUD, and lazy-loads the engine chunk on the first trigger hover, focus, touchstart or click.
  - It stacks above the page and the Nav but **below** `MusicFAB` (z-50).
- **Routing:** use Next **intercepting + parallel routes** (`app/@modal/(.)resume/page.tsx` plus `app/resume/page.tsx`).
  - From the home page, `/resume` renders into the modal slot while the home page stays mounted underneath, so the hero exists for the reverse close.
  - A direct visit renders `app/resume/page.tsx` (the semantic resume), and the host opens straight into the quick galaxy intro.
  - The slot component only tells the host "open" or "close". The host plays the reverse close itself, because the slot unmounts at once on Back.
  - If intercepting routes can't keep the home page mounted in Next 16, **stop** (see Stop conditions).
- **Snapshot assets:** `public/resume/snapshot.json` (word boxes and styles) plus `text.webp` and `decor.webp`, generated by `docs/design/jelly-resume/tools/snapshot.mjs --web`. No phone, no email, and no JS global.
- **Page under the dissolve:** the canvas uses `alpha: true` and starts transparent. The real home page (Vortex, GlowEffect) shows through, and the canvas fades its nebula sky in over ~0.7 s while the page content fades and blurs out with CSS. This replaces the playground's `SITEBG_FS` site-background emulation (that existed only because the playground had no real page under it).

### Rejected (don't rediscover)
- A rewrite in R3F (see above).
- Shipping the settings sidebar or presets: it's a dev tool only.
- A galaxy step between the hero and the page (kept only as a playground option).
- Skills chips under the hero: removed at Phill's request. Deep links still work via `?find=`.
- Making the nav Resume button open the 3D resume: it stays a download.
- A second music player inside the resume.
- A JS-global snapshot (`window.REZ_SNAPSHOT`): use JSON + WebP in `public/resume/`.

## Binding — do not redesign

- **Behavior and look:** whatever the playground does at its current defaults (`git show feat/jelly-resume-playground:docs/design/jelly-resume/playground.html`, `DEFAULTS` + the "Site integration" paragraph of its Copy-prompt text). If the port and the playground disagree, the playground wins.
- **Phill's tuned config** (the playground `DEFAULTS` as of commit `2328f85`). Port it as a frozen `JELLY_CONFIG` const:
  ```json
  {"granularity":"word","space":"fly","stiffness":900,"damping":4,"homePull":60,"breakDist":0.45,"boldSoft":2.2,
   "contagion":0.35,"escape":0.15,"airDrag":0.35,"gravity":12,"bounce":0.5,"autoBurst":true,"floatTime":3.5,"burstSpeed":7,
   "clickBurst":true,"burstForce":5.4,"burstTime":2.2,"reformTime":1.1,"pSize":0.75,"pColor":"comet","returnTime":1.0,
   "trail":1.3,"swirl":1.4,"flash":0.95,"pGlow":1.5,"shockwave":0.5,"pDensity":1.2,"pageFinish":"paper","grain":0.5,
   "paperThick":0.08,"paperBend":0.5,"paperCurl":0.55,"inkFinish":"chrome","shine":0.75,"textDepth":0.5,
   "fingerRadius":0.7,"fingerForce":20,"flick":0.8,"smack":5,"slosh":0.4,"gummy":0,"jelly":"purple","tilt":0.05,"yaw":0,"zoom":1,
   "melt":0.7,"drip":0.5,"dropRate":0.3,"hueSpeed":0.12,"backdrop":"nebula","nebula":"philcodes","nebulaSeed":1,
   "nebulaBright":1,"starDensity":1.7,"mist":0.6,"fgMist":1,"mistDrift":1.3,"fog":0.55,"quality":"auto",
   "soundOn":true,"volume":0.7,"introTime":3,"holePull":1,"tiltForce":12,"shake":true,"dance":1,"danceStyle":"groove",
   "mosh":0,"pulse":0.7,"heroPath":"page","dissolveTime":2.1,"heroSparks":1}
  ```
- **Earlier decisions** (HANDOFF "Decisions"): no drop shadows; no musical notes on clicks (SFX only: the black-hole drone, gulps and boom, and the entrance whoosh); drag rotates by default and words aren't draggable; comet sparks have no green and no pink (the 🍄 tint is blue-violet `#996bff`); the whole page fits by default; Rezmancer formatting is exact; an outer-space nebula; site colors; performance and mobile are hard requirements.
- **Copy:**
  - Hero button `aria-label="Open the interactive resume"`; desktop tooltip "✨ click to open my resume"; touch tag "✨ tap to open my resume".
  - Wizard offer: "Shall I summon Phill's resume? ✨" with Summon / Not now.
  - Close: `aria-label="Close the resume (Esc)"`.
- **Accessibility** (CLAUDE.md: WCAG 2.1 AA, 44×44 touch targets, visible focus): hidden UI is `inert`; focus returns to the trigger on close; the canvas is `aria-hidden` and the semantic resume is the accessible content.
- **Privacy:** nothing with Phill's phone number or email goes into `public/` or git. The playground's `rezmancer-snapshot.js` stays gitignored and is never imported.

## Task checklist

Order matters: T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7. T8–T11 need T7. T12 needs everything before it. T13, then T14 last.

- [x] **T0: branch + green baseline.**
  - `git fetch origin && git switch -c feat/jelly-resume-site feat/jelly-resume-playground`. If `origin/master` has moved past the branch's base, rebase onto it first.
  - Run all four gates and record the results in the plan: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - **Baseline (2026-10-13, Next 16.4.0):** `origin/master` (f15f49d) is already an ancestor, so no rebase. `tsc` clean; `lint` zero warnings; `npm test` 41 suites / 395 tests passed (run as `npx jest --no-watchman`: plain `npm test` stalls on a missing watchman socket on this machine); `build` OK, all routes static except the two wizard APIs.
  - **Home first-load JS** (Next 16 no longer prints sizes, so T11 compares this): the 12 unique `/_next/static/**/*.js` chunks referenced by `.next/server/app/index.html` total **864,657 B raw / 270,611 B gzip-9 (264 KiB)**. Method: `grep -oE '/_next/static/[^"]+\.js' .next/server/app/index.html | sort -u`, then sum `wc -c` and `gzip -9c | wc -c` of each `.next/static/...` file.
- [x] **T1: the web snapshot assets.**
  - Extend `docs/design/jelly-resume/tools/snapshot.mjs` with `--web`. Before measuring, it removes the phone and email items from Rezmancer's contact line together with their separators; the email is a `mailto:` link, so find the phone's node in the markup.
  - It writes `public/resume/snapshot.json` (words, page, content, dpr) plus `public/resume/text.webp` and `public/resume/decor.webp` (WebP, 2× instead of 3×, to cut the ~1 MB text layer).
  - Source: `~/Desktop/dev/rezmancer/out/Phill_Aelony_Resume_AI_Engineer.html`.
  - Document the regenerate command in HANDOFF.
  - **Done 2026-10-13:** the phone and email are each their own `ul.contact > li` (separators are `.contact li + li::before`), so `--web` removes those two `<li>`s and refuses to write if it doesn't remove exactly two or if a phone/email/`mailto:`/`tel:` survives. **631 words** (the playground's 634 minus `(612)`, the number and the email; every other word is identical), so read T3/T6's "634 words HOME" as 631. Sizes: `text.webp` 257 KB (playground PNG 1,002 KB), `decor.webp` 7 KB (26 KB), `snapshot.json` 76 KB. The contact line's `·` separators are missing in the images, the same as the playground (HANDOFF open item 6).
- [x] **T2: resume content + the semantic `/resume` page.**
  - `src/data/resume.ts`: the playground's `DATA` (already without phone and email), typed.
  - `src/app/resume/page.tsx`: a server-rendered, semantic, accessible resume built from it, with a Download PDF link (`/Phillip_Aelony_Resume_2025.pdf`), a link back home and the site's styling. Give it its own `metadata` (title, description, canonical `/resume`, OG) and add it to `sitemap.ts`.
  - This page is also the reduced-motion and no-JS experience.
  - **Done 2026-10-13.** Two judgment calls for Phill to overrule if he disagrees:
    - **Content = what the 3D page shows.** The playground's `DATA` mirrors Rezmancer's full `resume.yaml` (10 TimelyCare bullets), but the snapshot is the **AI Engineer variant** (8 bullets, reordered; no `nurture-sending` or `phi`), and Number Slayers carries a `numberslayers.com` link `DATA` lacked. Since the semantic page is the canvas's accessible equivalent, `resume.ts` follows the variant; a Jest test checks every summary/bullet/project/entry text appears in `public/resume/snapshot.json`, so the two can't drift silently.
    - **Nav links work off the home page.** Nav's section links were `#about`-style anchors whose click handler only scrolls, so they were dead on `/resume`. `useHomeBase()` (in `NavLinks.tsx`, via `usePathname`) makes them `/#about` off `/` and lets the browser follow them; on `/` nothing changes (verified: `#hero`, `#about`, …).
  - Setting `openGraph` on the page replaces the layout's, **including the file-based share card**, so the page names `/opengraph-image` and `/twitter-image` again (built HTML now has `og:image` + `twitter:image`).
  - **Open item for Phill (not blocking):** `/Phillip_Aelony_Resume_2025.pdf` (nav button and this page) is the **old 2025 resume** ("Legendary Code Sorcerer…", 6+ years), not the AI Engineer resume the 3D page shows. Swap in Rezmancer's `out/Phill_Aelony_Resume_AI_Engineer.pdf` when he's ready (it has the phone and email, as the current PDF does).
- [x] **T3: port the engine core** into `src/lib/jelly/`: the snapshot loader (JSON + WebP), word bodies and physics, bursts and comet sparks, the bending sheet, sky/stars/mist, camera and map navigation, the Finder, the black hole, dance targets (fed by an analyser callback, wired in T8), and SFX. Use `JELLY_CONFIG` and no settings UI.
  - Add a client `JellyResumeCanvas` that runs only the **direct-visit** path, the quick galaxy intro, on `/resume` above the semantic page. The semantic page stays in the DOM; the canvas is `aria-hidden`.
  - Pure helpers (config, snapshot parsing, the reading-order rank mapping, find matching, `isMetric`) get Jest tests.
  - **Done 2026-10-13.** Modules share one `World` (typed arrays, bodies, camera): `config` (frozen `JELLY_CONFIG` + runtime `JellyState`), `math`, `snapshot`, `finder`, `order`, `bend`, `galaxy`, `shaders` (extracted verbatim by script; only change: `uAmt` on sky/stars/mist so the backdrop fades in over the real page), `gl`, `sfx`, `music` (`MusicFeatures` over any `AnalyserNode`), `world` (bodies, atlas, sparks), `physics`, `dance`, `intro`, `camera`, `render`, `input` (canvas pointer/touch/wheel; keyboard is T4), `engine` (API: `load`, `openDirect`, `find`, `chaos`, `burstAll`, `healAll`, `setShroom`, `setSound`, `setHoleMode`, `holeAtCursor`, `releaseHole`, `replayIntro`, `resetView`, `zoomBy`, `setNavMode`, `setUiInsets`, `stats`, `dispose`; loop paused while the tab is hidden; dev-only `window.__jelly`). Not ported on purpose: the settings sidebar, presets, Copy prompt, runtime reflow layout, `SITEBG_FS` and the fall-mode floor. Hero pool/dissolve/close wait for T6/T7, HUD/keys/tilt/mini map for T4.
  - `JellyResumeDirect` (client, `next/dynamic({ ssr: false })` + `useMediaQuery` reduced-motion guard) mounts `JellyResumeCanvas` on `/resume`; it reads `?find=` on the client because the page is static.
  - **Verified (dev, 1440×900):** the canvas fades the nebula in over the semantic page, the galaxy prints the page, `__jelly.stats()` → 631/631 HOME, 120 fps, physics 1.25 ms; Chaos → 108 loose, Burst all → 631 bursting, all 631 HOME again ~9 s later, 120 fps throughout; no console errors. Side-by-side with the playground's `#resume`: same chrome ink, paper, curl and nebula. Jest: `jelly-helpers` 16 tests (config = the plan JSON, snapshot parsing, Finder "AI" 27 / "React" 14 on the real snapshot, reading-order handoff, bend table vs formula), `jelly-resume-canvas` 2 tests (engine mocked; reduced motion never creates it). Build: the engine is its own chunk (77 KB raw / 29.5 KB gz) in neither `/` nor `/resume` first load; home first-load 271,176 B gz (T0: 270,611; +565 B is the nav's `usePathname`).
- [x] **T4: the resume HUD and controls** as React components around the canvas: the finder (search + chips), the navigator (mini map, mode toggle, zoom), the HUD bar (⤓ PDF, Chaos, Burst all, Heal all, Shroom, Black hole, Sound, Intro, View, hints and touch-only Tilt) and ×. Port the keyboard shortcuts.
  - Close on a direct visit navigates home with a simple fade; the reverse close comes in T7.
  - Add a component test for the HUD buttons, labels and the PDF link's `download`.
  - **Done 2026-10-13.** `JellyResumeCanvas` is now the overlay (`<section aria-label="Interactive resume">`, canvas + HUD) with `JellyFinder`, `JellyNavigator` (view box follows the camera through `engine.onFrame`, writing styles, no React state), `JellyHudBar` and ×; styles in `hudStyles.ts`. The HUD fades in (0.6 s after 0.4 s) once the snapshot loads and is `inert` until then. The engine gained `navView`/`navTo`/`drawMiniMap`, `panKey`, `setTilt` (iOS permission; tilt + shake listeners) and `releaseHoleKey`. Keys as in the playground (S C B H R 0 G M I O / Esc, arrows/Page/Home/End, + −, hold Space); P waits for the site player (T8). × and Esc fade out over 0.4 s, then `router.push('/')`.
  - Deviations from the playground, all small: phone touch targets are 44 px (chips were 36 px; CLAUDE.md's rule), shortcuts ignore ⌘/Ctrl/Alt chords (⌘C no longer triggers Chaos), Space/Enter on a focused button activate it instead of opening the black hole, and keys work while a Finder chip has focus (only the text box keeps its keys).
  - **Verified (dev):** 1440×900 and 390×844 side by side with the playground's `#resume`: same Finder/chips, navigator, × and bar (rows wrap the same on the phone; the playground has an extra ⚙ Controls row that doesn't ship), the bar leaves room for the site's ♫. AI chip → "27 words", page dims, matches glow and link; Chaos → 97 loose; Burst all → 631 bursting, all 631 HOME again; 🕳 + press-and-hold → hole 0.86, 10 words eaten, 74 loose, released; `?find=React` → "14 words" once landed; Esc clears the search, a second Esc fades to `/` and disposes the engine. Console clean (the Finder input got an `id`/`name` after a DevTools issue). Jest `jelly-resume-canvas` 8 tests (controls + labels, PDF `download`, buttons → engine, chip count, keyboard, × fade).
- [x] **T5: overlay host + routing.**
  - Mount `JellyResumeHost` in the layout, outside the shroom wrappers, with the z-order above (above the Nav, below `MusicFAB`).
  - Add the intercepting/parallel route so `/resume` opened from the home page keeps the home page mounted.
  - `router.push('/resume')` / Back / Forward drive open and close. `/resume?find=X` runs the Finder after landing. A direct load still works (T3).
  - The engine chunk is lazy: no engine JS on the home page's first load.
  - **Done 2026-10-13** (APIs checked in the Next 16.4 docs bundled at `node_modules/next/dist/docs`; context7 only exposes its auth tools here). Intercepting routes **do** keep the home page mounted, so no stop. Files: `app/@modal/default.tsx` and `app/@modal/page.tsx` (null), `app/@modal/(.)resume/page.tsx` → `<JellyResumeRoute mode="overlay" />`; `app/resume/page.tsx` → `<JellyResumeRoute mode="direct" />`; the layout takes the `modal` slot and mounts `JellyResumeHost` after `#shroom-target`, before `MusicPlayer`. The route components only open/close a tiny store (`resumeRoute.ts`, keyed so a stale unmount can't close a newer open); the host owns the lazy `JellyResumeCanvas` (`next/dynamic`, `ssr: false`), fades it out for 0.4 s when the URL leaves `/resume`, then unmounts it (engine disposed). × / Esc: an overlay calls `router.back()`; a direct visit fades and `router.push('/')`. Reduced motion: never mounts; an overlay request hard-reloads into the plain page (T10 refines the triggers). Pushes use `{ scroll: false }`. Dev-only `window.__jellyHost.open(find?)` does the hero's push until T6.
  - **Verified (dev, after a restart for the new slot):** from `/` scrolled to 600 px, `__jellyHost.open()` → URL `/resume`, `#hero` still in `main#main`, overlay up, 631/631 HOME, scroll kept; Back → overlay gone, `__jelly` disposed, scroll 601; Forward → reopens, 631 HOME; × → `/`; `open('React')` → `/resume?find=React`, "14 words"; Esc twice → clears, then `/`; hard load `/resume?find=React` → semantic page + overlay, "14 words"; fresh `/` loads 21 scripts, none Jelly, no snapshot request. The overlay is outside `#shroom-target`; `elementFromPoint` at the Nav hits the overlay and at the ♫ hits `MusicFAB`. Console clean. **Build:** `/`, `/resume` and `/(.)resume` all static; home first-load 271,567 B gz (T0 270,611); engine + HUD in one 34.9 KB gz chunk outside every first load. Jest: host tests (empty until a route asks; direct mount + `?find=`; leaving fades and disposes; × → Back / fade + `push('/')`; reduced motion never mounts) + the HUD tests, 18 total.
  - Not done here on purpose: making the page under the overlay `inert` (T10 decides how the semantic resume stays reachable to screen readers while the canvas covers it).
- [x] **T6: the hero becomes the trigger + the dissolve (straight to the page).**
  - `HeroImage` is wrapped in a real `<button>` with the hover/focus hint (the glow boost can be a CSS class on `GlowEffect`) and the touch-only tag.
  - Prefetch the engine chunk and the snapshot on hover/focus/touchstart.
  - The hero pool samples the rendered `next/image` element (same origin, so `getImageData` works) at its displayed size; then come the dissolve, the chrome fade/blur, and the rank-for-rank handoff into `intro.direct`.
  - While a slow load finishes, the sparks hover near the photo.
  - **Done 2026-10-13.** `src/lib/jelly/hero.ts` ports the hero pool, dissolve, reading orders (idle-sorted, cached) and handoff; the renderer draws the pool with its own instanced buffers (uploaded only when dirty); the engine gained `openFromHero({ img, origin, tint, find })` and an `onOpen` callback (handoff, or a direct entrance starting). The photo is sampled at its `object-fit: contain` rect, not the `<img>` box. `HeroImage` is a `<button aria-label="Open the interactive resume">` (cursor-following "✨ click to open my resume" set via CSS vars, no re-render; "✨ tap to open my resume" tag on coarse pointers; glow `scale(1.12) brightness(1.5)` on hover/focus; `motion-safe` 6 px lift). `resumeTrigger.ts` (in the home first load, engine only via `import()`) holds the hero `<img>`, the intent (origin, tint, opener) and the prefetch; the host registers the soft navigation (`router.push(url, { scroll: false })`), so the hero needs no router (and its tests none). The page fades/blurs with `#shroom-target.jelly-dissolving`, then `.jelly-gone` (`visibility: hidden`) at the handoff; focus moves to the overlay section then. An overlay open always dissolves from the hero (Forward replays it from the photo's center, as the playground's `syncRoute` does).
  - Bugs found and fixed on the way: dev StrictMode mounts the overlay twice, so the intent is peeked and only cleared on open; and a second × / Esc before the route changed called `router.back()` twice (leaving the page), so the host now honors one close per open (test added).
  - **Verified (dev, 1440×900):** hover prefetches two chunks plus `snapshot.json`, `text.webp`, `decor.webp`. Click → 18,134 hero sparks, **reprojection error 0.0001 px** for every spark the front hadn't reached, photo hidden, page `jelly-dissolving`; frames at ~0.4 / 0.57 / 0.75 s show the ragged front sweeping out from the click (chest) with white-hot → cyan sparks and the chrome gone to the nebula; just before the handoff every spark is hot and hovering in the photo's shape. **Handoff:** at 10× slow motion the handoff frame changes the canvas by a mean 1.10 levels vs a 0.14 median per frame before (then 0.76, 0.47, 0.28: the trails' velocity smoothing settling, same as the playground); at real speed it is 1.61 vs a 1.05 median and 2.1 two frames later as the camera starts its swing, i.e. no visible pop. **All 631 HOME 4.5 s after the dissolve starts** (5.0 s after the click; the dissolve starts ~0.5 s after the click in dev, T11 measures prod). Phone (390×844, touch): tap tag shown, 6,033 sparks, all HOME 4.6 s after the tap. Slow load (snapshot delayed 4 s by an init-script `fetch` wrapper): all sparks hot by 1.9 s, hovering in the photo's shape until it lands at ~4.4 s, then handoff, all HOME by 7.5 s. Esc (twice) → `/`, page restored, photo visible, engine disposed. Console clean. Build: home first-load 272,469 B gz (T0 270,611), no engine/HUD/snapshot code in it. Jest: `jelly-hero-trigger` (4) + overlay tests (9, incl. the double close). A dev-only `__jelly.setTimeScale(k)` slows the engine for these checks.
  - Until T7 the close is the plain fade: the page and photo come back under the fading overlay.
- [x] **T7: the reverse close.** ×, Esc and Back (the host keeps the canvas alive after the slot unmounts) burst the words into the hero pool, fly them to the `HeroImage` pixels re-derived from the moving camera, cool them to photo colors, cross-fade the hero and chrome back in, and return focus to the trigger. Open → close repeats cleanly, including closing mid-Chaos.
  - **Done 2026-10-13.** `hero.ts` ports `reverseClose`/`updateClosing` (`startClosing`, `updateClosing` returning `'landed'`/`'done'`); the engine's `close(img)` builds the pool on the photo, bursts every word into it (`startIntro(true)`), un-prints the sheet bottom to top, swings the camera out, and calls `onLanded` (photo visible; the overlay sets `#shroom-target.jelly-returning`, opacity back over 0.5 s while the sparks and the sky fade) then `onClosed` (focus back to the opener, then the host unmounts and disposes). Back during the opening dissolve waits for the handoff, then reverses. The host is now a small state machine: the URL leaving `/resume` sets `closing` (not an unmount), × / Esc only change the URL (overlay: `router.back()`; direct: `router.push('/')`, which fades), and Forward during a close reopens once `onClosed` fires (the overlay remounts by request key). If the engine can't close onto the photo it fades instead.
  - **Verified (dev, 1440×900):** three rounds of open → close by **Esc, ×, Back**: sparks land on the photo at 2.12 s, the overlay is gone at 2.62 s, and each time `/`, `#shroom-target` opacity 1 / visible / no class, photo visible, **focus on the hero**, engine disposed. Mid-reverse frames (slow motion): at t = 0.75 / 1.89 s the words are hot sparks converging on the photo's spot with the sheet gone and the HUD hidden; at t = 1.7 s they have rebuilt the photo in its own colors. **Edge cases:** closing with all 631 words bursting (Chaos + Burst all) restores the page and focus; Back mid-dissolve finishes opening, then reverses (3.9 s); Forward mid-reverse finishes closing, then reopens with the dissolve and lands all 631. Console clean. Jest: reverse path (engine `close` → `onLanded` adds `jelly-returning` → `onClosed` → host notified, hero button focused) and the fade fallback (`close` false → overlay fades, page and photo restored).
- [x] **T8: one music player.**
  - Expose the site player's audio graph to the resume, either by lifting `useAudioPlayer`'s audio into a small shared store or context, or by exposing its `MediaElementAudioSourceNode` so the resume can attach its own fftSize-2048 analyser (the dance needs 40 log bands plus the waveform; the site's analyser is fftSize 256). Pick the least invasive option and keep the site visualizer unchanged.
  - `MusicFAB` stays visible and usable above the resume (the HUD makes room, as in the playground), and P toggles the site player.
  - Starting a song on the site, then opening the resume, keeps it playing and the words dance.
  - **Done 2026-10-13** (the source-node option): `useAudioPlayer` returns one more getter, `getSourceNode()`; `MusicPlayer` registers `{ getSource, isPlaying, toggle }` in `src/lib/site-music.ts` while mounted; the overlay's `createMusicTap(getSiteMusic)` (in `lib/jelly/music.ts`) connects its own `AnalyserNode` (fftSize 2048, smoothing 0.5) to the player's source once the first play has made the audio graph, feeds the engine's `MusicFeatures`, and disconnects on dispose. The site's 256-point analyser and visualizer are untouched. P → `getSiteMusic().toggle()`.
  - **Verified (dev, 1440×900):** played a track from the site's ♫ panel, opened the resume from the hero: the song kept playing (♫ "currently playing"), dance mix 1.0, bass 0.89, bands live, word offsets up to 0.9 units (mean 0.44) with 631/631 HOME (screenshot: the lines ride the spectrum); ♫ on top and clear of the HUD (HUD right edge 1348 px, ♫ left 1359 px). P paused the site player (dance mix → 0.01), P again resumed it; Esc → reverse close, and the song was still playing on `/`. Console clean. Jest: `site-music` (player registers/unregisters; the tap attaches a 2048-point analyser once, reuses it, disconnects; no player → no music) + P in the HUD keyboard test; all 126 music + overlay tests pass.
- [x] **T9: the 🍄 Shroom Wizard offers the resume.**
  - Add an `offer_resume` tool next to `offer_mushroom` (`src/lib/wizard-tools.ts`) and a line in `src/data/wizard.json` so the wizard can offer it when someone asks about Phill's experience or resume.
  - The offer uses `MushroomOfferBubble`-style UI ("Shall I summon Phill's resume? ✨"); confirm opens the resume from the wizard with the blue-violet tint.
  - Jest tests mock the SDK, as the existing wizard tests do.
  - **Done 2026-10-13.** `OFFER_RESUME_TOOL` joins `WIZARD_TOOLS`; the route returns `action: 'offer_resume'` (tool-only replies get an in-character line); the prompt gains a short "RESUME OFFERS" section (wording below); `WizardChat` calls `onOfferResume`; `ShroomMode` opens the same centered `MushroomOfferBubble` (now with optional `confirmLabel`/`cancelLabel`; the mushroom ceremony's labels are unchanged) with `wizard.json`'s `resumeOffer`. **Summon** closes the chat, sends the wizard off (its normal walk-off) and calls `openResume({ tint: 1 })`: the hero dissolves from the photo's center with the blue-violet heat (the 🍄 button isn't on screen while the wizard is up, so there's no better origin). **Not now** injects `wizard.json`'s `resumeDeclineLine`, which, as with the mushroom decline, clears the chat's pending offer and gives the input back. The chat `<textarea>` got a `name` (a pre-existing DevTools "form field needs id/name" issue).
  - **Verified (dev, chat stubbed by an init-script `fetch` override returning `offer_resume`):** summon the wizard, Enter on "Talk to the Shroom Wizard", ask "can I see his resume?" → the bubble "Shall I summon Phill's resume? ✨" with **Not now / Summon**, focus on Summon. Summon → `/resume`, `hp.tint` 1, chat and offer closed; a slowed frame shows violet sparks sweeping from the photo's center; Back → reverse close, page restored, wizard gone, 🍄 button back, focus on the hero. Not now → chat stays, decline line shown, input enabled and focused. Network log: no request to `/api/wizard/chat` or anywhere outside the site (the stub answered). Console clean. Jest: route (`offer_resume` with text, tool-only, both tools sent), `WizardChat` (`onOfferResume`), `ShroomMode` (Summon → `openResume` with tint 1, chat closes, wizard leaves; Not now → wizard and chat stay, decline line, focus back), prompt (`offer_resume` / "RESUME OFFERS"): 84 wizard tests pass.
  - **New wizard wording for Phill to review** (it doesn't change the persona's voice, so not a stop): the prompt section "When the traveler asks to see Phill's resume or CV, OR asks for his whole career at a glance, answer in your usual way and call the offer_resume tool in the same turn. The tool lets the traveler choose whether to summon the resume; you do NOT describe it or acknowledge its existence. Do NOT call it for a single factual question about one job or skill — only when they want the resume itself or the whole picture."; the tool description "Invoke when the traveler asks to see Phill's resume or CV, or wants his whole career at a glance…"; the tool-only fallback "Phill's deeds are written in a living scroll, traveler…"; and the decline "As thou wishest. The scroll keeps its secrets for another tide."
- [x] **T10: reduced motion + accessibility.**
  - With `prefers-reduced-motion: reduce`, every trigger goes to the plain `/resume` page (no canvas mounts) and the hero has no lift.
  - axe passes on the home page and `/resume`; keyboard-only flows work (focus the hero, Enter, Tab through the HUD, Esc); hidden UI is `inert`.
  - Extend `src/__tests__/a11y.test.tsx` and add a test that reduced motion never loads the engine.
  - **Done 2026-10-13.** Reduced motion: `prefetchResume` no longer runs (a hover used to fetch the engine chunk and the snapshot), `openResume` hard-navigates to `/resume`, the host never mounts the canvas, and the hero's lift and the glow's scale are `motion-safe` (the glow still brightens). The overlay is now a **modal dialog** (`role="dialog" aria-modal="true" aria-label="Interactive resume"`) whose text equivalent is inside it: an `sr-only` copy of the resume with no focusable parts (`ResumeContent links={false}`; the page's content moved to `src/components/ResumeContent.tsx`, shared by `/resume`). While it's up, everything under it is `inert` (`#shroom-target`, the skip link, and a new plain `#shroom-ui` wrapper around `ShroomMode` in the layout); it comes back at the landing (or the fade). Shortcuts only act when focus is in the dialog or on `<body>` (so Esc in the music player's panel can't close the resume).
  - **Verified (dev, 1440×900):** reduced motion (an init-script `matchMedia` stub; this MCP has no media-feature emulation): hovering and focusing the hero requested no JS and no snapshot; the click was a hard navigation to `/resume`; loading `/resume` with it → no dialog, no canvas, no engine, no snapshot request, none of the 19 scripts contains engine/HUD code, page not inert. **Keyboard:** 12 Tabs reach the hero (focus ring, lift, brighter glow, the hint at its default spot); Enter dissolves from the photo's center, focus lands on the dialog; page, skip link and shroom UI inert; Tab order: Finder, 8 chips, Pan/Rotate, − / Fit / +, PDF, Chaos, Burst all, Heal all, Shroom, Black hole, Sound, Intro, View, ×, then the site's ♫ (Tilt hidden on desktop); Esc → reverse close, focus back on the hero (`:focus-visible`), nothing left inert. Console clean. Jest: `a11y` (home + `/resume` axe; reduced motion: the hero hard-navigates and the overlay, engine and snapshot modules are never loaded; a direct visit never mounts it) and overlay tests (inert in/out, dialog + text equivalent with no focusables, axe, shortcuts ignored outside); full suite 46 suites / 453 tests pass.
- [x] **T11: performance.**
  - The home page's first-load JS doesn't grow beyond the hero button (compare `npm run build` output against T0).
  - Fix the cold-load hitch: WebP assets (T1), idle-chunked `rebuild()` (or a worker), and the handoff orderings pre-sorted in idle time (as the playground does).
  - In `npm run build && npm run start`, with a Chrome trace and CPU throttling as in CLAUDE.md: desktop ≥ 110 fps through open, Chaos and close; the emulated phone (390×844, 4× CPU) ≥ 50 fps average with no frame over 100 ms on a cold open.
  - **Done 2026-10-13.** Before: a phone cold open was one 400–500 ms frame (engine, shaders, photo sampling, SFX synthesis, snapshot → physics → atlas → GPU all in one task). Traces showed what each step costs and that two heavy steps sharing a frame made the long ones. Now:
    - the overlay creates the engine and opens it a frame apart;
    - `engine.load()` is async, and all deferred work takes turns through one queue (each job waits for the frame after the previous one, then runs in the next task). That covers physics in batches of 160 words (`physicsSteps`), the atlas in batches of 120 (`atlasSteps`, each reading back only its own rows), the GPU upload, the backing, the reading-order sort and the reverb buffers. The resume isn't drawn until it's all in (`render(…, drawResume)`).
    - The 11 programs compile in one batch before any status query (`compileAll`, KHR_parallel_shader_compile): engine creation 58 → 29 ms at 4×.
    - The snapshot layers and the hero photo are decoded off the main thread (`fetch` → `createImageBitmap`). Drawing an `<img>` into a canvas decoded it on the main thread: 47–56 ms each on a first visit. The photo's decode starts with the prefetch (`decodePhoto`), and the hero open waits for it.
    - The hero samples at 1× on low quality: same CSS-px grid and jitter, colors are cell averages anyway, ¼ of the pixels.
    - SFX: only the whoosh is synthesized as it opens; the reverb tail and the boom's noise come later (`sfx.prepare()`, a step of its own or the first gesture).
    - The HUD mounts once the resume has loaded (it's inert and invisible until the open, which always follows the load), a frame after its emoji/symbols are laid out off screen. Their fallback fonts' first use was ~45 ms of a 92 ms first-visit layout.
    - The minimap draws the backing plus the snapshot's text layer (2 `drawImage`s instead of 631 crops: 28 ms at 4×).
    - The reading-order pre-sort's idle timeout dropped from 2 s to 250 ms, so a busy phone has it before the handoff.
  - **Verified (production build, `next start`, rAF frame recorder from the click, 7 s):**
    - **Phone (390×844 @3×, touch, 4× CPU), first visits** (each in a fresh isolated browser context: empty HTTP/code caches and a new renderer, so the engine's code runs in the interpreter; no hover prefetch, the strictest case): worst frame **76.3 / 83.3 / 74.6 / 73.8 ms** at **112.4 / 112.4 / 111.7 / 112.3 fps** average.
    - **Phone, repeat opens in one tab:** worst 43–51 ms, ~113 fps.
    - **Desktop (1440×900 @2×), first visits:** open **118.7 fps** (worst 41.6 ms; 118.8 with a hover prefetch; one earlier run 109.3 with no frame over 25 ms), **Chaos 120 fps** (worst 10.4 ms), **close 120 fps** (worst 10.4 ms), back on `/` with the photo visible.
    - All 631 words land; the mid-dissolve sparks hold the photo's shape at 1×; the minimap shows the page with the view frame (screenshots); console clean.
    - **Home first-load JS:** 13 chunks, 870,216 B raw / **272,937 B gzip** (T0: 270,611 B; +2.3 KB = the hero button, host, stores, music bridge, nav hook). No engine, HUD or snapshot code in any first-load chunk (grepped for `KHR_parallel_shader_compile`, `openFromHero`, `createImageBitmap`, the HUD's labels).
    - **Gates:** `tsc`, lint (zero warnings), jest on the overlay/a11y/hero-trigger/helpers/resume-page files (49 pass, incl. a new test that the HUD mounts only after the load), `npm run build`.
    - **Left as is:** the remaining first-visit peaks are the hero sampling loop (~65 ms traced, interpreted on a first run) and the HUD's first layout (~68 ms traced).
- [ ] **T12: shroom mode + edge cases.**
  - Turning site shroom mode on or off (`ShroomModeContext`) drives the resume's shroom look.
  - Resizing or rotating a phone mid-dissolve doesn't break.
  - Losing the WebGL context shows the plain `/resume` page.
  - Dispose on route unmount where it matters.
- [ ] **T13: docs + version.**
  - CLAUDE.md: the engine exception to the R3F rule, the Key Files entries (`src/lib/jelly/`, `JellyResumeHost`, `public/resume/`, the snapshot regenerate command) and gotchas (the z-order, the intercepting route, the shared analyser).
  - HANDOFF.md: a "Ported to the site" section.
  - `package.json` version: minor bump (1.2.0 → 1.3.0, or the next minor if master has moved).
- [ ] **T14: PR. STOP before pushing and ask Phill.**
  - Prepare the PR description (summary, screenshots, measurements, test plan) in the plan.
  - Pushing and opening the PR need Phill's explicit go, because the repo is public and he must confirm that nothing private is in `public/resume/`.

## Per-task verification

All gates: `npx tsc --noEmit` · `npm run lint` (zero warnings) · `npx jest <changed test files>` (the full `npm test` at T0, T13 and in Acceptance) · `npm run build` when routes or dynamic imports change.

Browser checks: `npm run dev` (port 3000; start it detached if it isn't running, and restart stale servers freely), then the chrome-devtools MCP in an **isolated background tab** (`new_page` with `isolatedContext` and `background: true`). Read `list_console_messages` after every task.

**Never call the real wizard API:** stub `/api/wizard/chat` with a `fetch` override via `initScript` (CLAUDE.md).

| Task | Prove it with |
|---|---|
| T0 | The four gates' output, recorded. |
| T1 | `node -e` over `public/resume/snapshot.json`: no word matches `/@|\(\d{3}\)|\d{3}-\d{4}/` (allow `Lambda@Edge`). A screenshot crop of the contact line in `decor.webp`/`text.webp` shows no phone or email. File sizes are listed (smaller than the playground's PNGs). |
| T2 | A Jest render test: headings, bullets, the PDF link; the page source has no phone or email. `curl -s localhost:3000/resume` returns the content server-rendered. The SEO test covers `/resume`. |
| T3 | `localhost:3000/resume` in the browser: the galaxy intro prints the page, all 634 words HOME (expose a dev-only `window.__jelly` like the playground's). Desktop 120 fps. Jest tests for the pure helpers pass. |
| T4 | Screenshots at 1440×900 and 390×844 match the playground's HUD. Finder "AI" finds 27 words. Chaos, the black hole and Burst all work. The PDF link has `download`. |
| T5 | From `/`, `router.push('/resume')` opens the overlay with the home page still in the DOM; Back closes; Forward reopens. `/resume?find=React` gives 14 matches. `npm run build` shows the engine in its own chunk (not in `/`'s first load). |
| T6 | Screenshots at 0.2 / 0.6 / 1.2 s after a hero click: the front sweeps out from the click, and the chrome fades. The reprojection check (hero sparks vs pixels) is 0 px at rest. Handoff frame before/after: no pop. All 634 words HOME by ~4.5 s. |
| T7 | Open → close ×3 (Esc, ×, Back): the hero is visible at `opacity: 1` after each close, focus is back on the hero, no console errors. A mid-reverse screenshot. |
| T8 | Start a track on the site, open the resume: the music keeps playing, the words dance (dance mix > 0, words offset), and `MusicFAB` is visible and doesn't overlap the HUD. Close: the song continues. |
| T9 | With the stubbed chat returning an `offer_resume` tool call: the bubble appears, Summon opens the resume tinted, and the network log shows no real Anthropic call. Jest wizard-tool tests pass. |
| T10 | Emulated `prefers-reduced-motion` (CDP `Emulation.setEmulatedMedia`, via an `evaluate_script` check of `matchMedia` or a test hook): a hero click goes to `/resume` and no engine chunk is requested. axe tests pass. A keyboard walkthrough works. |
| T11 | `npm run build` first-load JS for `/` compared with T0. A trace on the production build: desktop ≥ 110 fps; the emulated phone ≥ 50 fps average, with the worst frame < 100 ms on a cold open. |
| T12 | Shroom mode toggled with the resume open; a forced `WEBGL_lose_context` → the fallback; a phone rotation mid-dissolve. No console errors. |
| T13 | `git diff` of CLAUDE.md, HANDOFF.md and package.json; all four gates green. |
| T14 | The PR description ready in the plan. **No push without Phill's go.** |

## Acceptance

After all boxes up to T13 are ticked, on the **production build** (`npm run build && npm run start`) in a fresh isolated tab:
1. The home page looks exactly as before (screenshot vs `origin/master` at 1440×900 and 390×844) apart from the hero hint on hover and the touch tag on phones.
2. The nav Resume button downloads the PDF (an `<a download>`; no overlay opens).
3. Hover the hero → the engine and snapshot are requested. Click → the photo dissolves from the click point and reshapes straight into the page; the URL is `/resume`. The resume is fully usable: rotate, Finder, Chaos, Burst all, Heal all, Shroom, the black hole, Intro, View, ⤓ PDF.
4. × → the reverse lands on the hero; Esc and Back do the same; Forward reopens.
5. A direct visit to `/resume?find=React` gives the quick galaxy intro and then 14 matches. With JS disabled, `/resume` shows the semantic resume.
6. Play a song on the site, then open the resume: it keeps playing, the words dance, and `MusicFAB` stays usable.
7. The 🍄 offer (stubbed chat) opens the resume with the violet tint, and no real API call is made.
8. Reduced motion → the plain `/resume` page and no engine chunk.
9. Desktop ≥ 110 fps; emulated phone ≥ 50 fps; no console errors; `public/resume/` and the repo hold no phone or email.
10. The four gates are green, `git status` is clean, and nothing is pushed.

## Stop conditions / open questions (only Phill can decide)

- **Push / PR (T14):** never push without Phill's explicit go. The repo is public.
- **Intercepting routes:** if Next 16 can't keep the home page mounted under `/resume` (for the reverse close), stop and describe the options (for example a `#resume`-style overlay plus a separate `/resume` page) instead of picking one.
- **Privacy:** if the web snapshot can't drop the phone and email cleanly (the Rezmancer markup differs), stop. Don't ship a snapshot with contact details.
- **The R3F rule** is waived for this engine only. Don't extend the exception to other components.
- **A real phone test** (tilt, shake, audio unlock, GPU cost) needs Phill's device. Note any results and don't block on them.
- **Wizard prompt wording:** if the `offer_resume` line changes the wizard's persona in a way Phill hasn't seen, leave the wording in the plan for his review.
