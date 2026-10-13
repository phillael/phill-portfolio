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

- [ ] **T0: branch + green baseline.**
  - `git fetch origin && git switch -c feat/jelly-resume-site feat/jelly-resume-playground`. If `origin/master` has moved past the branch's base, rebase onto it first.
  - Run all four gates and record the results in the plan: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- [ ] **T1: the web snapshot assets.**
  - Extend `docs/design/jelly-resume/tools/snapshot.mjs` with `--web`. Before measuring, it removes the phone and email items from Rezmancer's contact line together with their separators; the email is a `mailto:` link, so find the phone's node in the markup.
  - It writes `public/resume/snapshot.json` (words, page, content, dpr) plus `public/resume/text.webp` and `public/resume/decor.webp` (WebP, 2× instead of 3×, to cut the ~1 MB text layer).
  - Source: `~/Desktop/dev/rezmancer/out/Phill_Aelony_Resume_AI_Engineer.html`.
  - Document the regenerate command in HANDOFF.
- [ ] **T2: resume content + the semantic `/resume` page.**
  - `src/data/resume.ts`: the playground's `DATA` (already without phone and email), typed.
  - `src/app/resume/page.tsx`: a server-rendered, semantic, accessible resume built from it, with a Download PDF link (`/Phillip_Aelony_Resume_2025.pdf`), a link back home and the site's styling. Give it its own `metadata` (title, description, canonical `/resume`, OG) and add it to `sitemap.ts`.
  - This page is also the reduced-motion and no-JS experience.
- [ ] **T3: port the engine core** into `src/lib/jelly/`: the snapshot loader (JSON + WebP), word bodies and physics, bursts and comet sparks, the bending sheet, sky/stars/mist, camera and map navigation, the Finder, the black hole, dance targets (fed by an analyser callback, wired in T8), and SFX. Use `JELLY_CONFIG` and no settings UI.
  - Add a client `JellyResumeCanvas` that runs only the **direct-visit** path, the quick galaxy intro, on `/resume` above the semantic page. The semantic page stays in the DOM; the canvas is `aria-hidden`.
  - Pure helpers (config, snapshot parsing, the reading-order rank mapping, find matching, `isMetric`) get Jest tests.
- [ ] **T4: the resume HUD and controls** as React components around the canvas: the finder (search + chips), the navigator (mini map, mode toggle, zoom), the HUD bar (⤓ PDF, Chaos, Burst all, Heal all, Shroom, Black hole, Sound, Intro, View, hints and touch-only Tilt) and ×. Port the keyboard shortcuts.
  - Close on a direct visit navigates home with a simple fade; the reverse close comes in T7.
  - Add a component test for the HUD buttons, labels and the PDF link's `download`.
- [ ] **T5: overlay host + routing.**
  - Mount `JellyResumeHost` in the layout, outside the shroom wrappers, with the z-order above (above the Nav, below `MusicFAB`).
  - Add the intercepting/parallel route so `/resume` opened from the home page keeps the home page mounted.
  - `router.push('/resume')` / Back / Forward drive open and close. `/resume?find=X` runs the Finder after landing. A direct load still works (T3).
  - The engine chunk is lazy: no engine JS on the home page's first load.
- [ ] **T6: the hero becomes the trigger + the dissolve (straight to the page).**
  - `HeroImage` is wrapped in a real `<button>` with the hover/focus hint (the glow boost can be a CSS class on `GlowEffect`) and the touch-only tag.
  - Prefetch the engine chunk and the snapshot on hover/focus/touchstart.
  - The hero pool samples the rendered `next/image` element (same origin, so `getImageData` works) at its displayed size; then come the dissolve, the chrome fade/blur, and the rank-for-rank handoff into `intro.direct`.
  - While a slow load finishes, the sparks hover near the photo.
- [ ] **T7: the reverse close.** ×, Esc and Back (the host keeps the canvas alive after the slot unmounts) burst the words into the hero pool, fly them to the `HeroImage` pixels re-derived from the moving camera, cool them to photo colors, cross-fade the hero and chrome back in, and return focus to the trigger. Open → close repeats cleanly, including closing mid-Chaos.
- [ ] **T8: one music player.**
  - Expose the site player's audio graph to the resume, either by lifting `useAudioPlayer`'s audio into a small shared store or context, or by exposing its `MediaElementAudioSourceNode` so the resume can attach its own fftSize-2048 analyser (the dance needs 40 log bands plus the waveform; the site's analyser is fftSize 256). Pick the least invasive option and keep the site visualizer unchanged.
  - `MusicFAB` stays visible and usable above the resume (the HUD makes room, as in the playground), and P toggles the site player.
  - Starting a song on the site, then opening the resume, keeps it playing and the words dance.
- [ ] **T9: the 🍄 Shroom Wizard offers the resume.**
  - Add an `offer_resume` tool next to `offer_mushroom` (`src/lib/wizard-tools.ts`) and a line in `src/data/wizard.json` so the wizard can offer it when someone asks about Phill's experience or resume.
  - The offer uses `MushroomOfferBubble`-style UI ("Shall I summon Phill's resume? ✨"); confirm opens the resume from the wizard with the blue-violet tint.
  - Jest tests mock the SDK, as the existing wizard tests do.
- [ ] **T10: reduced motion + accessibility.**
  - With `prefers-reduced-motion: reduce`, every trigger goes to the plain `/resume` page (no canvas mounts) and the hero has no lift.
  - axe passes on the home page and `/resume`; keyboard-only flows work (focus the hero, Enter, Tab through the HUD, Esc); hidden UI is `inert`.
  - Extend `src/__tests__/a11y.test.tsx` and add a test that reduced motion never loads the engine.
- [ ] **T11: performance.**
  - The home page's first-load JS doesn't grow beyond the hero button (compare `npm run build` output against T0).
  - Fix the cold-load hitch: WebP assets (T1), idle-chunked `rebuild()` (or a worker), and the handoff orderings pre-sorted in idle time (as the playground does).
  - In `npm run build && npm run start`, with a Chrome trace and CPU throttling as in CLAUDE.md: desktop ≥ 110 fps through open, Chaos and close; the emulated phone (390×844, 4× CPU) ≥ 50 fps average with no frame over 100 ms on a cold open.
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
