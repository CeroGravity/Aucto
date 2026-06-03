# CLAUDE.md — Next.js + TypeScript

## Response Style (Always Strict - Exception Report & Manual Checklist)

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
- Biome for lint/format.# AUCTO — Phase 5a: Checkout, Orders, Payment Abstraction (fake adapter)

## Context
Phases 0–4 + brand done. Cart is server-authoritative + merge-ready; auth works. This phase builds checkout, the order model, stock decrement, and a payment ABSTRACTION with a deterministic fake adapter — no real payment provider, no external calls. 5b will add the real card sandbox behind the same interface. Also: smooth the theme transition. CLAUDE.md frozen, authoritative. Palette navy. No fragile/external steps.

## Goal
A guest or logged-in user can check out, "pay" via the fake adapter, get an order with stock decremented and cart cleared, and see a confirmation — all tested end to end.

## Scope — do exactly this

### A. Theme transition (quick carry-over)
- Add a subtle ~250ms color transition (background, te# AUCTO — Phase 5a: Checkout, Orders, Payment Abstraction (fake adapter)

## Context
Phases 0–4 + brand done. Cart is server-authoritative + merge-ready; auth works. This phase builds checkout, the order model, stock decrement, and a payment ABSTRACTION with a deterministic fake adapter — no real payment provider, no external calls. 5b will add the real card sandbox behind the same interface. Also: smooth the theme transition. CLAUDE.md frozen, authoritative. Palette navy. No fragile/external steps.

## Goal
A guest or logged-in user can check out, "pay" via the fake adapter, get an order with stock decremented and cart cleared, and see a confirmation — all tested end to end.

## Scope — do exactly this

### A. Theme transition (quick carry-over)
- Add a subtle ~250ms color transition (background, text, border) on theme toggle. It must NOT flash or animate on initial page load / first paint (suppress until mounted, or equivalent). Keep it tasteful.

### B. Order model (schema)
- `orders` (id, userId nullable [guest allowed], status enum: pending|paid|failed|cancelled, subtotalMinor, shippingMinor, totalMinor, shipping fields [fullName, phone, address, area/thana, city/district, postcode nullable], paymentRef nullable, createdAt) and `order_items` (id, orderId FK, variantId FK, quantity, unitPriceMinor — price SNAPSHOT at order time). Relations for one-query order load.
- `pnpm db:push` then AGAIN (drift-guard → "No changes detected"). Direct/unpooled endpoint for DDL.

### C. Payment abstraction (the keystone — define BEFORE any provider)
- `lib/payments/`: a `PaymentProvider` interface (e.g. `createPayment(order) → {ref, status}`, `getStatus(ref)`), and a `FakePaymentProvider` that resolves success/failure DETERMINISTICALLY (e.g. a test flag or amount-based rule) with no network. Checkout depends only on the interface. Document that 5b adds the real card adapter here.

### D. Checkout flow (`(app)/checkout/page.tsx`, replace placeholder)
- Guest checkout allowed (do not gate). Logged-in users' info prefilled where available.
- Shipping form (RHF + Zod, BD fields: full name, phone, address, area/thana, city/district, postcode optional). Order summary from the SERVER-AUTHORITATIVE DB cart (items, subtotal, flat shipping constant, total in ৳).
- Place-order action `server/actions/order.ts` in a DB TRANSACTION: re-validate stock for every line → decrement variant stock → create order + order_items (snapshot prices) → run the payment provider (fake) → on success set status 'paid' + clear the cart; on failure roll back (no decrement, no order, or mark 'failed') and surface an error. Atomic — no oversell.
- Order uses the authoritative DB cart, never optimistic client state.

### E. Confirmation
- `(app)/order/[id]` (or `/checkout/success`): shows the order — items, totals, shipping, status. One-query order load. Cart is empty afterward.
- Email is DEFERRED to 5b (note it; do not build email here).

## Files (create / modify)
- `src/lib/db/schema.ts` (+relations), `src/lib/payments/` (interface + fake), `src/server/actions/order.ts`, `src/server/queries/order.ts`
- `src/app/(app)/checkout/page.tsx`, `src/app/(app)/order/[id]/page.tsx`, `src/components/features/checkout-form.tsx`
- theme transition: `globals.css` / `theme-provider` (minimal)
- `tests/e2e/checkout.spec.ts`

## Constraints
- Follow CLAUDE.md. Server Components for reads; `"use client"` only for the checkout form. Mutations via Server Actions, Zod-validated. One query for cart + order loads. Money integer poisha → ৳.
- Payment via the abstraction + FAKE adapter only — NO real provider, NO external/network calls this phase.
- Order placement is a single atomic transaction (stock re-check + decrement + order + cart clear). No oversell.
- Guest checkout works. Tokens only (navy). No dead controls.
- Do not commit or push.

## Double-test (required before you report)
1. Round 1 — `pnpm db:push` (twice — drift-guard), `pnpm build`, `tsc --noEmit`, `biome check`, `pnpm test:e2e` (incl. existing suite). Fix every failure.
2. Round 2 — re-run all green. Functional (real Brave clicks; `goto` for nav):
   - Add to cart → checkout → fill shipping → place order (fake success) → confirmation shows the order; cart is now empty; the variant's stock decremented by the ordered qty.
   - Fake FAILURE path → no order created (or marked failed), stock NOT decremented, cart intact, error shown.
   - Guest (logged out) can complete checkout.
   - Theme toggle transitions smoothly; no flash on initial load.
   - Existing auth/cart/catalog/brand e2e still green.

## Report back (then STOP — do not commit or push)
Exactly these sections; missing section or unproven "green" = incomplete.
1. Scope checklist (A–E). 2. Files changed (`git status --short` + `git diff --stat`; CLAUDE.md untouched). 3. Round 1 evidence (paste both db:push, build/tsc/biome/e2e + fixes). 4. Round 2 evidence (paste output, e2e count, functional incl. stock-decrement numbers before/after + the failure path + drift-guard). 5. Acceptance map (paste the one-query order load + show the transaction is atomic). 6. Forbidden-pattern attestation + `"use client"` files. 7. Secrets/env. 8. Deviations. 9. Open questions / blockers. 10. Footer: `Did not commit. Did not push.`
— Then append the **"CHECK ON THE SITE"** block below.

Anti-gaming: no editing/deleting tests to pass; no suppressing type errors; no stubbing beyond the explicitly-scoped fake payment adapter. Wrong tests → section 9.

## CHECK ON THE SITE (Claude Code: include with the report)
Run `pnpm dev`, then:
- Add items, go to Checkout, fill the shipping form, place the order — you should land on a confirmation page, the cart should be empty, and the product's stock should drop.
- Toggle dark/light — the color change should fade smoothly, with no flash when the page first loads.

## Acceptance criteria
- Checkout works for guest + logged-in; order created with snapshot prices; stock decremented atomically (no oversell); cart cleared on success.
- Fake payment success and failure paths both behave correctly (failure = no decrement, cart intact).
- Order confirmation page renders the order (one-query load).
- Payment abstraction + fake adapter in place; checkout depends only on the interface (5b-ready). Email deferred to 5b.
- Theme transition smooth, no load flash.
- Drift-guard "No changes detected"; checkout/order e2e green; existing e2e green; build/tsc/biome clean. Nothing committed.xt, border) on theme toggle. It must NOT flash or animate on initial page load / fi# AUCTO — Phase 5a: Checkout, Orders, Payment Abstraction (fake adapter)

