# Chocolate Zone — Production-Ready Project Plan
**Status: Planned (pre-build).** Merged output of 10 parallel specialized agents, all working from the locked shared contract in `docs/ARCHITECTURE.md`. This plan is the executable synthesis: how the deliverables fit, the resolved design decisions, the founder decisions still open, the build order with dependencies, and the acceptance gates.

---

## 1. How to Use This Plan

- `docs/ARCHITECTURE.md` — the locked, immutable shared contract (stack, data model, API surface, folder structure, security model). Every deliverable conforms to it.
- `docs/deliverables/01-pm-prd.md` — WHAT to build (stories, acceptance criteria, KPIs, roadmap).
- `docs/deliverables/02-ux-ux.md` — HOW it looks and feels (design tokens, screen specs, motion, a11y).
- `docs/deliverables/03-frontend-architecture.md` — storefront + admin code architecture.
- `docs/deliverables/04-backend-api.md` — API/BFF, pricing, validation, error model.
- `docs/deliverables/05-database.md` — SQL DDL, RLS, seeds, migrations.
- `docs/deliverables/06-supabase.md` — Supabase setup, three-client pattern, storage, CLI.
- `docs/deliverables/07-auth.md` — admin magic-link auth, middleware, hardening.
- `docs/deliverables/08-whatsapp.md` — the order-message builder and wa.me contract.
- `docs/deliverables/09-devops.md` — Vercel, CI/CD, env/secrets, observability, backups.
- `docs/deliverables/10-qa.md` — test pyramid, case matrices, e2e flows, release gate.
Build the system in the order in Section 6; each phase names the deliverable that drives it.

---

## 2. Consolidated Architecture (Single Source of Truth)

```
Vercel (single Next.js 15 app)
├── (storefront)  RSC + ISR, revalidateTag('catalog')   ← anon key + RLS reads
├── (admin)       magic-link session, requireAdmin       ← service-role writes
└── /api/*        BFF Route Handlers (zod-validated)
        │
        ▼
Supabase (region-matched to Vercel)
├── Postgres: shop_settings, categories, products, product_variants, offers, offer_products
├── Auth: magic link, admin-only, @supabase/ssr cookies
└── Storage: product-images, offer-images (signed-URL uploads)
        │
        ▼
wa.me deep-link → shop's WhatsApp (the order channel; no order storage in MVP)
```
Core rules (enforced across all deliverables):

- Public reads: anon key + RLS SELECT policies. All writes: server-side service role. Never trust the client.
- Money is integer **minor units** end-to-end (INR paise); DB stores `numeric(10,2)`, backend converts with `toMinor`.
- Offers are **non-stacking, best-per-line**, applied at actual quantity; offer math lives only in the backend pricing layer.
- Free delivery is evaluated on the **pre-discount subtotal** (`>=` threshold waives the fee).
- The WhatsApp message is built by a pure function; the checkout route recomputes everything from fresh DB reads.
- No customer accounts, no customer data stored, no order rows in MVP. Ever.

---

## 3. Resolved Design Decisions (Teams Cross-Flagged These)
DecisionResolutionOwning docMoney representationInteger minor units in app; `numeric(10,2)` in DB04 §2.2, 05Offer stackingNon-stacking; `applyBestOffer` picks best discount per line at quantity04 §5.2, 08, 10Free-delivery basisPre-discount subtotal; `>=` threshold → fee 004 §6.3, 08, 10 CO-11Fixed-discount semanticsPer item, capped at line subtotal05 §2, 04 §5.2HTML-escaping of message text**Resolved: do NOT HTML-escape** — control-char strip only; URL layer percent-encodes; frontend renders message as plain text, never innerHTML08 §8.1/§14, 10 WM-12waUrl ownershipBuilder returns `{ message, waUrl }`; backend stops composing URL itself08 §14Category deletionHard delete blocked while products exist → error `CATEGORY_IN_USE`; soft-delete is default elsewhere05 §3, 04 error tableSignupsFour layers block public signup: `enable_signup=false`, `shouldCreateUser:false`, `ADMIN_EMAIL` allowlist, one-time out-of-band admin creation07 §2Upload flowSigned URL via service role (bucket-relative `objectKey`, 5-min TTL), browser PUT, client WebP re-encode06 §5, 04 §7.5RLS grants`anon` AND `authenticated` get SELECT only; writes revoked at grant level; service role bypasses RLS05 §4RealtimeV2 only; MVP freshness via `revalidateTag('catalog')` after every mutation06 §6

