# CLAUDE.md — Phill Portfolio

Cyberpunk-themed developer portfolio for Phill Aelony, live at https://www.phillcodes.com (Vercel). Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 3 + Framer Motion + React Three Fiber, plus the "Shroom Wizard": a 3D character with an AI chat (Claude Haiku) backed by Upstash Redis rate limiting, and the "Jelly Resume": the hero photo dissolves into a 3D, knock-apart copy of Phill's resume at `/resume`.

## Rules

- **Git:** Claude may branch, commit, push and open PRs. Work on a feature branch off `master`; never commit straight to `master`.
- **Version bump** `package.json` in every PR (minor for features/perf, patch for fixes).
- **Accessibility is non-negotiable:** WCAG 2.1 AA, keyboard support on all interactive elements, 44×44px minimum touch targets (that includes `w-11 h-11` on mobile, not `w-10`), visible focus states, `prefers-reduced-motion` respected by every animation.
- **No real Anthropic calls from tests or verification.** Jest mocks the SDK; in the browser, stub `/api/wizard/chat` (e.g. a `fetch` override via an init script).
- **Use R3F + drei, not raw Three.js boilerplate.** Pull current Three.js / R3F / drei / Next APIs via context7 (`resolve-library-id` → `query-docs`) rather than from memory.
  - **Exception (Phill, 2026-10-13): the Jelly Resume engine** (`src/lib/jelly/`) is plain TypeScript on one raw WebGL2 canvas, ported from its playground. The other rules still hold: it's lazy (`next/dynamic`, `ssr: false`), one canvas, no setState per frame, paused while hidden, never mounted for reduced motion.

## Commands

```bash
npm run dev         # Next dev server (port 3000, Turbopack)
npm run build       # Production build
npm run start       # Serve the production build
npm run lint        # ESLint (`eslint .`; `next lint` no longer exists in Next 16)
npm test            # Jest (jsdom; API route tests opt into the node env)
npx tsc --noEmit    # Typecheck
```