## Context
Phases 0–4 + brand done. Cart is server-authoritative + merge-ready; auth works. This phase builds checkout, the order model, stock decrement, and a payment ABSTRACTION with a deterministic fake adapter — no real payment provider, no external calls. 5b will add the real card sandbox behind the same interface. Also: smooth the theme transition. CLAUDE.md frozen, authoritative. Palette navy. No fragile/external steps.

## Goal
A guest or logged-in user can check out, "pay" via the fake adapter, get an order with stock decremented and cart cleared, and see a confirmation — all tested end to end.

## Scope — do exactly this

### A. Theme transition (quick carry-over)
- Add a subtle ~250ms color transition (background, text, border) on theme toggle. It must NOT flash or animate on initial page load / first paint (suppress until mounted, or equivalent). Keep it tasteful.

### B. Order model (schema)
- `orders` (id, userId nullable [guest allowed], status enum: pending|paid|failed|cancelled, subtotalMinor, shippingMinor, totalMinor, shipping fields [fullName, phone, address, area/thana, city/district, postcode nullable], paymentRef nullable, createdAt) and `order_items` (id, orderId FK, variantId FK, quantity, unitPriceMinor — price SNAPSHOT at order time). Relations for one-query order load.
- `pnpm db:push` then AGAIN (drift-guard → "No changes detected"). Direct/unpooled endpoint for DDL.

