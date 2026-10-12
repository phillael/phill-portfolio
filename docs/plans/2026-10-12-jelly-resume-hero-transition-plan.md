# Jelly Resume: hero → 3D resume transition (playground prototype)

**Date:** 2026-10-12 · **Owner:** Phill · **Where:** `docs/design/jelly-resume/playground.html` (single-file WebGL2 playground; **not** the real site yet)

## Context

### What exists
The Jelly Resume is a 3D, physics-driven copy of Phill's Rezmancer resume. It's a soft-body word per word, set in a nebula, and it lives in one self-contained playground: `docs/design/jelly-resume/playground.html`, about 2,700 lines of raw WebGL2. Read `docs/design/jelly-resume/HANDOFF.md` first: it has the code map, every decision so far and the measurements. What it does today:
- **Entrance:** a "View Resume" start screen. Behind it, the resume waits as a two-armed galaxy of its own glyph particles. Pressing the button runs the entrance (`startIntro()`): a scanline prints the page while stardust streams into each word.
- **Interaction:** clicking knocks words loose; they bump and burst into **comet sparks** (instanced streaks, white-hot → cyan → electric → deep blue → indigo, with a swirl flow) and re-form.
- **Other features:** the Finder (`find(q)`; chips: AI, React, TypeScript, AWS, Node, Data, Impact, Music), the black hole, dancing to the site's tracks, the bending paper sheet, and map-style navigation where dragging rotates by default.
- **Debug hook:** `window.__jelly`.

