# Tech Stack

## Framework & Runtime

- **Application Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Runtime:** Node.js
- **Package Manager:** npm or pnpm

## Frontend

- **UI Library:** React 18+
- **CSS Framework:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Animation Library:** Framer Motion
- **3D Graphics:** Three.js (with React Three Fiber for React integration)
- **Audio:** Web Audio API (for visualizations)

## Styling Approach

- **Primary:** Tailwind CSS utility classes
- **Component Variants:** shadcn/ui with Tailwind
- **Animations:** Framer Motion for complex animations, Tailwind for simple transitions
- **Theme:** Custom cyberpunk design tokens (neon colors, dark backgrounds, glow effects)

## Testing & Quality

- **Linting:** ESLint with Next.js recommended config
- **Formatting:** Prettier
- **Type Checking:** TypeScript strict mode
- **Accessibility Testing:** axe-core, manual screen reader testing
- **Performance Testing:** Lighthouse CI

## Deployment & Infrastructure

- **Hosting:** Vercel
- **CI/CD:** Vercel Git Integration (automatic deployments on push)
- **Domain:** Custom domain via Vercel

## Asset Management

- **Images:** Next.js Image component with automatic optimization
- **Fonts:** Next.js Font optimization (likely custom cyberpunk-style fonts)
- **Audio Files:** Static hosting via Vercel, lazy loaded
- **3D Models:** GLB/GLTF format, lazy loaded

## Future Integrations

- **AI Chatbot:** OpenAI API or Anthropic Claude API
- **Analytics:** Vercel Analytics or Plausible (privacy-focused)
- **Contact Form:** Formspree, Resend, or similar serverless form handler

## Development Tools

- **IDE:** VS Code with TypeScript, Tailwind, and ESLint extensions
- **Version Control:** Git with GitHub
- **Local Development:** `next dev` with hot reload

## Browser Support

- **Target:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- **Mobile:** iOS Safari, Chrome for Android
- **Accessibility:** Full keyboard navigation, screen reader support

## Performance Targets

- **Lighthouse Performance:** 90+
- **Lighthouse Accessibility:** 100
- **Lighthouse Best Practices:** 90+
- **Lighthouse SEO:** 100
- **Core Web Vitals:** All metrics in "Good" range
