# Accessibility + SEO polish: plan

Branch: `chore/a11y-seo-polish` (already created off `master` after PR #37 merged). Version: `package.json` 1.1.0 → **1.2.0**. This plan ends with a pushed branch and an open PR.

## Context

PR #37 (perf + chat hardening) is merged and live. Phill asked for a cleanup PR to get the site "in tip top shape, optimized for accessibility and SEO where possible" before starting new feature work.

**Baseline (2026-10-08, live phillcodes.com, Lighthouse via chrome-devtools MCP):** Accessibility 100, Best Practices 100, SEO 100 on both mobile and desktop. **Lighthouse is therefore not the target.** The real gaps are things automated audits don't catch. Each was verified on the live DOM or in source:

| Gap | Evidence |
|---|---|
| No `<h1>` on the page | Heading outline starts at `H2: About`. `AnimatedHeadline` (which has an h1) isn't rendered; the hero uses only `AnimatedTagline`. |
| Testimonials are invisible to screen readers and crawlers | `Testimonials3DCarousel` draws each quote onto a canvas texture (`renderTestimonialCanvas`). No quote text exists in the DOM. |
| Testimonials fullscreen modal isn't a real dialog | No `role="dialog"`/`aria-modal`, no focus trap, focus doesn't move in on open or return on close. |
| Mushroom offer bubble isn't a real dialog | `MushroomOfferBubble` has no role, no initial focus, no trap. **Escape bug:** while the centered ceremony is open, Escape reaches `ShroomMode`'s window listener and dismisses the whole wizard. `WizardChat` deliberately ignores Escape while an offer is pending, so nothing stops it. Expected: Escape = decline. |
| WizardChat has focus-in/restore but no Tab trap | `aria-modal="true"` is set, yet Tab can leave the panel. |
| Focus-trap logic is copy-pasted | `MobileMenu.tsx:27-64` and `MusicPlayerPanel.tsx:81-120` each hand-roll the same Tab cycling. |
| No skip link, no `<footer>` landmark | First tab stop is the nav logo. |
| No `robots.txt`, no `sitemap.xml` | Both 404 on prod. |
| No canonical URL, no structured data | No `link[rel=canonical]`, zero `application/ld+json` scripts. |
| Web manifest is empty and unlinked | `public/site.webmanifest` has `name: ""`, white theme/background on a dark site, and no `<link rel=manifest>`; `/manifest.webmanifest` 404s. No `theme-color` meta. |
| OG image is the wrong shape for `summary_large_image` | `public/images/og-image.jpg` is 2150×2150 at 600 KB, but metadata claims 1200×1200. Large-card previews want 1.91:1 (1200×630), so X, LinkedIn and Slack crop it. |
| Framer Motion animations don't all honor reduced motion | Only `AnimatedSection`, `SkillChip`, `GlitchText`, `TypingText` and `Testimonials3DCarousel` call `useReducedMotion`; everything else animates regardless. |
| Below-the-fold image marked `priority` | `AboutSection.tsx:171` preloads an image that isn't in the first viewport and competes with the hero LCP image. |
| Dead code | `EducationSection.tsx` is imported only by its own test (`education-section.test.tsx`); education renders through `EducationCard` inside Experience. |

### Decisions already made (don't re-litigate)

- **No visible copy or design changes.** Titles, taglines, descriptions and layout stay as they are. Where a fix needs text that isn't on screen today (h1, skip link, testimonial list), it's visually hidden (`sr-only`), except the skip link, which becomes visible on focus. Rationale: Phill is planning a separate content refresh (resume-aligned titles, "AI Engineer" positioning), and copy belongs to that arc, not this one.
- **Structured data reads existing data files.** JSON-LD job title and employer come from `src/data/experience.json[0]`, and social links from the same URLs `SocialLinks.tsx` uses. Nothing is hard-coded, so the content refresh updates SEO automatically.
- **One shared `useFocusTrap` hook** instead of a dependency like `focus-trap-react`. The repo already has two working hand-rolled traps, so extracting them is less code and no new runtime dependency.
- **`jest-axe` for regression tests** (dev dependency only). jsdom can't compute color contrast, so axe in Jest covers roles, names and ARIA validity, and Lighthouse on the prod build covers contrast.
- **OG image via Next's file convention** (`src/app/opengraph-image.tsx` with `ImageResponse`, statically generated at build). It's composed from existing assets so it can't drift from the brand. Rejected: hand-cropping a JPG, which needs a design tool and goes stale.
- **Manifest via `src/app/manifest.ts`**, replacing `public/site.webmanifest`.
- Real-device testing is Phill's job (an agent can't hold a phone). The loop produces the checklist; Phill runs it on the PR.