### The goal of this plan
Phill wants the cleverest way to put the resume into phillcodes.com. We agreed on the following, and he said "I love all these ideas":
1. **The hero disintegrates into the resume.** Phill's hero photo (`public/images/hero-image-phill-llamas.png`: him in a poncho and cowboy hat with three llamas, a transparent cutout) breaks apart into comet sparks. The sparks swirl into the galaxy, and the galaxy hands off to the existing entrance, which prints the page. It's one continuous effect: the site's own sparkles become the resume.
2. **The nav "Resume" button is the main trigger; clicking the hero is a bonus.** Few people click a photo, and recruiters look for a Resume button. A stray click on the hero shouldn't be the only way in, nor launch a takeover unannounced. So the hero gets a hover hint, and clicking it also works.
3. **The dissolve hides the loading time.** The 3D resume is heavy, so it loads lazily. Start fetching on hover or focus of a trigger; the 1–2 s dissolve covers the rest of the load. If loading is still slow, the galaxy just keeps swirling.
4. **Skills chips deep-link into the Finder.** Clicking "React" on the site opens the resume with React already lit up.
5. **A real URL.** `#resume` (the real site will use `/resume`, decided later) opens it directly, and Back closes it.
6. **A reverse transition on close.** The page bursts into sparks that fly home and re-form the hero.
7. **Optional:** the Shroom Wizard (the site's 🍄 character) can summon it. It's mocked; never call the real chat API.
8. **Guardrails:** `prefers-reduced-motion` gets a plain DOM resume and the PDF with no WebGL. Phones get fewer particles.

### Why we prototype in the playground first
The real site (Next 16 + R3F) is the eventual home. Phill wants to judge the feel first, so this loop only builds a **site mock inside the playground**: a faithful copy of the phillcodes.com hero (screenshot reference below) laid over the stage, which dissolves into the resume. Porting to `src/` is a later plan.

### Rejected alternatives (don't rediscover them)
- **Hero click as the only trigger:** rejected because of discoverability and accidental triggers.
- **A separate page or route with a hard cut:** rejected because it loses the continuity.
- **A full-screen bloom post-process for the glow:** rejected for phone performance. The comet shader's premultiplied "darken + add" pass already glows on white and on dark.

### Reference: the real hero (from Phill's screenshot, 2026-10-12)
- **Background:** near-black (#05080f-ish) with faint twinkling cyan/violet sparkle dots across the page (the hero `Vortex`: ~200 short streaks along a simplex-noise flow, hues 190–290, additive "lighter" compositing plus blur passes).
- **Nav, top:**
  - Left: the logo "Phill Aelony" (Audiowide, neon cyan glow) with "Software Engineer" (green) under it.
  - Center: links Home · About · Experience · Skills · Projects · Contact (white, Nunito-like).
  - Right: a **Resume** button (outlined, cyan text, ⤓ download icon, rounded) next to GitHub and LinkedIn icons.
- **Center:** the hero PNG, about 640 px tall on a 1440-wide viewport, with a soft radial blue glow (#3b5bdb-ish → transparent) behind it.
- **Tagline under the hero:** "Legendary Code Sorcerer" (green) | "Vanquisher of Bugs" (purple) | "Builder of Dreams" (cyan), each with a neon glow.
- **Bottom right:** round 🍄 (purple glow) and ♫ buttons.

## Binding — do not redesign

- **Earlier decisions stay** (see HANDOFF.md "Decisions"): no drop shadows; no jazz or musical notes on interaction; drag rotates by default and words aren't draggable; comet sparks with no green or pink; whole page fits by default; exact Rezmancer formatting; outer-space nebula; site colors; performance and mobile are hard requirements.
- **Triggers:** the mock nav **Resume** button is primary. The hero image is a bonus trigger, as a real `<button>` with `aria-label="Open the interactive resume"`, a hover/focus hint (the glow brightens, a slight lift, the tooltip "✨ click to open my resume") and keyboard Enter/Space. Skills chips and the 🍄 summon are also triggers.
- **Spark look:** hero sparks start as the **photo's own pixel colors**. As they're released they heat to white-hot and then follow the existing comet ramp (cyan → electric → deep blue → indigo). No green, no pink.
- **Continuity:** the hero sparks become the galaxy, and the resume's intro particles start where the hero sparks are, so there's no visible pop at the handoff. Positions map k → k mod H.
- **Loading:** `rezmancer-snapshot.js` is **not** loaded at page load. Prefetch on hover or focus of any trigger; load on click. If it's still loading when the dissolve finishes, the galaxy idles until it's ready.
- **Close:** a × button (top right of the resume) and Esc close it, and so does Back once the URL work lands. All three play the reverse transition: the page bursts → sparks fly to the hero pixels and cool to photo colors → the DOM hero cross-fades back in → the mock chrome fades back.
- **Download PDF:** a button inside the resume HUD links `../../../public/Phillip_Aelony_Resume_2025.pdf` with the `download` attribute.
- **URL** (playground): opening pushes `#resume`, and Back closes it. Loading the page with `#resume` opens directly, skipping the dissolve with a quick galaxy intro. `#resume?find=React` opens it and runs `find('React')` after the intro lands. Chip deep-links use the same form.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, or the playground toggle "Simulate reduced motion", triggers open a plain, accessible, scrollable HTML resume panel built from `DATA` (no WebGL, no animation) with Download PDF and a close button.
- **Phones / Low quality:** about 6K hero sparks (about 18K on desktop) and a shorter dissolve; tapping the hero works.
- **Scope:** only `docs/design/jelly-resume/playground.html`, `HANDOFF.md`, `.gitignore` and this plan change. **Never touch `src/`.**
- **Privacy:** `rezmancer-snapshot.js` contains Phill's phone number and email, and this repo is **public**. It must stay out of git (gitignored in T0). Never push.

## Task checklist

Order matters: T0 first; T2 before T5; T3 → T4 → T5; T7 needs T3–T5; T8 needs T7; T9 needs T8.

- [x] **T0: branch and baseline commit.** `git fetch origin && git switch -c feat/jelly-resume-playground origin/master`; the untracked `docs/design/` comes along. Append to `.gitignore`: `docs/design/jelly-resume/rezmancer-snapshot.js` (with a comment: it has phone/email, regenerate with `tools/snapshot.mjs`) and `docs/design/jelly-resume/playground-v*.html` (local backups). Commit with explicit paths only: `.gitignore`, `docs/design/jelly-resume/{playground.html,HANDOFF.md,tools/snapshot.mjs}`, `docs/design/paper-shatters/`, and this plan.
- [ ] **T1: site mock overlay.** Add a mock of the phillcodes.com hero (see the Reference) that covers the stage and is the default entrance: new setting `entrance: 'hero' | 'button'`, where `'button'` keeps today's "View Resume" start screen. Load the hero image from `../../../public/images/hero-image-phill-llamas.png`. Add a small **Skills** strip under the tagline with chips AI, React, TypeScript, AWS, Node, Data, plus round 🍄 and ♫ buttons at the bottom right (no behavior yet). While the mock shows, the resume HUD, finder and navigator stay hidden (reuse `.prestart`). Load the site fonts (Audiowide; Nunito for body text) from Google Fonts.
- [ ] **T2: lazy-load the resume.** Remove the static `<script src="rezmancer-snapshot.js">`. Add `loadResume()`, which returns a cached promise: it injects the script, waits for fonts and the snapshot images, then runs `rebuild()` and the existing boot steps. The sky, stars and render loop must run with **no bodies yet**: guard `step`/`collide`/`updateStates`/`updateParticles`/the render passes for `NP === 0`. Prefetch on `pointerenter`/`focus` of every trigger.
  - Add `?slow=<ms>` to delay the load for testing.
  - Add `__jelly.loadState()`, returning `'idle' | 'loading' | 'ready'` plus timings.
- [ ] **T3: hero spark pool.** On mock load, draw the hero PNG into an offscreen canvas at its displayed size (`getBoundingClientRect`, times DPR, capped). Sample H points where alpha > 0.5 (H ≈ 18K desktop, 6K on Low quality), storing each point's color and screen px. Each point's world position is the screen px unprojected onto a plane in front of the camera (use the `introCam()`-adjusted camera; the camera is in its pre-intro pose while the mock shows).
  - Give the pool its own GPU buffers: pos, tail, alpha, age, color and **heat**.
  - Draw it with the comet program extended by `aHeat`: color = mix(photo color, comet ramp(age), heat).
  - Debug: `__jelly.heroSparks(true)` hides the DOM image and shows the pool at rest, so the sparks should reproduce the photo in place.
- [ ] **T4: the dissolve.** `openResume({ origin })` starts it, where `origin` is the click point or the trigger element's center. Each spark gets a release time from distance to the origin plus value-noise jitter, so a dissolve front sweeps out from the origin across the photo; the DOM image hides at t = 0, which is safe because the sparks match it.
  - The mock chrome (nav, tagline, skills, glow) fades and blurs out over about 0.6 s, revealing the nebula.
  - A released spark's heat goes 0 → 1 over about 0.25 s. It gets an outward kick, follows the existing swirl flow, and eases into a galaxy slot (`galaxyAt`-style spiral) within about 1.6 s (shorter on Low quality).
  - Play the SFX whoosh.
- [ ] **T5: handoff to the resume.** When `loadResume()` is ready **and** the hero sparks have reached the galaxy:
  - Put the resume particles (INTRO pre-state) at the hero spark positions (k → k mod H) and fade the hero pool out over about 0.3 s.
  - Then run `startIntro()` from the pre-state. Its existing galaxy easing and swirl take over, so there's no pop.
  - If the load isn't done, the hero sparks idle in the galaxy until it is.
- [ ] **T6: triggers and hints.**
  - The mock **Resume** button calls `openResume` with the origin at the button.
  - **Hero:** a real button with the hover/focus hint (glow brighter, slight lift, tooltip) and a click origin at the cursor; keyboard Enter/Space works.
  - The Resume HUD gets **⤓ PDF** (the Download button) and **×** (close; the reverse animation comes in T7).
- [ ] **T7: close plus the reverse transition.** × and Esc call `closeResume()`:
  - The visible words burst into the hero pool, using the resume particle positions mapped k → k mod H.
  - Sparks fly back to their hero pixel homes over about 1.4 s and cool from comet colors back to photo colors (heat 1 → 0).
  - When they land, the DOM hero cross-fades in and the sparks fade out. The mock chrome fades back and the resume HUD hides.
  - Then reset the resume to its pre-state, so the next open replays.
  - Open → close works repeatedly.
- [ ] **T8: URL.** `openResume` pushes `#resume` (or `#resume?find=X`), and `popstate` closes or opens to match. Loading with `#resume` skips the mock dissolve: it goes straight into a quick galaxy intro (no hero needed) and still loads lazily. `?find=` runs `find()` once the intro lands (the existing `intro.ended`).
- [ ] **T9: Skills chips deep-link.** A mock Skills chip calls `openResume({ origin: chip, find: name })`; the hash carries `find`, and the Finder runs after the landing. The chip names map to the existing `CHIPS`, so they must match.
- [ ] **T10: guardrails.**
  - **Reduced motion:** the real media query, or the playground setting `simReduced` ("Simulate reduced motion"), makes every trigger open the plain HTML resume panel built from `DATA`. It's an accessible dialog: focus moves in, Esc closes, Tab can't leave it, and it has Download PDF.
  - **Low quality / touch:** about 6K sparks and a shorter dissolve.
  - Check the emulated phone (390×844, 4× CPU) during the dissolve.
- [ ] **T11 (optional, last): Shroom summon.** The mock 🍄 button opens a small speech bubble: "Shall I summon Phill's resume? ✨" with a [Summon] button, which calls `openResume` with the origin at the mushroom. The heat ramp starts violet-tinted for this trigger only, then follows the normal ramp. Mocked: **no network calls**.
- [ ] **T12: settings, prompt and handoff.**
  - **Settings:** add a group "Site integration" with `entrance`, `dissolveTime`, `heroSparks` (count multiplier) and `simReduced`.
  - **Copy-prompt text:** describe the integration (triggers, dissolve, lazy load, URL, chips, reverse, reduced motion) and add `updatePrompt` lines for the new settings.
  - **`window.__jelly`:** expose `openResume`, `closeResume`, `loadState`, `heroSparks`.
  - **`HANDOFF.md`:** a session section, plus a "Porting to the real site" note: Nav's `ResumeDownloadButton` becomes the trigger, `HeroImage` becomes the hero sampling source, the Skills chips get deep-links, decide `/resume` vs a hash route, and the resume reads the shared `useAudioPlayer` analyser.

## Per-task verification

All browser checks run against **http://127.0.0.1:8765/docs/design/jelly-resume/playground.html** (see the ground rules for starting the server) in an **isolated background tab** via the chrome-devtools MCP: `new_page` with `isolatedContext` and `background: true`. After every task, check `list_console_messages` for errors; one 404 for `favicon.ico` from http.server is expected.

| Task | Prove it with |
|---|---|
| T0 | `git status --short` shows nothing staged and nothing tracked-modified; `git check-ignore -v docs/design/jelly-resume/rezmancer-snapshot.js` prints the rule; `git log --oneline -1` shows the commit; `git show --stat HEAD` doesn't list the snapshot or any `playground-v*.html`. |
| T1 | Screenshots at 1440×900 and at an emulated 390×844 (`emulate viewport "390x844x3,mobile,touch"`). Compare to the Reference: nav, logo, Resume button, hero with glow, tagline colors, Skills strip, 🍄/♫. The resume HUD isn't visible. |
| T2 | `list_network_requests` after load shows **no** `rezmancer-snapshot.js`. After dispatching `pointerenter` on the Resume button, it appears. `__jelly.loadState()` goes idle → loading → ready. No console errors while `NP === 0` (let it render 3 s with nothing loaded). |
| T3 | `__jelly.heroSparks(true)` screenshot: the sparks reproduce the photo where the DOM image was (compare against a screenshot with the DOM image visible). Stats fps ≥ 110 on desktop. |
| T4 | Screenshots 0.2 / 0.6 / 1.2 s after `openResume()`: the front sweeps from the origin, photo colors heat to white/cyan, and the chrome fades. fps ≥ 110 on desktop and ≥ 50 on the emulated phone with 4× CPU throttle (`emulate cpuThrottlingRate 4`). |
| T5 | With `?slow=3000`, the galaxy idles and then the intro runs. Take screenshots on the frame before and after the handoff (step with `requestAnimationFrame` hooks) and confirm there's no visible pop. Afterward, all 634 words are HOME (`__jelly.bodies().every(b => b.state === 0)`). |
| T6 | Synthetic click on the mock Resume button → `__jelly.loadState()` becomes loading or ready and the dissolve starts. Focus the hero, then `press_key Enter` → it opens. The hover hint is visible in a screenshot. ⤓ PDF has `download` and the right href. |
| T7 | Run open → close three times in a row: no errors, and the hero DOM image is visible and `opacity: 1` at the end of each close. Get screenshots mid-reverse. The sparks count returns to idle. |
| T8 | `navigate_page` to `...playground.html#resume?find=React`: it opens directly, and after landing `document.getElementById('findCount').textContent` is non-empty. `history.back()` (evaluate) → the reverse plays and the mock is back. |
| T9 | Click the mock "AWS" chip → after landing, the AWS matches are highlighted (findCount > 0) and the hash includes `find=AWS`. |
| T10 | Enable `simReduced`, click Resume → the HTML panel opens, no canvas animation starts (the dissolve doesn't run), Esc closes, and focus returns to the trigger. Emulated phone: sparks ≈ 6K (log H) and fps ≥ 50 during the dissolve. |
| T11 | Click 🍄 → bubble → Summon → opens. `list_network_requests` shows no `/api/` calls. |
| T12 | The Copy-prompt text mentions the integration. Changing a new setting adds its line. HANDOFF.md has the new section. `__jelly` has the new functions. |

## Acceptance

After all boxes are ticked, in a fresh isolated tab on the http URL:
1. Load → the mock hero looks like phillcodes.com, and no snapshot request appears in the network log.
2. Hover Resume → the snapshot is requested. Click → the hero dissolves into comet sparks from the button side → galaxy → the page prints → the resume is fully usable (rotate, Finder, chaos, black hole, music dance).
3. × → the reverse transition re-forms the hero. Hero click → it opens again from the click point. Esc closes.
4. A deep link `#resume?find=React` works; Back closes; Forward reopens.
5. A Skills chip opens the resume with that Finder query.
6. Simulated reduced motion → the plain panel; no WebGL animation.
7. Emulated phone (390×844, 4× CPU): the whole flow stays ≥ 45 fps. Desktop ≥ 110 fps.
8. No console errors (except the favicon 404). Close all test tabs and pause any audio you started.
9. `git log --oneline feat/jelly-resume-playground` shows one commit per task. `git status` is clean apart from ignored files. **Nothing pushed.**

## Stop conditions / open questions (only Phill can decide)

- **Pushing or opening a PR:** do not push. Before any push, Phill must confirm that nothing private is committed. The snapshot with phone and email is gitignored, so it must never be committed, and the real site will need a Rezmancer "web" variant without contact details.
- **Real-site route:** `/resume` (Next route) vs `#resume`. The playground uses a hash only; leave the decision to Phill (note it in HANDOFF).
- **Any change to `src/`** is out of scope. Stop and note it.
- **Performance:** if the emulated phone can't hold ≥ 45 fps during the dissolve even at 4K sparks, stop and report the numbers rather than cutting the effect further.
- **Hero PNG:** if it turns out not to be a transparent cutout (alpha everywhere is 1), stop. Sampling would include the background, and Phill must provide a cutout.
