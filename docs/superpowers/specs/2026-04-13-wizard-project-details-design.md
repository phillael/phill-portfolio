# Wizard Project Details Knowledge — Design Spec

**Date:** 2026-04-13
**Goal:** Give the Shroom Wizard moderate-depth knowledge about the tech stack and architecture of Phill's projects (portfolio site and Number Slayers), so it can answer recruiter/developer questions like "how does multiplayer work?" or "what's the site built with?"

## Decision Log

- **Depth level:** Moderate (B) — enough to impress a technical interviewer without bloating the system prompt. High-level architecture + key patterns + notable implementation details.
- **Data location:** Separate `project-details.json` (B) — keeps `projects.json` lean for the UI, scales as more projects are added. Only the wizard consumes the details file.
- **Portfolio treatment:** Treated as a regular project entry (A) — same format as Number Slayers in `project-details.json`.
- **Prompt guidance:** No new instructions (A) — existing Clear Speech rules ("hit the key facts and STOP") already cover the right behavior.
- **Implementation approach:** Flat JSON array (A) — consistent with existing data conventions, minimal plumbing changes.

## Data: `src/data/project-details.json`

New file. Array of objects, each with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Matches the project's `id` in `projects.json` |
| `architecture` | `string` | 2-3 sentence high-level summary (structure, layers, how they connect) |
| `keyPatterns` | `string` | 2-3 sentences on notable technical decisions |
| `notableDetails` | `string` | 2-3 sentences on standout implementation specifics |

### Number Slayers content

- **architecture:** pnpm monorepo with three packages — Next.js 14 frontend (`apps/web`), Colyseus WebSocket game server (`apps/server`), and a shared TypeScript types package (`packages/types`). The frontend renders 3D gameplay via React Three Fiber, while the server runs a 60fps authoritative game loop that syncs state to all clients via Colyseus schema patching.
- **keyPatterns:** Server-authoritative multiplayer — clients send input messages, the server validates and updates state, and Colyseus binary delta encoding pushes only changed fields to all players. Client state managed by three Zustand stores (game logic, Colyseus connection, multiplayer helpers). 3D rendering uses React Three Fiber with 18 custom hooks for player controls, character animations, physics, collision detection, and position interpolation.
- **notableDetails:** Dynamic math challenge generation system that scales difficulty per level. Modular cash/scoring system with per-number earnings, health bonuses, and time bonuses. Character system with selectable models, skeletal animations, and smooth crossfade transitions. Graceful server shutdown that warns active players and lets games finish. Howler.js for spatial audio.

### phillcodes.com content

- **architecture:** Next.js 16 (App Router) with React 19, TypeScript, and Tailwind CSS. Section-based single-page layout driven by JSON data files — components map over the data rather than hardcoding content. Deployed on Vercel.
- **keyPatterns:** Three.js via React Three Fiber powers multiple 3D experiences — the animated Shroom Wizard model (GLTF with 11 animations), a 3D testimonials carousel (Canvas 2D rendered to Three.js sphere geometry), and particle effects. Framer Motion handles DOM animations and scroll-triggered reveals. The AI chat uses Claude Haiku via Anthropic SDK on a Next.js API route with Upstash Redis rate limiting (per-IP daily cap + global token budget).
- **notableDetails:** "Shroom Mode" psychedelic effect uses SVG feTurbulence + feDisplacementMap filters with a 30-second intensity ramp, applied to a wrapper div so the music player stays undistorted. Custom Web Audio API music player with real-time frequency visualization (bass/treble/intensity bands). The wizard has a two-mode persona — Mystic Voice for banter, Clear Speech for career facts — with a tool-use mechanism that triggers an interactive mushroom ceremony UI.

Only these two projects get entries. TimelyCare is proprietary (covered by `experience.json`). Pong is too simple.

## Type: `ProjectDetails` interface

Add to `src/types/content.ts`:

```typescript
export interface ProjectDetails {
  id: string
  architecture: string
  keyPatterns: string
  notableDetails: string
}
```

All fields required.

## Prompt Integration: `src/lib/wizard-prompt.ts`

- Import `project-details.json`
- Add `<project-details>{{PROJECT_DETAILS_JSON}}</project-details>` in the template, immediately after the `<projects>` block
- Add `.replace('{{PROJECT_DETAILS_JSON}}', JSON.stringify(projectDetails, null, 2))` in `buildWizardSystemPrompt()`

No changes to persona instructions, mode definitions, or rules.

## Tests

### `wizard-prompt.test.ts` (additions)

- Built prompt contains `<project-details>` and `</project-details>` tags
- Built prompt contains a known string from the details (e.g., "Colyseus" or "monorepo")

### `data-architecture.test.ts` (additions)

- `project-details.json` entries conform to `ProjectDetails` interface (all have `id`, `architecture`, `keyPatterns`, `notableDetails`, all strings)
- Every `id` in `project-details.json` has a matching `id` in `projects.json` (no orphaned entries)

No new test files.

## Token Impact

Each project entry is roughly 150-200 tokens. Two entries ≈ 300-400 tokens added to the system prompt. Well within the existing budget (Claude Haiku, `max_tokens: 400` for responses, system prompt cached with ephemeral cache control).

## Files Changed

| File | Change |
|------|--------|
| `src/data/project-details.json` | **New** — project architecture data |
| `src/types/content.ts` | Add `ProjectDetails` interface |
| `src/lib/wizard-prompt.ts` | Import details, add template tag + replace call |
| `src/__tests__/wizard-prompt.test.ts` | Add project-details assertions |
| `src/__tests__/data-architecture.test.ts` | Add project-details validation |