## Binding: do not redesign

- **Escape layering, innermost wins:** offer bubble → WizardChat → ShroomMode (dismiss wizard / exit shroom mode). Each layer that handles Escape does so in a **capture-phase window listener** and calls `stopPropagation()`, the same pattern `WizardChat` already uses. The offer bubble's Escape calls its `onCancel` (centered ceremony: the decline line is injected exactly as clicking "No" does today).
- **`useFocusTrap` contract** (`src/hooks/useFocusTrap.ts`):
  ```ts
  useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean, options?: {
    initialFocusRef?: RefObject<HTMLElement | null> // default: first focusable in container
    returnFocus?: boolean                           // default true: restore document.activeElement captured at activation
  }): void
  ```
  It handles Tab and Shift+Tab cycling only. **It does not handle Escape** (Escape stays with each component because of the layering above). Focusable selector: `a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])`. Elements inside the container are re-queried on every Tab press because content changes (chat messages, loading states). `readOnly` textareas stay focusable.
- **Dialog semantics:**
  - Testimonials modal: `role="dialog" aria-modal="true" aria-label="Testimonials"`. Focus goes to the close button on open and returns to the preview button on close.
  - Centered offer bubble: `role="alertdialog" aria-modal="true"`, with `aria-labelledby` set to the question text and focus on the **confirm** button on open.
  - Anchored bubble (the legacy fallback in `ShroomWizard3D`): `role="dialog"`, with the same focus behavior but non-modal.
- **h1 text:** `Phill Aelony, Software Engineer`, `sr-only`, as the first element inside the hero `<section>`.
- **Skip link:** `<a href="#main">Skip to main content</a>` as the first focusable element in `<body>`. It's `sr-only` until focused, then visible in the top-left with the existing focus ring styles. `<main id="main" tabIndex={-1}>` in `page.tsx`.
- **Testimonials for screen readers and crawlers:** an `sr-only` `<ul>` rendered **outside the canvas and outside the modal** (always in the DOM, including before `LazyMount` mounts the carousel). Each item is `<li><blockquote>{quote}</blockquote> — {name}, {role/company as available in testimonials.ts}</li>`. The modal's existing sr-only description stays.
- **JSON-LD:** a single `<script type="application/ld+json">` with `@graph: [WebSite, Person]`.
  - Person: `name`, `url`, `image`, `jobTitle`, `worksFor{@type: Organization, name}`, `sameAs[GitHub, LinkedIn]`, `knowsAbout` (the technical skill names from `skills.json`).
  - Serialize with `JSON.stringify(data).replace(/</g, '\\u003c')`, as the Next.js JSON-LD guide shows.