### C. Payment abstraction (the keystone — define BEFORE any provider)
- `lib/payments/`: a `PaymentProvider` interface (e.g. `createPayment(order) → {ref, status}`, `getStatus(ref)`), and a `FakePaymentProvider` that resolves success/failure DETERMINISTICALLY (e.g. a test flag or amount-based rule) with no network. Checkout depends only on the interface. Document that 5b adds the real card adapter here.

### D. Checkout flow (`(app)/checkout/page.tsx`, replace placeholder)
- Guest checkout allowed (do not gate). Logged-in users' info prefilled where available.
- Shipping form (RHF + Zod, BD fields: full name, phone, address, area/thana, city/district, postcode optional). Order summary from the SERVER-AUTHORITATIVE DB cart (items, subtotal, flat shipping constant, total in ৳).
- Place-order action `server/actions/order.ts` in a DB TRANSACTION: re-validate stock for every line → decrement variant stock → create order + order_items (snapshot prices) → run the payment provider (fake) → on success set status 'paid' + clear the cart; on failure roll back (no decrement, no order, or mark 'failed') and surface an error. Atomic — no oversell.
- Order uses the authoritative DB cart, never optimistic client state.

### E. Confirmation
- `(app)/order/[id]` (or `/checkout/success`): shows the order — items, totals, shipping, status. One-query order load. Cart is empty afterward.
- Email is DEFERRED to 5b (note it; do not build email here).

## Files (create / modify)
- `src/lib/db/schema.ts` (+relations), `src/lib/payments/` (interface + fake), `src/server/actions/order.ts`, `src/server/queries/order.ts`
- `src/app/(app)/checkout/page.tsx`, `src/app/(app)/order/[id]/page.tsx`, `src/components/features/checkout-form.tsx`
- theme transition: `globals.css` / `theme-provider` (minimal)
- `tests/e2e/checkout.spec.ts`

## Constraints
- Follow CLAUDE.md. Server Components for reads; `"use client"` only for the checkout form. Mutations via Server Actions, Zod-validated. One query for cart + order loads. Money integer poisha → ৳.
- Payment via the abstraction + FAKE adapter only — NO real provider, NO external/network calls this phase.
- Order placement is a single atomic transaction (stock re-check + decrement + order + cart clear). No oversell.
- Guest checkout works. Tokens only (navy). No dead controls.
- Do not commit or push.

