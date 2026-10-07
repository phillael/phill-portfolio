# CLAUDE.md — Phill Portfolio

Cyberpunk-themed developer portfolio for Phill Aelony, live at https://www.phillcodes.com (Vercel). Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 3 + Framer Motion + React Three Fiber, plus the "Shroom Wizard": a 3D character with an AI chat (Claude Haiku) backed by Upstash Redis rate limiting.

## Rules

- **Git:** Claude may branch, commit, push and open PRs. Work on a feature branch off `master`; never commit straight to `master`.
- **Version bump** `package.json` in every PR (minor for features/perf, patch for fixes).
- **Accessibility is non-negotiable:** WCAG 2.1 AA, keyboard support on all interactive elements, 44×44px minimum touch targets (that includes `w-11 h-11` on mobile, not `w-10`), visible focus states, `prefers-reduced-motion` respected by every animation.
- **No real Anthropic calls from tests or verification.** Jest mocks the SDK; in the browser, stub `/api/wizard/chat` (e.g. a `fetch` override via an init script).
- **Use R3F + drei, not raw Three.js boilerplate.** Pull current Three.js / R3F / drei / Next APIs via context7 (`resolve-library-id` → `query-docs`) rather than from memory.

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
│   ├── layout.tsx            # Fonts, Nav, MusicPlayer, ShroomMode, #shroom-target/#shroom-warp wrappers
│   ├── page.tsx              # Section composition
│   └── api/wizard/
│       ├── chat/route.ts     # POST: origin check → validate → reserve → Claude Haiku → settle usage
│       └── keepalive/route.ts# Daily Vercel cron (CRON_SECRET) so free-tier Upstash isn't deleted
├── components/               # PascalCase, one per file; ui/ = primitives, music/ = player
├── context/                  # ShroomModeContext (global shroom-mode on/off)
├── data/                     # Content source of truth: *.json, testimonials.ts, wizard.json
├── hooks/                    # useAudioPlayer, useMediaQuery
├── lib/                      # rate-limit, wizard-prompt, wizard-tools, canvas/audio utils
├── types/
└── __tests__/                # Jest + Testing Library
public/models/                # Wizard GLB (meshopt + WebP textures)
```

## Key Files

- `src/data/*` — **edit content here**, not in section components. `wizard.json` holds the wizard's persona, lines and project knowledge.
- `src/components/ShroomMode.tsx` — summon button, wizard lifecycle, chat/ceremony state, and the shroom-mode visual effect.
- `src/components/ShroomWizard3D.tsx` — R3F canvas, GLB load, animation state machine (idle / spell → dance / walk).
- `src/components/WizardChat.tsx` — chat dialog; session history cached at module scope.
- `src/lib/rate-limit.ts` — `checkAndReserve` (atomic INCR + budget reservation, refunds rejects) and `settleUsage`.
- `tailwind.config.ts` — color tokens; `src/app/globals.css` — effects and keyframes.

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
- **Escape layering:** WizardChat handles Escape in the capture phase and stops propagation so the chat closes without also dismissing the wizard.
- **Upstash free tier deletes a database after 14 days without commands.** The keepalive cron in `vercel.json` prevents that. If the wizard chat ever shows the farewell line on every message, check that the DB still exists first.
- **jsdom gaps** (`matchMedia`, `IntersectionObserver`, `scrollTo`) are stubbed in `jest.setup.ts`. Components loaded with `next/dynamic` render asynchronously in tests, so use `findBy*`.
- **Next 16 + React 19:** verify library compatibility and current APIs before assuming a pattern works.