---

## 4. Founder Decision Log (Confirm Before Build Starts)
#DecisionRecommendationBlocked workF-1Production regionStart N. Virginia (`iad1` ⇄ Supabase East US, both free-tier compatible); move to Mumbai (`bom1`) at scale for +91 latencyDevOps runbook step 1 (09 §10)F-2Package managernpm (zero config) or pnpm (faster CI); must be finalized before CI workflow is writtenCI YAML (09 §4)F-3Default phone country codeIndia (+91) given product context; E.164 full validation deferred to V2Phone normalization (04, 08)F-4Delivery fee / threshold defaults`delivery_fee=₹40`, `free_delivery_threshold=₹500` (as seeded)Seed data (05)F-5Emoji/branding voice in WhatsApp templateLock plain-text dividers now; emoji optional, must render identically on all devicesMessage template (08 §6)F-6`orderTime` label in messageInclude local time of order submission (informational)Builder input (08)F-7Admin delete UXSoft-toggle everywhere; hard delete only for products/offers without dependentsAdmin product/offer formsF-8Analytics providerPlausible (privacy-friendly, no cookies); 8 KPI events named in PRD §7Event instrumentation (01 §7, 09 §5)F-9Sentry in MVPOptional; instrument checkout + auth callback if enabledObservability (09 §5)F-10Cart item capLock a max (recommend 50) to bound message lengthCart store + builder truncation (03, 08)

---

## 5. MVP Scope (from PRD, P0+P1)
Storefront: menu browse (SSR+ISR), category filtering, dynamic offers section with countdown, product variants/add-ons, persistent cart (localStorage), Name+Phone checkout with pickup/delivery + fee/threshold, server-validated WhatsApp generation with copy + `web.whatsapp.com` fallback, closed/ordering-paused states (browsing always allowed, submission blocked server-side).

Admin: magic-link single-admin auth, CRUD for categories/products/offers/shop settings, variant CRUD nested under products, open/ordering toggles, signed-URL WebP image upload, seconds-level storefront revalidation.

Explicitly out (V1.1+): payments, order storage, admin analytics dashboard, stock/sold-out, multi-branch, loyalty, PWA install, i18n, realtime storefront, WhatsApp Cloud API.

---

## 6. Build Plan (Ordered Phases With Dependencies)

### Phase 0 — Decisions & Repo Setup (1–2 days)

- Lock founder decisions F-1..F-10. Init Next.js 15 + TypeScript + Tailwind + shadcn/ui repo; set Tailwind `@theme` + shadcn CSS variables from UX tokens (02 §5.6).
- **Driven by:** 02, 09. **Accept:** `pnpm/npm run dev` renders a token-styled shell; typecheck passes.

### Phase 1 — Data Foundation (2–3 days)

- Apply DB DDL `0001_init.sql` + `0002_seed.sql` (05), configure Supabase project/Auth/Storage per 06, run RLS verification (06 §4, 10 integration tier), generate `src/types/supabase.ts`.
- **Driven by:** 05, 06. **Accept:** anon can read active rows only and cannot write; service role round-trips; seeded catalog visible.

### Phase 2 — Backend Core (3–4 days)

- Implement `lib/validation/*`, `lib/pricing/*`, `lib/services/*`, all `/api/*` routes per 04; `lib/whatsapp/order-message.ts` per 08 (builder contract); `lib/auth/require-admin.ts` per 07 §11.
- **Driven by:** 04, 08, 07. **Accept:** unit suites for discount/money/sanitization/builder pass (10 unit tier); checkout recomputes totals and rejects tampered/closed/out-of-stock orders.

### Phase 3 — Storefront (4–5 days)

- RSC pages + client components (ProductCard, OfferCarousel, CategoryChips, ProductSheet, CartSheet, CheckoutForm, FloatingCartBar, QtyStepper), Zustand cart, forms, Framer Motion, SEO/OG (03).
- **Driven by:** 03, 02. **Accept:** browse → filter → offer → cart → checkout happy path works locally; cart survives reload; phone auto-fill and reorder active.

### Phase 4 — Admin (3–4 days)

- `(admin)` route group: login flow, dashboard, CRUD for all four entities + variants + settings + image upload; optimistic TanStack Query mutations that call `revalidateCatalog()` (03 §5, 04 §4, 07).
- **Driven by:** 03, 07, 02. **Accept:** owner can login via magic link, add a product with image, toggle ordering, and see the storefront reflect it within seconds.