Gates before a PR: `npx tsc --noEmit`, `npm run lint` (zero warnings), `npm test`, `npm run build`.

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx            # Fonts, Nav, MusicPlayer, ShroomMode, #shroom-target/#shroom-warp wrappers, JellyResumeHost + @modal
│   ├── page.tsx              # Section composition
│   ├── resume/page.tsx       # /resume: the semantic resume (+ the 3D overlay on a direct visit)
│   ├── @modal/(.)resume/     # /resume from the home page: the 3D overlay over the still-mounted home page
│   └── api/wizard/
│       ├── chat/route.ts     # POST: origin check → validate → reserve → Claude Haiku → settle usage
│       └── keepalive/route.ts# Daily Vercel cron (CRON_SECRET) so free-tier Upstash isn't deleted
├── components/               # PascalCase, one per file; ui/ = primitives, music/ = player, jelly/ = 3D resume host/overlay/HUD
├── context/                  # ShroomModeContext (global shroom-mode on/off)
├── data/                     # Content source of truth: *.json, testimonials.ts, wizard.json
├── hooks/                    # useAudioPlayer, useMediaQuery
├── lib/                      # rate-limit, wizard-prompt, wizard-tools, canvas/audio utils, site-music
│   └── jelly/                # the 3D resume engine (plain TS + WebGL2)
├── types/
└── __tests__/                # Jest + Testing Library
public/models/                # Wizard GLB (meshopt + WebP textures)
public/resume/                # The 3D resume's snapshot (snapshot.json + text.webp + decor.webp, no phone or email) and its cast (phill.glb, shrimp.glb)
```

## Key Files

- `src/data/*` — **edit content here**, not in section components. `wizard.json` holds the wizard's persona, lines and project knowledge.
- `src/components/ShroomMode.tsx` — summon button, wizard lifecycle, chat/ceremony state, and the shroom-mode visual effect.
- `src/components/ShroomWizard3D.tsx` — R3F canvas, GLB load, animation state machine (idle / spell → dance / walk).
- `src/components/WizardChat.tsx` — chat dialog; session history cached at module scope.
- `src/lib/rate-limit.ts` — `checkAndReserve` (atomic INCR + budget reservation, refunds rejects) and `settleUsage`.
- `tailwind.config.ts` — color tokens; `src/app/globals.css` — effects and keyframes.
- `src/lib/jelly/` — the Jelly Resume engine. `engine.ts` is the API (`createJellyEngine`: load, openFromHero/openDirect, close, find, chaos, …); `config.ts` holds the frozen look (`JELLY_CONFIG`, tuned in `docs/design/jelly-resume/playground.html`); `world.ts` (bodies, atlas, sparks), `physics.ts`, `render.ts` + `shaders.ts`, `hero.ts` (the dissolve and the reverse close), `snapshot.ts`. Design notes: `docs/design/jelly-resume/HANDOFF.md`.
- `src/lib/jelly/cast.ts` — the cast: Phill (the Number Slayers model) orbits the page, idling, and dances while the site's music plays (a new dance every ~16 s); shrimp drift through the nebula and pulse and wiggle to the music; clicks knock them away. `actors.ts` uploads a GLB, crossfades its clips (`Pose`) and draws it skinned or static; `gltf.ts` is a small GLB reader (meshopt, quantization, WebP). The cast loads as its own chunk once the page has printed. Tune it at `/resume?tune` (dev-only sliders; Copy → `CAST_CONFIG` in `config.ts`). Rebuild the models with `docs/design/jelly-resume/tools/actors.mjs` (its header has the command, including which dances to borrow).
- `src/components/jelly/JellyResumeHost.tsx` — the overlay host in the layout; it follows the URL through `resumeRoute` (set by `JellyResumeRoute` in both `/resume` routes) and keeps the canvas alive for the close. `JellyResumeCanvas.tsx` is the overlay (engine, HUD, keys, a11y); `resumeTrigger.ts` is the first-load side (hero/🍄 intent, prefetch, the plain-page fallback).
- `src/data/resume.ts` + `src/components/ResumeContent.tsx` — the semantic resume: the `/resume` page and the overlay's screen-reader copy.
- `public/resume/` — regenerate after changing the resume in Rezmancer: `node docs/design/jelly-resume/tools/snapshot.mjs --web ~/Desktop/dev/rezmancer/out/Phill_Aelony_Resume_AI_Engineer.html public/resume` (it strips the phone and email and refuses to write if any survive; never commit `docs/design/jelly-resume/rezmancer-snapshot.js`, which has them).

## Environment

See `.env.local.example`: `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `WIZARD_DAILY_BUDGET_TOKENS`, `WIZARD_PER_IP_DAILY_LIMIT`, `WIZARD_ALLOWED_ORIGINS`. Production values live in Vercel (`vercel env`).

## Design System

- **Theme:** Cyberpunk / "Tokyo at midnight"
- **Colors:** neon cyan (primary), magenta (secondary), green (accent) on dark backgrounds
- **Typography:** Audiowide (headings), Nunito (body), Press Start 2P (pixel accents)
- **Effects:** neon glow, scanlines, HUD card corners, glitch text

## Performance Rules

This site is animation-heavy; these are the patterns that keep it fast.

- **Hidden is not unmounted.** A `hidden`/`md:hidden` wrapper still runs a child's canvas, rAF loop and WebGL context. Decide what to mount with `useMediaQuery(MD_UP)` (returns `undefined` until hydrated).
- **Pause offscreen loops.** Use an IntersectionObserver (see `Vortex`) or R3F `frameloop={visible ? 'always' : 'never'}` (see `Testimonials3DCarousel`).
- **Never setState per animation frame.** Mutate refs/attributes inside rAF or `useFrame` (see `useAudioPlayer`'s live `frequencyData`, ShroomMode's filter loop).
- **Keep Three.js code-split.** Import 3D components with `next/dynamic` (`ssr: false`), and never re-export them from a barrel the layout imports. `music/index.ts` deliberately omits `AudioVisualizer` for this reason. Below-the-fold 3D goes inside `<LazyMount>`.
- **Don't declare components inside render** (it remounts them; for a `<Canvas>` that means a new WebGL context).
- **Keep drei props stable.** Changing `Sparkles` `count` rebuilds every particle buffer.
- **Optimize GLBs before committing**, e.g. `npx @gltf-transform/cli resize in.glb a.glb --width 1024 --height 1024` → `webp` → `resample` → `prune` → `meshopt`. drei's `useGLTF` decodes meshopt out of the box. Check the result in the browser.
- To measure: `npm run build && npm run start`, then record a Chrome performance trace with CPU throttling. Count `DrawFrame` events (frames actually drawn); the rAF rate alone hides compositor and raster cost.

## Gotchas

- **Shroom mode wrappers:** `#shroom-target` gets the hue cycle (a Web Animation on desktop, CSS classes on mobile); the inner `#shroom-warp` gets the SVG displacement filter (desktop only, updated ≤30×/s). `MusicPlayer` and `ShroomMode` sit outside both on purpose; don't move them inside. Fixed overlays inside the wrappers (MobileMenu, SkillScore) portal to `<body>`, because a filter or transform on an ancestor breaks `position: fixed`.
- **Escape layering:** WizardChat handles Escape in the capture phase and stops propagation so the chat closes without also dismissing the wizard. The 3D resume does the same (its Esc mustn't also end site shroom mode).
- **3D resume z-order:** `JellyResumeHost` sits in the layout outside `#shroom-target`/`#shroom-warp` (their filters break `position: fixed`). At z-50, DOM order puts it above the page and Nav and below `MusicPlayer` (the site's ♫ stays usable; there is one music player). While it's up, the page, the skip link and `#shroom-ui` are `inert`, and `#shroom-ui` (the wizard sits above it) fades out. Keep `#shroom-ui` a plain wrapper: no filter or transform.
- **The intercepting route:** a soft navigation from `/` to `/resume` renders `@modal/(.)resume` (the overlay over the home page, which stays mounted so the hero can dissolve and the close can land on it); a direct visit or reload renders `app/resume/page.tsx`. `@modal/default.tsx` must exist (returns null). To get the plain page from the home page, hard-navigate or reload (reduced motion and the no-WebGL fallback do).
- **Shared analyser:** the resume dances to the site's player through `src/lib/site-music.ts` (the player registers itself) and taps its `MediaElementAudioSourceNode` with its own 2048-point analyser (`createMusicTap`). Never call `createMediaElementSource` again on that element (it throws), and don't add a second player.
- **Measuring the 3D resume's cold open:** use a fresh isolated browser context per run (empty caches and a new renderer, so the engine's code runs in the interpreter, as on a first visit) and close other tabs that run the resume. Same-tab reloads keep V8's compiled code and decoded images and look ~2× better. Deferred engine work goes through `nextTask()` (one heavy job per frame); add new load steps there, not in a timeout.
- **WebGL lists uniform arrays by their first element:** look them up as `u['uJoints[0]']`, not `u.uJoints` (which is undefined, and fails silently: the 3D resume's Phill was invisible until this was fixed).
- **The game's Phill has llamas welded to his mesh and skinned to his arms.** Borrowed dances with big arm moves fling them and tear his poncho, so `actors.mjs --arms 1` keeps his idle arms while the rest of him dances. Retargeting note: glTF inverse binds already include the armature (Mixamo's is turned Z-up), so only the clips' local chain gets the armature's turn.
- **Editing the engine under `npm run dev`:** a hot reload can remount the overlay on a lost WebGL context, which sets the session's plain-page flag (`jelly-resume-plain` in sessionStorage) and you get the plain `/resume`. Clear sessionStorage and reload.
- **Upstash free tier deletes a database after 14 days without commands.** The keepalive cron in `vercel.json` prevents that. If the wizard chat ever shows the farewell line on every message, check that the DB still exists first.
- **jsdom gaps** (`matchMedia`, `IntersectionObserver`, `scrollTo`) are stubbed in `jest.setup.ts`. Components loaded with `next/dynamic` render asynchronously in tests, so use `findBy*`.
- **Next 16 + React 19:** verify library compatibility and current APIs before assuming a pattern works.
