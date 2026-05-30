# CLAUDE.md — Next.js + TypeScript

## Response Style (Always)

- Use 3-6 word sentences.
- No filler or preamble.
- No pleasantries.
- Drop articles. ("Me fix code.")
- Run tools first. Show result. Stop.
- No narration around tools.

---

## Stack

- Next.js 15 App Router.
- TypeScript strict mode.
- React 19 Server Components.
- Tailwind CSS v4.
- shadcn/ui components.
- Zod for validation.
- Drizzle ORM + Postgres.
- NextAuth v5 for auth.
- Vitest + Playwright tests.
- Biome for lint/format.

---

## Project Structure

```
src/
  app/                  # Routes only
    (marketing)/
    (app)/
    api/
    layout.tsx
    page.tsx
  components/
    ui/                 # shadcn primitives
    features/           # Domain components
  lib/
    db/                 # Drizzle schema, client
    auth/               # NextAuth config
    utils.ts
  server/
    actions/            # Server actions
    queries/            # Data fetchers
  hooks/
  types/
  styles/
tests/
  unit/
  e2e/
```

---

## TypeScript Rules

- Strict mode always on.
- No `any`. Use `unknown`.
- Prefer `type` over `interface`.
- Infer types where possible.
- Zod schemas for boundaries.
- Discriminated unions for state.
- `satisfies` over type assertions.
- No non-null assertions (`!`).

---

## Next.js Best Practices

- Server Components by default.
- `"use client"` only when needed.
- Fetch data in Server Components.
- Server Actions for mutations.
- `loading.tsx` for suspense.
- `error.tsx` for boundaries.
- Metadata API for SEO.
- `next/image` for all images.
- `next/font` for fonts.
- Route handlers in `app/api/`.
- Parallel routes for layouts.
- Streaming with Suspense.

---

## Component Rules

- Server first, client last.
- One component per file.
- Co-locate types and component.
- Props typed explicitly.
- No prop drilling beyond two levels.
- Composition over configuration.
- Forward refs when needed.
- Memo only when measured.

---

## Data Layer

- Drizzle schema in `lib/db/schema.ts`.
- Queries in `server/queries/`.
- Mutations in `server/actions/`.
- Validate input with Zod.
- Cache with `unstable_cache`.
- Revalidate with tags.
- No raw SQL in components.
- Connection pooling required.

---

## Forms

- React Hook Form + Zod.
- Server Actions for submit.
- `useActionState` for state.
- `useFormStatus` for pending.
- Optimistic with `useOptimistic`.
- Progressive enhancement always.

---

## Styling

- Tailwind utility-first.
- `cn()` helper for merging.
- CSS variables for themes.
- Dark mode via `next-themes`.
- No inline styles.
- Design tokens in config.

---

## Performance

- Lighthouse 95+ target.
- LCP under 2.5s.
- Images: WebP/AVIF.
- Fonts: preload, swap.
- Bundle analyze on PR.
- Dynamic imports for heavy code.
- Edge runtime where safe.
- ISR over SSR when possible.

---

## Security

- Validate all inputs.
- Sanitize all outputs.
- CSRF via Server Actions.
- Rate limit API routes.
- Env vars typed via Zod.
- Secrets never in client.
- CSP headers configured.
- Auth checks server-side.

---

## Testing

- Vitest for units.
- Playwright for e2e.
- Test behavior, not implementation.
- Mock at network boundary (MSW).
- Coverage gate at 70%.
- Snapshot tests sparingly.

---

## Commits & Workflow

- Conventional commits.
- Small, atomic PRs.
- Branch: `feat/`, `fix/`, `chore/`.
- Pre-commit: lint, typecheck, test.
- CI must pass before merge.

---

## Forbidden

- `any` types.
- `getServerSideProps`. Use App Router.
- `useEffect` for data fetching.
- Default exports for components.
- Client-side secrets.
- Untyped env access.
- Inline event-handler-only logic.

---

## Quick Commands

```bash
pnpm dev          # Start dev
pnpm build        # Production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # Biome check
pnpm test         # Vitest
pnpm test:e2e     # Playwright
pnpm db:push      # Drizzle push
pnpm db:studio    # Drizzle studio
```

---

## Aucto Project Specifics

### Design
- North star: Nike.com (primary); adidas / Under Armour / Gymshark secondary.
- Bangladesh market: clean, uncluttered, mobile-first, low cognitive load.
- Generous whitespace. Few items per row. One clear CTA per screen.
- Palette (tokens, light + dark): near-black #111111 text, white #FFFFFF, navy #1B2A4D primary; no orange.
- Type: Inter body; bold tight-tracked display headings. Editorial, modern.

### 3D
- React Three Fiber + drei for ONE tasteful moment (e.g., hero).
- Always lazy-loaded (dynamic import, ssr: false). Always a graceful fallback (no-WebGL / slow device).
- Never block first paint. Cut if it hurts mobile performance.

### Payments
- Provider abstraction. Pluggable. Fake adapter for tests.
- Card first (sandbox). bKash + Nagad are deferred drop-in adapters (added when merchant accounts exist) behind the same interface.
- Checkout shows only working methods. No dead payment buttons.
- Sandbox/test only until real credentials exist. Never commit payment secrets; keys via env.

### Email
- Transactional email (order confirmation) via a pluggable email adapter. Fake adapter in tests. Real key later, via env. Never commit keys.

### Images
- Boilerplate placeholders until real product photos. Structure for trivial real-asset swap.

### Inventory / DB
- Real hosted Postgres (Neon recommended). Proper migrations for production.
- Variant-level stock (size/color). Decrement on order. Out-of-stock states handled.

### Build workflow
- Given a phase Execution Pack: implement scope, double-test, report per the report contract, STOP.
- Do NOT commit or push. Git is handled outside Claude Code.
- Never edit/delete tests to force green. Never suppress type errors with `any` or ignore-comments. Genuinely-wrong tests go in Open Questions, unchanged.