### Phase 5 — Hardening & QA (3–4 days)

- Rate limiting, sanitization pipeline final, error-code UI mapping, Sentry (if F-9), Plausible events, security headers (09 §7).
- **Driven by:** 04, 09, 10. **Accept:** full unit + integration suites green; auth matrix AM-01..12 passes.

### Phase 6 — E2E & Deploy (2–3 days)

- Playwright flows SF-02..15 + admin reflection + perf/a11y gates (10); CI/CD pipelines (09 §4); runbook execution to production; go/no-go gate.
- **Driven by:** 10, 09. **Accept:** DoD Section 7 fully met on a live URL.

---

## 7. Definition of Done (Merge of Baseline §12 + PRD Launch Gate)

1. Storefront LCP < 2s / CLS < 0.1 / INP < 200ms on a mid-range phone (Lighthouse CI + Playwright INP).
2. Browse → category filter → offer visible → add to cart → Name+Phone checkout → correct pre-filled WhatsApp message opens in < 60 seconds total.
3. Delivery and pickup both produce correct messages including fee / FREE DELIVERY / threshold upsell.
4. Store closed and ordering-disabled states block submission server-side while preserving the cart.
5. Admin can CRUD all four entities and toggle open/ordering; storefront reflects changes within seconds (`revalidateTag` proven by RV-01..08).
6. No customer data stored; no order rows; anon cannot write anything (RLS negative tests green).
7. All `/admin/*` and `/api/admin/*` surfaces return 401/403 without a valid session (AM-01..12 green).
8. WhatsApp message builder passes WM-01..26 including all injection cases; success panel renders message as plain text.
9. CI gates (lint → typecheck → unit → integration → e2e) green on main; preview deployed per PR.
10. PITR enabled + scheduled off-platform `pg_dump` running; restore drill documented.

---

## 8. Key Cross-Agent Contracts (The Seams)

- `requireAdmin(request) → { user } | throws { code: 'no_session'|'invalid_session'|'forbidden' }` — backend imports from `@/lib/auth/require-admin`; auth specialist owns impl (07 §11, 04 §9).
- `buildOrderMessage(input: OrderMessageInput) → { message, waUrl }` — pure, flat input, minor units, control-stripped-but-unescaped name/note; backend calls it and returns `msg.waUrl` directly (08 §2/§14).
- Money: `toMinor`/`formatMoney`/`roundHalfUp` in `lib/pricing/money.ts`; DB stores decimal (05), app uses integers (04 §2.2).
- Revalidation: `revalidateCatalog()` in `lib/revalidate.ts` after every admin mutation; public catalog read via `unstable_cache(..., tags:['catalog'], revalidate:60)`; checkout bypasses all caching (04 §6).
- RLS: anon/authenticated SELECT-only (05 §4); Supabase expert verifies with `supabase/verify-rls.sql` (06 §4).
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`, optional Upstash/SENTRY/PLAUSIBLE vars (09 §3).

---

## 9. Risks & Mitigations
RiskLikelihoodMitigationAnon key / service role leaked to clientLowCI job builds without the service role and fails if a secret appears in client bundle (09 §4); runtime `window` guard in `admin.ts` (06 §2)WhatsApp message injectionLowTwo-layer defense: control-char strip + `encodeURIComponent`; plain-text render boundary (08 §8.1)Stale prices on the cartMediumPrices recomputed server-side at checkout; snapshot only for display, stale rows flagged (03 §4, 04 §6)Supabase Free auto-pause (7-day idle)MediumGo Pro at go-live (~$25/mo); documented in cost plan (09 §9)Magic-link abuse / enumerationLowRate-limit buckets over Supabase OTP limits; no account enumeration (07 §3)Hobby ISR 60s floor vs freshnessMediumFreshness rides on on-demand `revalidateTag`, not time-based ISR (09 §2)E2E flakinessMediumIsolated state, retries, `page.clock` determinism, no sleeps (10 §8)WhatsApp handoff on real devicesMediumManual-only automation; device testing in release gate (10 deferred)

---

## 10. Recommended Next Step
Phase 0/1 kickoff: lock founder decisions F-1..F-10, scaffold the Next.js repo with the token theme, and apply the DB migration + seed. I can start scaffolding the project now (Phase 0 + Phase 1 SQL), or resolve the founder decision log with you first.
