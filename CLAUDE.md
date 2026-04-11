# CLAUDE.md — Phill Portfolio

Cyberpunk-themed developer portfolio for Phill Aelony. Next.js 16 (App Router) + React 19 + TypeScript + Tailwind + Framer Motion + React Three Fiber.

Live site: https://www.phillcodes.com

## Rules

- **Never run git commits, pushes, or `gh` commands.** The user manages version control. When asked to "commit", confirm the changes are ready and stop.
- **Accessibility is non-negotiable:** WCAG 2.1 AA, keyboard support on all interactive elements, 44×44px minimum touch targets, visible focus states.
- **Don't hand-write raw Three.js boilerplate.** `@react-three/fiber` + `@react-three/drei` are already installed — use them. For current Three.js / R3F / drei API, pull docs via the context7 MCP (`resolve-library-id` → `query-docs`) rather than pasting tutorials.

## Commands

```bash
npm run dev         # Next dev server (port 3000, Turbopack)
npm run build       # Production build
npm run start       # Serve production build
npm run lint        # ESLint (next lint)
npm test            # Jest
npm run test:watch  # Jest watch mode
```

## Directory Structure

```
src/
├── app/            # Next.js App Router (layout.tsx, page.tsx, globals.css)
├── components/     # React components (PascalCase, one per file)
│   ├── ui/         # shadcn-style primitives
│   └── music/      # MusicPlayer + assets
├── context/        # React Context providers (ShroomModeContext)
├── data/           # Content JSON: projects, skills, experience, education, testimonials, tracks
├── hooks/          # Custom hooks (useAudioPlayer)
├── lib/            # Utilities (audio-utils, canvas-utils, carousel-slides, cn helper)
├── styles/
├── types/
└── __tests__/      # Jest + Testing Library
```

## Key Files

- `src/app/layout.tsx` — Root layout; loads Google fonts (Audiowide / Nunito / Press Start 2P), mounts `Nav`, `MusicPlayer`, and the `ShroomModeProvider`
- `src/data/*.json` — **Content source of truth.** Edit these (not the section components) for copy, project, skill, or experience changes. Components map over the JSON.
- `src/context/ShroomModeContext.tsx` — Global "shroom mode" visual filter state
- `tailwind.config.ts` — Cyberpunk color palette and theme extensions
- `jest.config.ts` / `jest.setup.ts` — Test setup

## Design System

- **Theme:** Cyberpunk / "Tokyo at midnight"
- **Colors:** Neon cyan (primary), magenta (secondary), green (accent) on dark backgrounds — tokens live in `tailwind.config.ts`
- **Typography:** Audiowide (headings), Nunito (body), Press Start 2P (pixel accents)
- **Effects:** Neon glow, scanlines, HUD-style card corners, glitch text

## Gotchas

- **Next.js 16 + React 19 are bleeding-edge.** Older libraries may warn or break. Verify library compatibility and current APIs via context7 before assuming a pattern works.
- **`ShroomMode` applies a CSS filter to `#shroom-target`, not `<body>`.** `MusicPlayer` and the `ShroomMode` toggle sit *outside* that wrapper on purpose so they don't get distorted. Don't move them inside.
- **Content edits go in `src/data/*.json`,** not the section components.