- **Metadata:**
  - `alternates.canonical: '/'`
  - `viewport.themeColor` = the site background color (read the `--background` token in `globals.css`; don't invent a color)
  - Manifest: `name: 'Phill Aelony | Phil Codes'`, `short_name: 'Phil Codes'`, same theme/background color, existing android-chrome icons
  - `robots.ts`: allow all, disallow `/api/`, point at the sitemap
  - `sitemap.ts`: the single `/` URL with `lastModified` and `changeFrequency: 'monthly'`
  - The title and description strings stay byte-for-byte unchanged.
- **OG image:** 1200×630 on the site's dark background, with the hero art (`public/images/hero-image-phill-llamas.png`) on one side and "Phill Aelony" plus the existing tagline in Audiowide on the other, using the neon colors from `tailwind.config.ts`. Export `alt` and keep the existing alt text. The same file convention serves the twitter image (`twitter-image.tsx` re-exports it). Remove the explicit `images` arrays from `openGraph`/`twitter` metadata so the file convention owns them. Delete `public/images/og-image.jpg` once nothing references it.

## Tasks

Do them in order. One task ≈ one commit. T1 must come first; T2 must come before T3–T5.

- [x] **T1: Setup.** Bump `package.json` to 1.2.0. Add the dev dependencies `jest-axe` and `@types/jest-axe`, and register `toHaveNoViolations` in `jest.setup.ts`. Commit: `chore: bump to 1.2.0, add jest-axe`.
- [x] **T2: `useFocusTrap` hook.** Implement it per the contract, with tests in `src/__tests__/use-focus-trap.test.tsx`:
  - Tab wraps from last to first and Shift+Tab from first to last.
  - It focuses `initialFocusRef` or the first focusable element on activation.
  - It restores focus on deactivation.
  - It's inactive when `active=false`.
  - It picks up elements added after activation.

  Refactor `MobileMenu` and `MusicPlayerPanel` to use it. Their Escape handling stays where it is, and their existing tests must pass unchanged.
- [x] **T3: WizardChat focus trap.** Apply `useFocusTrap` to the chat panel. Its existing focus-on-open and restore-on-close behavior can move into the hook if behavior is identical; otherwise keep it and set `returnFocus: false`. Add a test that Tab from the last focusable wraps to the first, and keep the existing Escape and focus tests green.
- [x] **T4: Offer bubble dialog + Escape fix.** Make `MushroomOfferBubble` a dialog per the contract:
  - Add a trap and initial focus on confirm.
  - Add a capture-phase Escape listener that calls `onCancel` and stops propagation.

  Tests:
  - Escape while the centered bubble is open calls `onCancel` and does **not** dismiss the wizard. Write it at the `ShroomMode` level if feasible; otherwise test that the bubble stops propagation.
  - Focus lands on confirm.
  - axe reports no violations with the bubble open.
- [x] **T5: Testimonials modal dialog + readable testimonials.**
  - Give the modal dialog semantics, a trap and focus in/out per the contract.
  - Add the always-present `sr-only` testimonial list. It probably belongs in `AboutSection` next to the `LazyMount`, so it exists before the carousel loads.

  Tests:
  - The list renders every testimonial from `testimonials.ts` before the carousel mounts.
  - The modal has `role="dialog"` and focus moves to the close button.
  - axe reports no violations with the modal open (the Canvas is already mocked in the existing tests; follow that pattern).
- [x] **T6: Landmarks and headings.**
  - Add the `sr-only` h1 in the hero, the skip link and `main#main`.
  - Wrap `ContactSection`'s social links / bottom area in a `<footer>` if it's the natural page end; otherwise add a minimal `<footer>` landmark after `</main>` holding the existing social links (move them, don't duplicate them).
  - Give each section `aria-labelledby` pointing at its h2 id.

  Tests:
  - Exactly one h1.
  - The skip link is the first focusable element and targets `#main`.
  - Every `<section>` with an h2 is labelled by it.
- [x] **T7: Reduced motion everywhere.**
  - Add a client `MotionProvider` (`src/components/MotionProvider.tsx`) wrapping the layout tree with `<MotionConfig reducedMotion="user">`.
  - Check `globals.css`'s `prefers-reduced-motion` block covers the remaining CSS keyframe effects (glitch, neon pulse, glow, scanlines, screen shake); add any that are missing.
  - Components that already call `useReducedMotion` keep doing so.
  - Test: render something under the provider with `matchMedia('(prefers-reduced-motion: reduce)')` mocked true and assert the provider is present. Keep it light; this is mostly a browser check (see Verification).
- [x] **T8: SEO metadata files.**
  - Add `src/app/robots.ts`, `src/app/sitemap.ts` and `src/app/manifest.ts`, plus `alternates.canonical` and `viewport.themeColor` in `layout.tsx`, all per the contract.
  - Delete `public/site.webmanifest`.
  - Test: unit-test that the `robots()`, `sitemap()` and `manifest()` return values match the contract.
- [ ] **T9: JSON-LD.**
  - Add `src/lib/structured-data.ts`, which builds the `@graph` from the data files. Render it from `src/app/page.tsx` (or the layout) as a server component.
  - Extract the GitHub/LinkedIn URLs into `src/data/socials.ts` and have `SocialLinks.tsx` and the JSON-LD both read them, so they can't drift.
  - Tests: the graph contains Person with `jobTitle === experience[0].title`, `sameAs` equals the socials, and the output contains no raw `<`.
- [ ] **T10: OG/Twitter image.**
  - Add `src/app/opengraph-image.tsx` and `twitter-image.tsx` per the contract (load the font and hero art with `readFile` from `public/`/`node_modules` as the Next `ImageResponse` docs show; check current docs via context7 first).
  - Remove the explicit `images` arrays from the metadata, delete `public/images/og-image.jpg`, and grep that nothing references it.
  - Verify the rendered PNG visually (see Verification).
- [ ] **T11: Small cleanups.**
  - Remove `priority` from the `AboutSection` image.
  - Delete `EducationSection.tsx` and `education-section.test.tsx`; grep first to confirm nothing else imports it.
  - If `AnimatedHeadline`'s default export is unused (only `AnimatedTagline` is imported), delete the default export and its now-unused code, keeping `AnimatedTagline`. Update `hero-section.test.tsx` if it mocks the removed export.
- [ ] **T12: Page-level axe regression test.** Add `src/__tests__/a11y.test.tsx`, which renders the full `HomePage` (reuse the mocks from `integration.test.tsx`) and asserts `toHaveNoViolations()`. Disable only the `color-contrast` rule, since jsdom can't compute it, and leave a comment saying so.
- [ ] **T13: Browser sweep on the prod build.**
  - Build and serve on port 3002 (see Ground rules).
  - Keyboard-only walkthrough with chrome-devtools MCP: skip link → nav → each section → carousel preview (open, Tab, Escape) → music FAB panel → summon wizard → chat (stubbed, see Ground rules) → offer bubble (Escape declines, wizard stays).
  - Take an accessibility-tree snapshot of the page and of each dialog open. Confirm visible focus on every stop.
  - Emulate `prefers-reduced-motion: reduce` and confirm nothing large moves: Vortex is off, glitch/typing are static, and section reveals are instant or opacity-only.
  - Fix small issues found here. One task's worth or less goes in this commit; anything bigger goes in Stop conditions.
  - Record the results in the **Results** section below.
- [ ] **T14: Lighthouse, PR and the device checklist.**
  - Run Lighthouse (mobile and desktop) on the prod build at `http://localhost:3002`. All categories must stay at 100; record the scores in Results.
  - Verify the SEO files with curl (see Acceptance).
  - Run all gates.
  - Push the branch and open a PR titled `chore: accessibility + SEO polish (v1.2.0)`. The body should cover:
    - a summary per area
    - the before/after table (gap → fix)
    - Lighthouse scores
    - the OG image preview, as a link to the preview deploy's `/opengraph-image` route
    - the **Real-device checklist for Phill** (below)

## Verification (per task)

All Jest runs: `npx jest --ci --no-watchman <test paths>`. Every task also runs `npx tsc --noEmit` and `npm run lint` (zero warnings).

| Task | Proof |
|---|---|
| T1 | `npx jest --ci --no-watchman src/__tests__/music-fab.test.tsx` still passes (smoke test that the setup change didn't break Jest); `grep '"version": "1.2.0"' package.json` |
| T2 | `use-focus-trap.test.tsx`, `navigation.test.tsx`, `navigation-extended.test.tsx`, `music-player-panel.test.tsx` |
| T3 | `src/__tests__/WizardChat.test.tsx` |
| T4 | `src/__tests__/MushroomOfferBubble.test.tsx` and `src/__tests__/ShroomMode.test.tsx` |
| T5 | `src/__tests__/about-section.test.tsx` plus any testimonials test |
| T6 | the hero, about, contact and integration tests plus the new landmark tests |
| T7 | the new test, then the browser check in T13 |
| T8 | the new tests; after `npm run build`, the build output lists `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest` as static routes |
| T9 | the new tests; after the build, `curl -s localhost:3002 \| grep -c 'application/ld+json'` → 1 |
| T10 | after the build, `curl -s -o .next/og.png -w '%{http_code} %{content_type}' localhost:3002/opengraph-image` → `200 image/png`; `sips -g pixelWidth -g pixelHeight .next/og.png` → 1200×630; then **Read the PNG and look at it**. Text must be legible and the art must not be cropped through the face. |
| T11 | `grep -rn "EducationSection\|og-image" src` is empty; the full suite passes |
| T12 | `npx jest --ci --no-watchman src/__tests__/a11y.test.tsx` |
| T13 | Results section filled in with the snapshot findings |
| T14 | Lighthouse scores recorded; the PR URL is in Results |

## Acceptance

After every box is ticked:

1. Run all gates and see them pass: `npx tsc --noEmit && npm run lint && npx jest --ci --no-watchman && npm run build`, then `git checkout next-env.d.ts`.
2. Run `npx next start -p 3002` and check:
   - `curl -s localhost:3002/robots.txt` contains `Disallow: /api/` and `Sitemap: https://www.phillcodes.com/sitemap.xml`.
   - `curl -s localhost:3002/sitemap.xml` contains `<loc>https://www.phillcodes.com</loc>` (with or without the trailing slash).
   - `curl -s localhost:3002/manifest.webmanifest` has a non-empty `name`.
   - The page head has `rel="canonical"`, `name="theme-color"`, `rel="manifest"` and `og:image` pointing at `/opengraph-image…`, with `og:image:width` 1200.
3. Live-DOM check, via chrome-devtools `evaluate_script` on `localhost:3002`:
   - exactly one h1
   - the skip link is the first tab stop
   - one ld+json script that parses as JSON
   - the testimonial quotes are present as text
4. Lighthouse mobile + desktop: A11y, Best Practices and SEO are all 100.
5. The PR is open and Vercel checks are green. Report the PR URL and say **LOOP COMPLETE**.

### Real-device checklist for Phill (goes in the PR body)

- [ ] **iPhone Safari:** VoiceOver swipe through the page. The h1 is announced first and the testimonials are read as quotes.
- [ ] **iPhone:** the summon wizard → chat → offer flow works with the on-screen keyboard (input stays visible; `interactiveWidget: resizes-content`).
- [ ] **Turn on Reduce Motion** (iOS Settings → Accessibility → Motion) and reload: nothing large moves.
- [ ] **Shroom mode on a phone:** smooth, no flashing.
- [ ] **Paste the preview URL into Slack/iMessage/LinkedIn's post inspector:** the 1200×630 card renders.
- [ ] **Android Chrome, if available:** "Add to Home screen" shows "Phil Codes" with the right icon and a dark splash.

## Stop conditions / open questions

The executor stops and writes a note here rather than guessing when:

- A fix would need **visible copy or layout changes** (e.g. a contrast failure on a neon color that needs a palette change). Record the element, measured ratio and suggested token; Phill decides.
- The **OG image** can't be composed legibly from the existing assets. Describe what's wrong and propose two options.
- A **footer landmark** would require restructuring `ContactSection` visually.
- Anything requires a real Anthropic call, a Vercel env change, or touching `src/app/api/**` beyond reading it.

Notes from the executor:

- T4: the chat's capture listener is registered before the offer bubble's, so in the fallback flow (chat open + anchored bubble) Escape closed both. `WizardChat` now takes `offerOpen` from ShroomMode and leaves Escape to the bubble.
- T6: the footer landmark holds the copyright line (moved out of `ContactSection` into `SiteFooter`), not the LinkedIn/GitHub links. Moving those would restructure the Contact section visually. Padding is split (`pt-*` on the section, `pb-*` on the footer) so the page looks the same. Hero keeps `aria-label="Hero section"` since it has no h2.
- For T13: `GlitchText` gives every section heading `tabIndex={0}`, so each h2 is a tab stop. Check whether that's noisy in the keyboard walkthrough.

## Results

_(filled in by T13/T14)_