## Double-test (required before you report)
1. Round 1 — `pnpm db:push` (twice — drift-guard), `pnpm build`, `tsc --noEmit`, `biome check`, `pnpm test:e2e` (incl. existing suite). Fix every failure.
2. Round 2 — re-run all green. Functional (real Brave clicks; `goto` for nav):
   - Add to cart → checkout → fill shipping → place order (fake success) → confirmation shows the order; cart is now empty; the variant's stock decremented by the ordered qty.
   - Fake FAILURE path → no order created (or marked failed), stock NOT decremented, cart intact, error shown.
   - Guest (logged out) can complete checkout.
   - Theme toggle transitions smoothly; no flash on initial load.
   - Existing auth/cart/catalog/brand e2e still green.

## Report back (then STOP — do not commit or push)
Exactly these sections; missing section or unproven "green" = incomplete.
1. Scope checklist (A–E). 2. Files changed (`git status --short` + `git diff --stat`; CLAUDE.md untouched). 3. Round 1 evidence (paste both db:push, build/tsc/biome/e2e + fixes). 4. Round 2 evidence (paste output, e2e count, functional incl. stock-decrement numbers before/after + the failure path + drift-guard). 5. Acceptance map (paste the one-query order load + show the transaction is atomic). 6. Forbidden-pattern attestation + `"use client"` files. 7. Secrets/env. 8. Deviations. 9. Open questions / blockers. 10. Footer: `Did not commit. Did not push.`
— Then append the **"CHECK ON THE SITE"** block below.

Anti-gaming: no editing/deleting tests to pass; no suppressing type errors; no stubbing beyond the explicitly-scoped fake payment adapter. Wrong tests → section 9.

## CHECK ON THE SITE (Claude Code: include with the report)
Run `pnpm dev`, then:
- Add items, go to Checkout, fill the shipping form, place the order — you should land on a confirmation page, the cart should be empty, and the product's stock should drop.
- Toggle dark/light — the color change should fade smoothly, with no flash when the page first loads.

## Acceptance criteria
- Checkout works for guest + logged-in; order created with snapshot prices; stock decremented atomically (no oversell); cart cleared on success.
- Fake payment success and failure paths both behave correctly (failure = no decrement, cart intact).
- Order confirmation page renders the order (one-query load).
- Payment abstraction + fake adapter in place; checkout depends only on the interface (5b-ready). Email deferred to 5b.
- Theme transition smooth, no load flash.
- Drift-guard "No changes detected"; checkout/order e2e green; existing e2e green; build/tsc/biome clean. Nothing committed.rst paint (suppress until mounted, or equivalent). Keep it tasteful.

### B. Order model (schema)
- `orders` (id, userId nullable [guest allowed], status enum: pending|paid|failed|cancelled, subtotalMinor, shippingMinor, totalMinor, shipping fields [fullName, phone, address, area/thana, city/district, postcode nullable], paymentRef nullable, createdAt) and `order_items` (id, orderId FK, variantId FK, quantity, unitPriceMinor — price SNAPSHOT at order time). Relations for one-query order load.
- `pnpm db:push` then AGAIN (drift-guard → "No changes detected"). Direct/unpooled endpoint for DDL.

### C. Payment abstraction (the keystone — define BEFORE any provider)
- `lib/payments/`: a `PaymentProvider` interface (e.g. `createPayment(order) → {ref, status}`, `getStatus(ref)`), and a `FakePaymentProvider` that resolves success/failure DETERMINISTICALLY (e.g. a test flag or amount-based rule) with no network. Checkout depends only on the interface. Document that 5b adds the real card adapter here.

### D. Checkout flow (`(app)/checkout/page.tsx`, replace placeholder)
- Guest checkout allowed (do not gate). Logged-in users' info prefilled where available.
- Shipping form (RHF + Zod, BD fields: full name, phone, address, area/thana, city/district, postcode optional). Order summary from the SERVER-AUTHORITATIVE DB cart (items, subtotal, flat shipping constant, total in ৳).
- Place-order action `server/actions/order.ts` in a DB TRANSACTION: re-validate stock for every line → decrement variant stock → create order + order_items (snapshot prices) → run the payment provider (fake) → on success set status 'paid' + clear the cart; on failure roll back (no decrement, no order, or mark 'failed') and surface an error. Atomic — no oversell.
- Order uses the authoritative DB cart, never optimistic client state.

