# Experience refresh: the career section, the Wizard and the neighbours (v1.6.0)

## Context

### What exists (v1.5.0, master 66b3334)
- The home page's Experience section (`ExperienceSection.tsx` + `TimelineCard.tsx`) renders `src/data/experience.json`: 2025-era copy ("Senior Software Engineer II, Feb 2023 – Present", "Agent OS", "5–10x velocity"), boxy clipped expandable cards.
- `experience.json` also feeds **the Shroom Wizard's system prompt** (`src/lib/wizard-prompt.ts`) and **the SEO JSON-LD** (`src/lib/structured-data.ts`, `jobTitle` = `experience[0].title`), so both repeat the stale story. `src/data/wizard.json`'s `professionalSummary` still says "Senior AI-Enabled Software Engineer … 6+ years".
- `src/data/resume.ts` (feeds `/resume` and the 3D Jelly Resume's screen-reader copy) is current, mirroring Rezmancer's `content/resume.yaml` (AI Engineer variant). The 3D resume itself is drawn from `public/resume/snapshot.json`, generated from Rezmancer's HTML.
- The nav's Resume button, `/resume` and the 3D resume's HUD all link `/Phillip_Aelony_Resume_2025.pdf` (three hard-coded copies of the path).
- `projects.json`: Number Slayers (old vercel.app link), Pong, a TimelyCare "project". No Quadzilla, Rezmancer or Jelly Resume.

### What we're building (designed with Phill, 2026-10-15/16; all his calls)
- **One source of truth.** Phill: the facts come from **his resume** (Rezmancer `content/resume.yaml` → `src/data/resume.ts`) **and his two work handoffs** (2026-10-07 fact sheet, 2026-10-16 achievements handoff, both outside this repo). A new `src/data/career.ts` imports `resume.ts` for titles, dates and companies and adds the home page's layer (tiles, one-liners) plus a vetted, public-safe `notes` list for the Wizard. The home page, the Wizard and the JSON-LD all read it. `experience.json` is deleted. A Jest test proves every number in `career.ts` appears in `resume.ts` or in a sourced allowlist.
- **Titles (Phill, 2026-10-16):** Software Engineer (Feb 2023) → promoted to **Senior Software Engineer II (Apr 2025)** → promoted to **Generative AI Engineer (Apr 2026)**. Already in Rezmancer (PR #18, stacked on #17, built in the worktree `~/Desktop/dev/rezmancer-titles`).
- **The Experience section = mockup E2** (`docs/design/experience-refresh/round2/e2-hud.html`): Apple-clean with a light futuristic HUD. "Senior AI Engineer" headline with the site's purple neon; a scroll-lit cyan→magenta line down the left with a node per job; the promotions as ticks on the line; four glass HUD tiles for TimelyCare (rows on phones) with a cursor spotlight, tilt, notches, reveal scan and count-up; one line per earlier job; music as a magenta stop with a **Listen** button that opens the site's music player; HUD buttons **Open the 3D resume** and **Download the PDF**.
- **The Wizard** knows the new story, and more than the page shows (the `notes`).
- **Neighbours:** Projects gains Quadzilla, Rezmancer and Jelly Resume (drops the TimelyCare card; fixes the Number Slayers link); the nav PDF becomes Phill's latest Rezmancer PDF; the hero's screen-reader h1, About ¶4, `skills.json` and the Wizard summary lose their stale claims; the 3D resume is regenerated with the three titles.

### Rejected (don't rediscover)
- **Pixel font (Press Start 2P) in this UI**, busy layouts, chip walls, boxy clipped-corner cards. Phill: "cheap and childish"; he wants Apple-clean minimal + a light HUD. Audiowide + Nunito only.
- **A 3D hologram in the header** (mockup `e-holo.html`): "isn't really adding much". The header stays text only.
- **Square target-lock corner brackets** on cards and buttons on hover: Phill doesn't like them. The cards keep only the two soft corner arcs (`.hud::before/::after`), always on.
- **A `/resume?play` hook / "Play through my career" button:** not wanted. The CTA opens the 3D resume.
- **A big stats readout above the timeline** (round 2 A/C): the tiles carry the numbers.
- **Copy:** "dormant" and "from scratch" for the marketing platform (a colleague scaffolded the prototype; Phill took it to production); "poorly built" for the old payment system (say "legacy, error-prone"); the Growth tile (replaced by Care operations); the old site's "$60B+ intelligent cloud revenue", ECO "$7.1M", "10x fanbase", "5–10x velocity" (not in any source).
- **Filters, case-file dossiers, patch notes** (round 1 B/C/D): explored, not chosen.

## Binding — do not redesign

### 1. The mockup is the visual and interaction contract
`docs/design/experience-refresh/round2/e2-hud.html` (styles in its `<style>` + `round2/hud.css`; copy in `round2/highlights.js`). Serve it with `python3 -m http.server 8765` from the repo root and keep it open next to the real page. Port it faithfully: layout, spacing, type scale, colors, glows, the rail, the ladder, the tiles' layout and every effect listed below, the buttons. Map its tokens to the site's (`--cyan` = `hsl(var(--primary))`, magenta = the site's `--secondary`/the `neon-text-purple` hue, green = `--accent`; `--ink-2`/`--ink-3`/`--glass`/`--hair` become local custom properties). Use the site's `neon-text-purple` (headline), `neon-text-blue` (company names) and a magenta neon for music. Fonts via the existing `font-heading` (Audiowide) and body (Nunito).

Effects to keep (all CSS transforms/opacity + small rAF writers; no React state per frame):
- **Rail:** a 1px hairline; a gradient fill (cyan → hot cyan → magenta) scaled by scroll (`--p` on the track, written by one passive scroll listener in rAF, active only while the track intersects); a small white head; nodes light (`.lit`) when the fill reaches them; music's node magenta.
- **Ladder:** three titles newest first on ticks from the rail; kickers "Promoted · Apr 2026", "Promoted · Apr 2025", "Joined · Feb 2023"; the current title white with a cyan tick + dot glow.
- **Tiles** (desktop ≥ 1000px: one wide + three; 640–999: 2 columns; < 640: plain rows, no glass, hairlines between):
  - glass `.hud` panel with the two soft corner arcs; notched cyan edge accents (top ~58–76%, bottom ~14–26%) + a small tick strip that extend on hover;
  - cursor spotlight on the glass (radial sheen) **and** on the border (masked radial ring), tilt ≤ 6°/5° toward the cursor — **fine pointers only** (`(hover: hover) and (pointer: fine)`), never with reduced motion (the spotlight may stay);
  - a hologram split on the number on hover (−1.5px magenta / +1.5px cyan text-shadow);
  - reveal: one scan sweep + a short power-on flicker + a count-up (thousands separators kept: `6,700+`) once when the tile enters view;
  - the + is a dashed 32px ring that turns 90° on hover; open rotates the + 45°; opening draws a glowing line, then the one-sentence detail (smooth height + fade);
  - the tech line is **pinned to the bottom** of each tile (rows `auto auto auto 1fr`, the stack `align-self: end`) so all tiles line up;
  - on touch: a soft pulse from the tap point.
- **Dates** (right side of each stop): neon (`hsl(188 70% 86%)`, weight 600, cyan glow; magenta for music).
- **HUD buttons** (`HudButton`): glass body, faint scanlines, a light sweep on hover/focus, border glow; **no corner brackets**. Variants: `primary` (energized cyan fill, dark text, 3D-cube icon, three SVG chevrons that march on hover), `secondary` (outline, a download arrow that drops on hover), `music` (magenta, headphones icon, a 4-bar equalizer that wakes on hover). Min height 54px.
- The "Now" dot breathes with **opacity only** (the mockup's original box-shadow animation repainted every frame).
- **Reduced motion** (`prefers-reduced-motion`): everything static; the rail fully drawn and every node lit; numbers show final values; no tilt/scan/flicker/pulse/sweep/marching.

### 2. Copy (exact)
Section: eyebrow **Experience** (the `h2`, `id="experience-heading"`, section `id="experience"`), headline **Senior AI Engineer** (from `resume.headline`), lede **"Eight years shipping production software across web, mobile and cloud. Today I own platforms end to end, as engineer, designer and product manager, and build AI into them."** (Phill, 2026-10-16, mid-loop: emphasize that in the current role he's the engineer, designer and product manager in one; the three-roles clause is this loop's wording, flagged in the PR for his OK)

TimelyCare: company **TimelyCare**, blurb **"Virtual health for colleges and universities"**, dates **Feb 2023 – Present**, "Now" marker. Tiles (name · metric · metric label · title · detail · stack):

| # | Name | Metric | Label | Title | Detail (tap/click to open) | Stack |
|---|---|---|---|---|---|---|
| 1 (wide) | Marketing platform | ~5 wks | prototype to production | Built our in-house replacement for Customer.io and took it to production in about five weeks. | Segments, broadcasts and an event-driven automation engine for a ~1.4M-student audience, plus a Claude-powered assistant and an **MCP server** so marketers and AI agents work in plain English, with a person confirming every write. | Next.js · Fastify · Postgres · AWS · Terraform · Claude · MCP |
| 2 | Provider payments | ~750 | clinicians paid through it | Built our provider payment platform from scratch and cut payout errors to near zero. | It audits every payout in ~3 minutes instead of 44, reconciles every dollar across 50K+ visits a month, and closed a six-figure-a-year gap in the legacy payment logic. | React · TypeScript · Node.js · MySQL · AWS · Terraform |
| 3 | AI resource platform | ~68K | community resources | Built the AI tools care coordinators use to find students the right help. | An AI Resource Finder that moved the care team off ChatGPT and into our product, on a directory of ~68K resources from 12 open-data sources, built to replace a ~$200K-a-year vendor contract. | OpenAI Agents SDK · Fastify · MySQL · React · React Native |
| 4 | Care operations | 6,700+ | tickets a year removed | Redesigned referral routing and took 6,700+ tickets a year off the care team. | Reminder-style referrals now go straight to the student's task list instead of the care queue: 40%+ of referral volume and about 1.1 full-time roles of capacity, shipped across four web apps behind a flag. | Node.js · TypeScript · React · Feature flags |

Under the tiles: "Before that: an event-driven reporting dashboard that helped sales close large clients, and test suites that **cut post-release bugs 50%**."

Earlier stops (company · title · dates · line · stack):
- **Sessions** · Software Engineer · Jul 2022 – Dec 2022 · "Built features and a React / React Native component library for a platform connecting 130K musicians with 1.7M fans." · React · React Native · TypeScript
- **Designit for Microsoft** · Front End Developer · Mar 2021 – Jul 2022 · "Built accessible Azure product pages through 50% year-over-year growth, and raised team velocity 25%." · C# · ASP.NET MVC · JavaScript · HTML · CSS · Accessibility (JavaScript, HTML, CSS: Phill, 2026-10-16, after the build)
- **phillcodes.com** · Freelance Developer · Dec 2018 – Dec 2020 · "Built client web apps end to end in React, TypeScript and Next.js." · React · Next.js · JavaScript · HTML · CSS · AWS (JavaScript, HTML, CSS: Phill, 2026-10-16, after the build)
- **Guitarist & Composer** (magenta) · The Funky Knuckles · Strange Loop Games · 1998 – Present · "Adaptive score for the award-winning game **ECO** (314K units sold), a **#1 iTunes jazz album** with The Funky Knuckles, and 15+ years teaching." · B.A. Jazz Studies, University of North Texas · **Listen** button (visible text "Listen", accessible name "Listen: open the music player").

CTA: **Open the 3D resume** (primary; `href="/resume"`, click → `openResume({ origin: click point, tint: 0, opener: the link }, null)` from `resumeTrigger.ts`, hover/focus → `prefetchResume()`; with reduced motion `openResume` already hard-navigates to the plain page) and **Download the PDF** (secondary; the PDF constant, `download`).

### 3. `src/data/career.ts` shape
```ts
import { resume } from './resume'

export interface CareerTile { id: string; name: string; metric: string; metricLabel: string; title: string; detail: string; stack: string[] }
export interface CareerRole { title: string; start: string; dates: string } // newest first; start = the part before " – "
export interface CareerJob {
  id: string; company: string; blurb: string; dates: string; current: boolean
  roles: CareerRole[]          // from resume.ts (TimelyCare: experience[0].roles; earlier: resume.earlier)
  tiles: CareerTile[]          // TimelyCare only
  line?: string                // earlier jobs' one-liner; TimelyCare: the "Before that" line
  stack: string[]
}
export interface Career {
  headline: string             // resume.headline
  intro: string
  jobs: CareerJob[]            // TimelyCare, Sessions, Designit for Microsoft, phillcodes.com
  music: { title: string; company: string; dates: string; line: string; education: string }
  notes: string[]              // the Wizard's extra facts (§4); never rendered on the page
}
/** Numbers allowed in career.ts beyond resume.ts, each with where it comes from */
export const FACTS: { value: string; src: string }[]
export const career: Career
```
Titles, companies and dates come from `resume.ts` (never retyped); the blurb, lines, tiles, intro and notes are this file's own. `**bold**` marks bold runs (render with `richText` from `resume.ts`).

### 4. The Wizard's notes (`career.notes`, exact facts; public-safe extract of Phill's handoffs; add nothing else from them)
1. In 2026 Phill moved from the core platform to owning new platforms end to end, working directly with Finance, Care Operations, Marketing and Compliance, and shipping to production himself.
2. Titles at TimelyCare: Software Engineer (Feb 2023), promoted to Senior Software Engineer II (Apr 2025), then to Generative AI Engineer (Apr 2026).
3. Nurture, TimelyCare's in-house lifecycle-marketing platform: he took it from prototype to production in about five weeks (54 merged PRs) as the replacement for Customer.io: Okta SSO, a dedicated AWS account in Terraform, SES delivery tracking, a segment builder, broadcasts, and an event-driven automation engine with a shadow mode for side-by-side comparison. It is live in production.
4. Ask Nurture and the Nurture MCP server: a Claude-powered assistant on every page and an MCP tool surface, so marketers and AI agents build segments, emails, automations and reports in plain English. Writes never run inside the model's turn: they become action cards a person confirms; API keys are scoped and can't send, approve or delete; tool results carry counts, never recipients.
5. A natural-language audience builder on Claude (tool use, extended thinking) where prompt caching cut repeated-prefix input cost about 90%.
6. He turned the care team's ChatGPT custom GPT into an in-product AI Resource Finder (OpenAI Agents SDK, hosted web search, structured output, SSE streaming): school-first results from each school's own resources, one-click add to the directory, attach to a case or share with the student, a no-student-identifiers rule, and cards that render only whitelisted fields so model output never becomes markup.
7. A new TypeScript/Fastify microservice holds ~68K community resources from 12 open-data sources (OpenStreetMap, the National Transit Database, CareerOneStop, IRS records, IMLS libraries, HUD and more) with Census geocoding, on the web app, the React Native app, and the admin and campus portals. It is built to replace a ~$200K-a-year vendor contract. Replacing unindexed LIKE scans with MySQL FULLTEXT search made its search about 10× faster.
8. A data-hygiene engine processed 70K+ records and auto-resolved 2,374 duplicates on its first run, and an LLM duplicate adjudicator's autonomy is gated by pattern: dismissals can be automatic, merges always go to a person. Real-data runs caught 5 bugs that 496 unit tests missed.
9. A payment-integrity app Finance uses for ~750 contract clinicians and 50K+ visits a month: automated audits (44 minutes down to ~3), an approval gate before publishing, payment rules as effective-dated data, and detection of visit scenarios no rule covers. It surfaced and closed a six-figure-a-year gap in the legacy payment logic, and Finance has run every monthly cycle in it since mid-2026.
10. He launched lifecycle email in about four weeks with a consent-gated member sync, cut the email vendor's billable profiles from 256% to about 93% of plan (919K profiles removed in about 6 minutes with 0 failures), ran an abandoned-signup pilot that registered 7.1% of emailed students vs ~3% for a comparison group, and found web signup completing at 48% vs 88% in the mobile app.
11. Campus access governance: self-serve PHI permission editing gated by legal attestation and clinical countersignature, an account audit trail, and self-service IP allowlists with lockout guardrails; HIPAA Safe Harbor auto-redaction of faculty and staff health data across the campus portal and its exports; admin emulation and a campus Demo Mode.
12. He root-caused a weeks-long provider session-drop bug to the deployment pipeline and was thanked publicly by the company's Chief Product and Technology Officer; fixed a visit outage caused by one export fanning out into 200+ concurrent queries; and restored PDF exports for every campus client.
13. He redesigned referral routing so reminder-style referrals go to the student's task list: 6,700+ fewer care tickets a year (40%+ of referral volume, about 1.1 full-time roles).
14. He works AI-natively: design docs, then Claude Code with custom skills and subagents, isolated worktrees and test-driven loops. In the past year: 251 merged PRs and 392 reviews, up to 46 merged PRs a month. As on-call reviewer for the company's autonomous coding agent he caught two high-severity errors and shipped its push-notification migration (11,889 jobs, 0 failures).
15. Earlier at TimelyCare: an event-driven reporting dashboard that helped sales close several large clients, and test suites (Vitest, Playwright, Detox) that cut post-release bugs 50%.
16. (Phill, 2026-10-16, mid-loop) In his current role he is the engineer, designer and product manager in one: he coordinates with stakeholders, designs and builds the products, works with the legal and compliance teams so everything meets legal standards and HIPAA, talks with the medical providers and therapists who use what he builds about their needs, and communicates app changes to the rest of the company.

**Confidentiality (binding for every string in this PR; the repo and site are public):** no school or customer names; no people's names (roles only); no vendor named except Customer.io; no dollar figures except "~$200K-a-year vendor contract" and "six-figure"; never describe the payment finding as money saved or lost; never say Customer.io was "replaced" (non-renewal is pending) or the vendor contract "eliminated"; never copy anything else from the handoffs in `~/Downloads`.

### 5. Projects (`projects.json`, in this order)
1. **Quadzilla**: "AI strength coach for iOS and web. A coach agent holds your whole training history and changes your program through typed tools, with an auditable decision log. Voice logging, Apple Health sync, offline replay. On TestFlight." Stack: Expo, Next.js, tRPC, Neon Postgres, Vercel AI SDK, Claude. No links. Image `/images/projects/quadzilla.png` (placeholder until Phill sends one; `ProjectCard` already falls back).
2. **Number Slayers**: "Multiplayer 3D math game. Server-authoritative multiplayer with snapshot interpolation at 60fps, AI enemy bots, an adaptive Web Audio mixer, and an FBX→GLB pipeline that cut load size 88%. I wrote the soundtrack too." Stack: React Three Fiber, Colyseus, Next.js, Convex, Railway. `liveUrl` https://numberslayers.com, keep `repoUrl`.
3. **Rezmancer**: "AI resume builder, in development. Resume as code, a pixel-exact PDF and a Claude builder that keeps a career bank of sourced facts: every number it writes must trace back to one. Tailors a resume per posting and flags any line nothing backs." Stack: Next.js 16, Neon Postgres, Better Auth, Vercel AI SDK, Claude. No links (invite-only). Image `/images/projects/rezmancer.png` (placeholder until provided).
4. **Jelly Resume**: "This site's resume as a soft-body toy and a platformer: the hero photo dissolves into a copy of my resume you can knock apart, on one raw WebGL2 canvas, and Play mode turns it into a run from my name to the last line." Stack: TypeScript, WebGL2, Custom physics, Web Audio. `liveUrl` `/resume` (same tab: internal links get no `target="_blank"`). Image: a screenshot of the 3D resume (T8).
5. **Pong Multiverse Alpaca Squadron**: unchanged.
The TimelyCare card goes (it's in Experience now). `project-details.json` (Wizard only) gains `quadzilla`, `rezmancer` and `jelly-resume` entries in the existing three-field shape, from the descriptions above plus: Quadzilla = an Expo app and a Next.js web app sharing a tRPC API on Neon Postgres, the coach a Vercel AI SDK agent on Claude; Rezmancer = a Turborepo monorepo (YAML → Zod schema → React renderer → Playwright PDF with 0-pixel parity tests), Next.js 16 editor with Neon + Better Auth, the AI routed by task (Opus for writing, Sonnet for chat, Haiku for quick edits), a career bank whose deterministic grounding check requires citations and numbers to trace to facts; Jelly Resume = plain TypeScript on one WebGL2 canvas (spring soft bodies per word, a glyph atlas, skinned GLB characters, lazy chunks, paused while hidden, never mounted for reduced motion), Play mode's level read off the text lines (one-way platforms, role checkpoints, Impact coins).

### 6. Neighbours (exact)
- `HeroSection.tsx` sr-only h1: **"Phill Aelony, Senior AI Engineer"**.
- `AboutSection.tsx` ¶4 (keep Phill's joke voice; change only the end): "… and now I am **a Generative AI Engineer at TimelyCare, building AI agents and whole platforms,** and it is awesome and I do great work." (the highlighted part replaces "doing full stack development for a company called TimelyCare"; keep the `HighlightedText` on TimelyCare). Flag it in the PR for Phill.
- `wizard.json` `professionalSummary`: "Phill Aelony is a Senior AI Engineer (his title: Generative AI Engineer at TimelyCare) based in Minneapolis, MN, with 8 years shipping production software across web, mobile and cloud. He owns greenfield platforms end to end, from stakeholder discovery to production, as engineer, designer and product manager in one, and builds LLM features into them: agents, MCP servers, streaming chat." (the three-roles clause: Phill, 2026-10-16, mid-loop)
- `skills.json`: keep the three categories (SkillsSection/SkillScore and tests rely on them). Technical: add Anthropic SDK, OpenAI Agents SDK, Terraform, Fastify, Postgres. Professional: remove "Agent OS". Nothing else.
- JSON-LD `jobTitle`: **"Generative AI Engineer"** (the real title), `worksFor` TimelyCare, both from `career.ts`.
- The PDF: `public/Phill_Aelony_Resume.pdf` = `~/Desktop/dev/rezmancer-titles/out/Phill_Aelony_Resume_AI_Engineer.pdf` (PR #18's build; it has Phill's phone and email, as the 2025 PDF did: approved). One constant `RESUME_PDF` (in `src/data/resume.ts`) used by the nav button, `/resume` and `JellyHudBar.tsx`; delete `public/Phillip_Aelony_Resume_2025.pdf`.
- `SiteMusic` gains `open(): void`; `MusicPlayer` registers it (expands the panel, focus as when the FAB opens it). Still one player; never a second audio element or `createMediaElementSource` call.

## Task checklist

- [x] **T0: branch + green baseline.** `git fetch origin && git switch -c feat/experience-refresh origin/master` (`AGENTS.md` and `next-env.d.ts` are dev/build-touched: never commit them). Run the four gates and record the results here. Commit this plan + `docs/design/experience-refresh/` (round 1 and round 2, as they are): `docs(experience): design mockups + plan`.
  - *Done 2026-10-16 on origin/master 66b3334:* `npx tsc --noEmit` clean · `npm run lint` clean (0 warnings) · `npx jest --no-watchman` 55 suites / 609 tests passed (6.6 s) · `npm run build` OK (13 routes). Committed the plan, `round2/` and round 1's `shared.js` (round 2 loads it). **Round 1's other files were left uncommitted:** see Stop conditions.
- [x] **T1: three titles in `resume.ts`.** TimelyCare roles: Generative AI Engineer (Apr 2026 – Present), Senior Software Engineer II (Apr 2025 – Apr 2026), Software Engineer (Feb 2023 – Apr 2025). Add `export const RESUME_PDF = '/Phill_Aelony_Resume.pdf'` (used from T7). Update the header comment. `resume-page.test.tsx`: the three roles render under TimelyCare in order.
- [x] **T2: `career.ts` + the grounding test.** Per Binding §3–4 (copy from Binding §2 and §4 exactly). New `src/__tests__/career-data.test.ts`: TimelyCare has 4 tiles and 3 roles newest first, titles and dates equal `resume.ts`; every digit run in every `career.ts` string (tiles, lines, intro, notes) appears in `JSON.stringify(resume)` or in `FACTS` (compare digits only, e.g. `6,700` → `6700`); every `FACTS` entry has a non-empty `src`; no string contains `dormant`, `from scratch` in the Nurture tile, or `replaced Customer.io`.
- [x] **T3: `SiteMusic.open()`.** `src/lib/site-music.ts` + `MusicPlayer.tsx` (register `open: () => setIsExpanded(true)`, plus whatever focus the FAB click does). Test: rendering `MusicPlayer` then calling `getSiteMusic()!.open()` expands the panel (the FAB's `aria-expanded` becomes `true`).
- [x] **T4: `HudButton`.** `src/components/experience/HudButton.tsx` + its CSS (a CSS Module next to it, like `jelly/JellyShrimpShow.module.css`; keyframes inside). Props: `variant: 'primary' | 'secondary' | 'music'`, `href?` (renders `<a>`) or `onClick` (renders `<button type="button">`), `icon`, children, `ariaLabel?`, `download?`, plus pass-through handlers. Decorative layers `aria-hidden`. RTL tests: link vs button, accessible name, `download` attribute, keyboard activation.
- [x] **T5: `HighlightTile`.** `src/components/experience/HighlightTile.tsx` + CSS: Binding §1's tile effects. The button has `aria-expanded`/`aria-controls`, is named by its title (`aria-labelledby`) and described by the metric + label + stack (`aria-describedby`), not by its whole text. Esc inside an open tile closes it and returns focus to its button. **Count-up:** the final number is rendered by React (SSR/no-JS show it) in an `aria-hidden` span plus an `sr-only` twin; the effect writes the visible span's existing text node `nodeValue` in rAF (never replace React's nodes, never setState per frame); skipped with reduced motion. **Tilt/spotlight:** CSS custom properties written from a rAF-throttled `pointermove`, fine pointers only. **Tap pulse:** non-mouse `pointerdown`. RTL tests: toggle, Esc + focus return, the sr-only final number, no count-up with reduced motion (stub `matchMedia`).
- [x] **T6: the new Experience section.** Rewrite `src/components/ExperienceSection.tsx` from `career.ts` per Binding §1–2 (subparts in `src/components/experience/`: the rail + stops, the ladder; reuse `AnimatedSection` for reveals if it matches the mockup, otherwise an IntersectionObserver class toggle). Rail: one passive scroll listener (rAF, gated by an IntersectionObserver on the track) writing `--p` on the track via a ref, toggling `lit` on stops via refs. Listen → `getSiteMusic()?.open()`. Open the 3D resume → `openResume` (Binding §2). Delete `TimelineCard.tsx`, `experience.json`, the `Experience` type and the `.timeline-line`/`.timeline-dot` CSS if unused. Rewrite `experience-section.test.tsx` (section id + heading; headline; three ladder titles newest first with Promoted/Joined kickers; four tiles with their metrics; earlier stops' headings; Listen calls `open`; the CTA hrefs); fix `data-architecture.test.ts` and `structured-data.test.tsx` where they import the deleted files (T9 rewrites the JSON-LD source; here just keep them compiling and green).
  - *Done 2026-10-16:* `ExperienceSection.tsx` + `components/experience/` (`ExperienceTrack` = the rail, `TitleLadder`, `useReveal`, `motion.ts`, `Experience.module.css`). Checked on the dev server next to the mockup: at 1280 the four tiles' boxes match the mockup to the pixel (200/120/968×198, then three 312×352); hover (tilt, spotlight, hologram number, notches), open/close, Esc (focus stays), Listen opens the player (focus to its close button), Open the 3D resume opens the overlay and closing it lands back on the same scroll position with focus on the button; at 375 (touch) the tiles are rows, the tap pulse runs, both buttons are full width, `scrollWidth === innerWidth` (375); no console errors or warnings. Notes: **`experience.json` and the `Experience` type stay until T9** (`wizard-prompt.ts` and `structured-data.ts` still read them; T9 deletes them and fixes `data-architecture.test.ts`/`structured-data.test.tsx`). The CTA already uses `RESUME_PDF` (the file lands in T7). Nunito now loads 300 and 800 too (the lede and bold runs; one variable file, no extra bytes). `HudButton` pins its colors against the global `a:hover`/`a:focus`. Edge (not this task): opening the 3D resume after landing on `/#experience` and closing it scrolls back to the section top (the host's `router.back()` re-applies the hash).
- [x] **T7: the PDF.** Copy the PDF (Binding §6) to `public/Phill_Aelony_Resume.pdf`; use `RESUME_PDF` in `ResumeDownloadButton.tsx`, `app/resume/page.tsx`, `JellyHudBar.tsx` (keep its `RESUME_PDF` export name by re-exporting, or update importers) and the CTA; delete the 2025 PDF; update the five tests that assert the old path.
- [x] **T8: Projects.** `projects.json` + `project-details.json` per Binding §5; `ProjectCard`: internal `liveUrl`s open in the same tab. Jelly Resume screenshot: run the dev server, open `/resume` at 1280×800, wait for the page to settle (no Play), screenshot, crop to 16:9, save `public/images/projects/jelly-resume.webp` (≤ 150 KB). Update `projects-section.test.tsx` and `data-architecture.test.ts` (5 projects; no TimelyCare card; Number Slayers → numberslayers.com).
  - *Done 2026-10-16:* five cards in order; Number Slayers → numberslayers.com (new tab), Jelly Resume → `/resume` (same tab, no `target`/`rel`); `jelly-resume.webp` 1280×720, 92 KB (a 1280×800 shot of `/resume` cropped to 16:9; taken before T11, so it shows the two-title snapshot; at card size it can't be read). One deviation: **Quadzilla and Rezmancer have no `imageUrl` yet** (now optional; the card shows its placeholder) instead of paths to images that don't exist, which would 404 and log a console error on `/` (Acceptance 10). Add `"imageUrl": "/images/projects/<id>.png"` when Phill sends them. Browser: 1280 (three columns) and 375 (one, `scrollWidth === innerWidth`), placeholders render.
- [x] **T9: the Wizard + SEO.** `wizard-prompt.ts`: drop `experience.json`; `<experience>` = `JSON.stringify` of `career.jobs` + `career.music` (company, dates, roles, tiles' title + detail, lines); new `<career-notes>` = `career.notes` as a bulleted list; `{{SUMMARY}}` = the new `wizard.json` summary (Binding §6). Tell the Wizard in its Clear Speech rules that `career-notes` are true details it may share. `structured-data.ts`: `jobTitle`/`worksFor` from `career.ts`. Tests: the prompt contains "Generative AI Engineer", "Customer.io", "MCP", a note's text, and no "Agent OS"/"5-10x"; JSON-LD `jobTitle` is "Generative AI Engineer". Report the prompt's length before/after (chars) in the task note.
  - *Done 2026-10-16:* the system prompt went from **20,943 to 23,610 chars** (+2,667, +13%: the 16 notes, less the old 6-entry `experience.json`). `<experience>` = `career.jobs` (company, dates, roles, the tiles' title + detail, lines) + `career.music`, `**` stripped; `<career-notes>` = the notes as `- ` lines; Clear Speech says they are true details it may share. The served JSON-LD on `/` says `"jobTitle":"Generative AI Engineer","worksFor":{…"TimelyCare"}`. `experience.json` and the `Experience` type are deleted (the T6 carry-over). The "no Agent OS / 5-10x" check covers the summary and `<experience>`; `skills.json` still lists Agent OS until T10, which widens the check to the whole prompt. No chat was opened.
- [x] **T10: neighbours.** Hero h1, About ¶4, `skills.json` per Binding §6; update `skills-section.test.tsx`/`data-architecture.test.ts` if they pin the old lists.
- [x] **T11: the 3D resume's snapshot.** `node docs/design/jelly-resume/tools/snapshot.mjs --web ~/Desktop/dev/rezmancer-titles/out/Phill_Aelony_Resume_AI_Engineer.html public/resume` (it refuses to write if a phone or email survives). Expect one more line and one more checkpoint (the climbing order becomes 1998, 2018, 2021, 2022, 2023, 2025, 2026); update `jelly-platforms.test.ts` (line count, the checkpoint list), `jelly-play-run.test.ts`, `jelly-pickups.test.ts`, `jelly-helpers.test.ts`, `resume-page.test.tsx` to the observed values only after checking them on the page (coins should stay 27: the bullets didn't change). In the browser: the 3D resume shows the three titles with no missing glyphs; Play reaches the new checkpoint (its toast shows "Senior Software Engineer II").
  - *Done 2026-10-16:* 640 words (was 631), no phone or email (the tool's guard + a re-check). Observed on the page before touching the tests: **48 lines** (finish = line 47), **7 checkpoints** (2026 Generative AI Engineer · 2025 Senior Software Engineer II · 2023 Software Engineer · 2022 · 2021 · 2018 · 1998), **27 coins**; the TimelyCare block shows the three titles and dates with no missing glyphs; standing on line 14 in Play shows the toast "✓ CHECKPOINT 2025 Senior Software Engineer II" and the climb meter gains the 2025 and 2023 ticks. Also synced `resume.ts` with Rezmancer's earlier "to" for the two arrows (Rezmancer `bc910bc`: "30 items/month to 0", "FBX to GLB"), which the snapshot test caught; `projects.json` keeps Binding §5's "FBX→GLB".
- [x] **T12: docs + version.** `CLAUDE.md`: Key Files (`career.ts` as the career source and its grounding test; `components/experience/` and `HudButton`; `SiteMusic.open`; `RESUME_PDF`; remove `experience.json`); the `public/resume/` regenerate line keeps working. `package.json` 1.5.0 → **1.6.0**. All four gates green.
  - *Done 2026-10-16:* `CLAUDE.md` (career.ts + its grounding test, `components/experience/` + `HudButton`, `SiteMusic.open`, `RESUME_PDF`, Play's 48 lines / seven checkpoints; it never named `experience.json`); `package.json` + lock → 1.6.0. Gates: `npx tsc --noEmit` clean · `npm run lint` clean (0 warnings) · `npx jest --no-watchman` 58 suites / 635 tests passed (6.8 s) · `npm run build` OK (13 routes).
- [x] **T13: performance + a11y pass** (production build: `npm run build && npm run start`). Chrome trace, emulated phone (390×844, 4× CPU), scrolling the section top to bottom: record DrawFrame fps and the longest task; no task > 50 ms from this section; the tile count-ups and rail never cause layout per frame (no layout reads inside rAF). Keyboard: Tab through the tiles (Enter/Space toggle, Esc closes), Listen, both CTAs, visible focus everywhere; `prefers-reduced-motion` emulated: nothing moves, the rail is full, numbers final. Lighthouse accessibility on `/` ≥ the T0 baseline. Record the numbers here.
  - *Done 2026-10-16, production build (`npm run build && npm run start -- -p 3002`), fresh browser context, 390×844 @3x touch, 4× CPU, the section scrolled top to bottom (8 px per frame, ~9 s):* the first trace found three problems, all fixed in this task: (1) the rail head moved by `top` (a layout every frame; now a rail-tall layer moved by `translateY`); (2) on phones the count-up changed the number's width, so the label beside it re-wrapped and the tile's title/stack and everything below jumped (**CLS 1.79**; now the final value, invisible, sizes the number and the count-up sits on top of it out of flow); (3) `--p` written on the track restyled the whole section every frame (p90 296 elements, ~6 ms; now on the rail: p90 11 elements, 0.6 ms) and the first `toLocaleString` built ICU's formatter in a frame (24 ms; now a regex). **After:** 548 DrawFrames in 9.17 s = **59.8 fps** (headless Chrome is 60 Hz; the headful 120 Hz run before the fixes drew 118 fps); **longest task 7.4 ms** (a GC; none > 50 ms, none from the section); **CLS 0** (no layout shifts during the scroll); **0 layouts inside rAF** (the section never reads layout in a frame); style recalc total 215 ms (was 2,267). Not this section: `react-use-measure` (R3F) reads `getBoundingClientRect` in its scroll handler; it now costs < 1 ms since the section no longer dirties styles. **Keyboard** (1280×800): Tab goes tile 1–4 → Listen → Open the 3D resume → Download the PDF → Skills, each `:focus-visible` with a 2px outline (cyan; magenta on Listen), targets ≥ 54 px tall; Enter/Space toggle a tile, Esc closes it and focus stays. **Reduced motion** (emulated): `document.getAnimations()` running = none on the whole page, the rail fully drawn (`scaleY(1)`, no `data-live`), every node lit, numbers final (~5, ~750, ~68K, 6,700+), nothing armed or hidden. **Lighthouse 12.8 accessibility on `/`: 100** (mobile), same as the baseline (the live site, v1.5.0 = master: 100; T0 recorded none); its one zero-weight item is the hero photo's button on both. No console errors.
- [ ] **T14: PR text. STOP before pushing and ask Phill.**
  - *2026-10-16:* PR text written (below, before Per-task verification); Acceptance run on the production build, all ten pass (see T13's note and the PR's test plan). **Waiting on Phill's go** for `git push -u origin feat/experience-refresh` + `gh pr create --base master`. Write the PR title/body here (summary, the binding decisions, screenshots to take, measurements, test plan, the About ¶4 wording and the three-roles wording (lede, note 16, Wizard summary) to approve, `🤖 Generated with [Claude Code](https://claude.com/claude-code)` at the end). On Phill's go only: `git push -u origin feat/experience-refresh` + `gh pr create --base master`.

### T14: PR text (written 2026-10-16; waiting on Phill's go to push and open it)

**Title:** `feat: Experience refresh: the career section, the Wizard and the neighbours (v1.6.0)`

**Body:**

```markdown
## Summary
The home page's Experience section is rebuilt as mockup E2 (`docs/design/experience-refresh/round2/e2-hud.html`): Apple-clean with a light HUD. "Senior AI Engineer" headline, a rail that fills with the scroll and lights a node per stop, TimelyCare's three titles as a ladder of promotions, four glass HUD tiles (count-up, spotlight + tilt on fine pointers, tap pulse on touch, one sentence of detail each), one line per earlier job, music in magenta with **Listen** (opens the site's player), and HUD buttons to the 3D resume and the PDF.

One source of truth: `src/data/career.ts` takes titles, companies and dates from `resume.ts` (Rezmancer's AI Engineer variant) and adds the page's tiles and lines plus vetted notes for the Wizard. A grounding test fails if any number in it isn't in `resume.ts` or in its sourced `FACTS` list. The page, the Shroom Wizard's prompt and the JSON-LD all read it; `experience.json` is gone.

Also: Projects gains Quadzilla, Rezmancer and the Jelly Resume (the TimelyCare card goes; Number Slayers links numberslayers.com); the nav/`/resume`/3D-HUD PDF is Rezmancer's latest build behind one `RESUME_PDF`; the 3D resume is regenerated with the three titles (Play gains a checkpoint); hero h1, About ¶4, skills and the Wizard's summary lose the 2025 claims; `SiteMusic.open()`.

## Decisions (Phill's, from the design rounds)
- Titles: Software Engineer (Feb 2023) → Senior Software Engineer II (Apr 2025) → Generative AI Engineer (Apr 2026); headline "Senior AI Engineer"
- Care operations replaces the Growth tile; no hologram header, no pixel font, no square corner brackets, no `?play` hook, no stats readout
- Public repo: no school, customer or people names; no vendor but Customer.io; "replacement for", never "replaced"

## Please approve the wording
- About ¶4: "… and now I am a Generative AI Engineer at **TimelyCare**, building AI agents and whole platforms, and it is awesome and I do great work."
- The three-roles line (your mid-build ask): the lede "Today I own platforms end to end, as engineer, designer and product manager, and build AI into them."; the Wizard's summary "… as engineer, designer and product manager in one …"; and a Wizard note listing stakeholders, design + build, legal/compliance and HIPAA, providers' needs, and telling the company what changed

## Measurements (production build, 390×844 @3x, 4× CPU, scrolling the section top to bottom)
- 59.8 fps drawn (headless, 60 Hz), longest task 7.4 ms (none > 50 ms), CLS 0, no layout reads inside rAF
- The first trace caught a CLS of 1.79 (the count-up re-wrapped tile labels on phones), a rail head moved by `top`, and `--p` restyling the whole section every frame: all fixed (perf commit)
- Lighthouse accessibility on `/`: 100 (same as live v1.5.0)
- Wizard system prompt: 20,943 → 23,610 chars

## Test plan
- [x] `npx tsc --noEmit`, `npm run lint` (0 warnings), `npx jest --no-watchman` (58 suites, 635 tests), `npm run build`
- [x] 1280×800 next to the mockup: layout to the pixel, hover (tilt, spotlight, hologram number, notches), open/close, Esc, Listen, Open the 3D resume (opens, closes back to the same spot with focus on the button)
- [x] 375×812 touch: rows, tap pulse, full-width buttons, no horizontal scroll
- [x] Keyboard: tiles → Listen → both buttons, visible focus, Enter/Space/Esc
- [x] Reduced motion: no running animations on the page, rail drawn, numbers final; the 3D button lands on the plain `/resume`
- [x] The 3D resume shows the three titles; Play's toast "✓ CHECKPOINT 2025 Senior Software Engineer II"; it still dances to the site's player
- [x] JSON-LD `jobTitle` "Generative AI Engineer"; all PDF links → `/Phill_Aelony_Resume.pdf`; no console errors on `/` and `/resume`
- [ ] Screenshots for this PR: the section at 1280 (header, tiles, a tile hovered and opened, music + buttons) and at 375

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Per-task verification

Targeted Jest: `npx jest --no-watchman <path or pattern>`. Typecheck: `npx tsc --noEmit`. Lint: `npm run lint` (zero warnings). Full suite only in T0, T12, T13.

- **T0:** the four gates (`npx tsc --noEmit`, `npm run lint`, `npx jest --no-watchman`, `npm run build`) with their results pasted here; `git log -1` shows the docs commit.
- **T1:** `npx jest --no-watchman resume-page` green; `npx tsc --noEmit`.
- **T2:** `npx jest --no-watchman career-data` green; then break it once on purpose (add an unlisted number to a note) and see it fail, then revert.
- **T3:** `npx jest --no-watchman site-music music-integration music-fab music-player-panel` green (the new open test + the player's existing tests).
- **T4–T5:** their new test files green; `npx tsc --noEmit`; `npm run lint`.
- **T6:** `npx jest --no-watchman experience-section data-architecture structured-data` green; the dev server (`npm run dev`; if :3000 is taken by another project, `npm run dev -- -p 3002`): the section next to the mockup at 1280 and 375 wide, screenshots of both widths and of a tile hovered and opened; no console errors; `document.documentElement.scrollWidth === innerWidth` at 375.
- **T7:** `npx jest --no-watchman resume-download-button resume-page jelly-resume-canvas jelly-play-hud phase3-integration` green; `curl -sI localhost:<port>/Phill_Aelony_Resume.pdf` → 200 `application/pdf`; `rg "Resume_2025" src public` returns nothing.
- **T8:** `npx jest --no-watchman projects-section data-architecture` green; the Projects section in the browser at 1280 and 375 (placeholders render for Quadzilla and Rezmancer).
- **T9:** `npx jest --no-watchman wizard-prompt structured-data` green. No real Anthropic call: in the browser, stub `/api/wizard/chat` if you open the chat at all.
- **T10:** `npx jest --no-watchman hero-section about-section skills-section data-architecture structured-data` green; the hero and About in the browser.
- **T11:** `npx jest --no-watchman jelly resume-page` green; browser: open the 3D resume, read the TimelyCare block, Play to the new checkpoint (dev handle `__jelly.playDev.place(line, x)` is fine).
- **T12:** all four gates green, pasted.
- **T13:** the numbers recorded under the task.

## Acceptance

On a production build (`npm run build && npm run start`), in a fresh browser context:
1. `/` at 1280×800: the Experience section matches `round2/e2-hud.html` (headline neon, the rail fills and lights nodes on scroll, the ladder, four tiles with count-ups and the tech lines aligned, hover spotlight/tilt/notches/hologram number, open/close, earlier stops with neon dates, music with Listen, the two HUD buttons). No square corner brackets anywhere.
2. Same at 375×812 (touch emulation): tiles are rows, the tap pulse, buttons full width under 420px, no horizontal scroll.
3. Listen opens the site's music player; the player still works and the 3D resume still dances to it.
4. Open the 3D resume works from the Experience section (overlay opens, closes back to the page); with reduced motion it lands on the plain `/resume`.
5. The nav's Resume button, `/resume`'s PDF link and the 3D HUD's PDF link all download `Phill_Aelony_Resume.pdf` (three titles).
6. The 3D resume shows three TimelyCare titles; Play's checkpoints include Senior Software Engineer II.
7. The Wizard (stubbed `/api/wizard/chat`, or read `buildWizardSystemPrompt()` in a test/REPL) carries the new experience and notes; JSON-LD on `/` says "Generative AI Engineer".
8. Projects shows Quadzilla, Number Slayers, Rezmancer, Jelly Resume, Pong.
9. Reduced motion emulated: no animation runs (`document.getAnimations().filter(a => a.playState === 'running')` is empty after reveals settle).
10. No console errors on `/` and `/resume`. All four gates green.

## Stop conditions / open questions (for Phill)

- **T14:** stop before pushing; Phill approves the PR text, the About ¶4 wording and the three-roles wording (the lede, note 16, the Wizard summary).
- **Round 1 mockups held back (T0, not blocking):** `docs/design/experience-refresh/career.js` (read by round 1's `index.html`, `a-level-map.html`, `b-case-files.html`, `c-mission-control.html`, `d-patch-notes.html`, `copy.html`) carries handoff detail that Binding §4's confidentiality rule forbids in this public repo: two vendors other than Customer.io, the payment-platform bugs described as money over- and under-paid (with a count of unpaid sessions), "dormant", and the old site's two dollar figures. So T0 committed only round 2 + `shared.js`, and those files stay untracked on disk. Phill decides: commit them as they are, commit a scrubbed copy, or leave them out (round 2's "← round 1" link is then dead). `round2/highlights.js` is committed; its unused `stats` block still says "dormant" (rejected copy, not confidential).
- **Images:** Quadzilla and Rezmancer cards use the placeholder until Phill sends screenshots (not blocking).
- **Rezmancer link:** none while it's invite-only; Phill decides when rezmancer.com goes on the card.
- **If PR #18's resume changes before this merges** (e.g. Phill folds the new facts into his Rezmancer bullets), rebuild it (`pnpm resume:all` in that worktree) and redo T7 (PDF) and T11 (snapshot); `resume.ts` bullets must then mirror the new AI variant too.
- **Wording that waits on facts:** once the vendor contract is actually dropped, the resource tile can say "replaced"; once the Customer.io non-renewal is final, the marketing tile can say "replaced Customer.io". Don't change either without Phill.
- Not in this plan (Phill hasn't decided): a "251 PRs merged · 392 reviewed" line under the titles; role-credited quotes in the testimonials carousel; restyling the Projects cards to the HUD look.