### E. Confirmation
- `(app)/order/[id]` (or `/checkout/success`): shows the order — items, totals, shipping, status. One-query order load. Cart is empty afterward.
- Email is DEFERRED to 5b (note it; do not build email here).

## Files (create / modify)
- `src/lib/db/schema.ts` (+relations), `src/lib/payments/` (interface + fake), `src/server/actions/order.ts`, `src/server/queries/order.ts`
- `src/app/(app)/checkout/page.tsx`, `src/app/(app)/order/[id]/page.tsx`, `src/components/features/checkout-form.tsx`
- theme transition: `globals.css` / `theme-provider` (minimal)
- `tests/e2e/checkout.spec.ts`

## Constraints
- Follow CLAUDE.md. Server Components for reads; `"use client"` only for the checkout form. Mutations via Server Actions, Zod-validated. One query for cart + order loads. Money integer poisha → ৳.
- Payment via the abstraction + FAKE adapter only — NO real provider, NO external/network calls this phase.
- Order placement is a single atomic transaction (stock re-check + decrement + order + cart clear). No oversell.
- Guest checkout works. Tokens only (navy). No dead controls.
- Do not commit or push.

## Double-test (required before you report)
1. Round 1 — `pnpm db:push` (twice — drift-guard), `pnpm build`, `tsc --noEmit`, `biome check`, `pnpm test:e2e` (incl. existing suite). Fix every failure.
2. Round 2 — re-run all green. Functional (real Brave clicks; `goto` for nav):
   - Add to cart → checkout → fill shipping → place order (fake success) → confirmation shows the order; cart is now empty; the variant's stock decremented by the ordered qty.
   - Fake FAILURE path → no order created (or marked failed), stock NOT decremented, cart intact, error shown.
   - Guest (logged out) can complete checkout.
   - Theme toggle transitions smoothly; no flash on initial load.
   - Existing auth/cart/catalog/brand e2e still green.

## Report back (then STOP — do not commit or push)
Exactly these sections; missing section or unproven "green" = incomplete.
1. Scope checklist (A–E). 2. Files changed (`git status --short` + `git diff --stat`; CLAUDE.md untouched). 3. Round 1 evidence (paste both db:push, build/tsc/biome/e2e + fixes). 4. Round 2 evidence (paste output, e2e count, functional incl. stock-decrement numbers before/after + the failure path + drift-guard). 5. Acceptance map (paste the one-query order load + show the transaction is atomic). 6. Forbidden-pattern attestation + `"use client"` files. 7. Secrets/env. 8. Deviations. 9. Open questions / blockers. 10. Footer: `Did not commit. Did not push.`
— Then append the **"CHECK ON THE SITE"** block below.

Anti-gaming: no editing/deleting tests to pass; no suppressing type errors; no stubbing beyond the explicitly-scoped fake payment adapter. Wrong tests → section 9.

## CHECK ON THE SITE (Claude Code: include with the report)
Run `pnpm dev`, then:
- Add items, go to Checkout, fill the shipping form, place the order — you should land on a confirmation page, the cart should be empty, and the product's stock should drop.
- Toggle dark/light — the color change should fade smoothly, with no flash when the page first loads.

## Acceptance criteria
- Checkout works for guest + logged-in; order created with snapshot prices; stock decremented atomically (no oversell); cart cleared on success.
- Fake payment success and failure paths both behave correctly (failure = no decrement, cart intact).
- Order confirmation page renders the order (one-query load).
- Payment abstraction + fake adapter in place; checkout depends only on the interface (5b-ready). Email deferred to 5b.
- Theme transition smooth, no load flash.
- Drift-guard "No changes detected"; checkout/order e2e green; existing e2e green; build/tsc/biome clean. Nothing committed.

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
