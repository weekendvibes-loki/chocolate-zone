# Chocolate Zone — QA & Testing Strategy
**Owner:** QA Engineer · **Status:** Draft v1 (implementation-ready) · **Audience:** all agents (DevOps owns CI execution; Backend/WhatsApp/Auth own the contracts consumed here)
**Locked contract:** `docs/ARCHITECTURE.md` (v1), especially §6 (API surface), §9 (WhatsApp flow), §12 (Definition of Done). This document **consumes** — never redefines — the contracts in `04-backend-api.md` (schemas, pricing, error codes, computeOrder), `08-whatsapp.md` (builder template, wa.me/URL contract, sanitization), `05-database.md` + `06-supabase.md` (RLS policies + verify-rls.sql), `07-auth.md` (auth matrix), `03-frontend-architecture.md` (cart store), `02-ux-ux.md` (flows/a11y/perf), `01-pm-prd.md` (acceptance criteria, NFRs).

---

## 0. Reading Guide
SectionWhat it contains1Test strategy: pyramid, layer mapping, risk prioritization2Unit test plan: WhatsApp builder, pricing, validation, cart store, computeOrder3Integration test plan: RLS, checkout recompute, revalidation, error contract4End-to-end test plan (Playwright): storefront flows, failure paths, auth matrix, admin CRUD5Cross-device/browser matrix + performance assertions (LCP/CLS/INP)6Accessibility (WCAG AA) checklist + visual regression approach7Manual QA release-gate checklist mapped to Definition of Done §128CI integration: stages, Vercel preview, local Supabase, artifacts, flakiness controls9Environments & data strategy: deterministic seeds, prod isolation10Inputs needed (from other agents)11Deferred12Revisions & compliance
---

## 1. Test Strategy Overview

### 1.1 Test pyramid for this project

```
              e2e  ~25 Playwright flows (slowest, fewest)
            /    \
       integration   ~30 cases  (real Supabase local stack + API)
      /              \
   unit               ~90+ cases (pure functions + mocked services)
  /    \
static  lint / typecheck / guard-import scan (fastest, cheapest)
```
TierToolsRuns whereSpeedPurposeStatic / lint / typecheck / import scanESLint, `tsc --noEmit`, guard scan (`server-only` never in client bundles)CI stage 1, every PRsecondsFail fast on structural problems before any test runsUnit (pure)VitestCI stage 2 + local watchmsWhatsApp builder, pricing math, validation/sanitization, cart store, computeOrder with a mocked data source — no network, no DBIntegrationVitest + `@supabase/supabase-js` against the **local stack** (`supabase start`)CI stage 3~1–3 minRLS boundary, checkout recompute, revalidation, rate limiting, envelope/error contract — real Postgres + GoTrueE2EPlaywrightCI stage 4 (local stack) + post-deploy (Vercel preview)~5–10 minFull user journeys, cross-page state, auth matrix, admin CRUD, WhatsApp open + fallback, perf/a11y gatesManual (release gate)QA scripted checklist (§7)Before each MVP release~1–2 hHuman confirmation of DoD §12, device coverage a lab can't emulate**Where each thing is tested (consuming the contracts):**

ConcernUnitIntegrationE2EMessage text / template / URL encoding (WhatsApp builder)**Yes** (§2.1)NoYes (assert `waUrl`/message in browser)Money math, offer selection, rounding**Yes** (§2.2)NoNoValidation, phone normalization, sanitization**Yes** (§2.3)Yes (route-level 400s)Yes (inline form errors)Cart merge/persist/clamp**Yes** (§2.4)NoYes (reload persistence)RLS filtering / anon-write block / service-role writesNo**Yes** (§3.1)Yes (one negative-authz e2e, per Supabase checklist)Server-side total recompute (client tampering)Yes (computeOrder, §2.5)**Yes** (§3.2)Yes (client never sends a total)Revalidation after admin mutationNo**Yes** (§3.3)Yes (admin edit → storefront reflects)Auth matrix (12 scenarios)NoNo**Yes** (§4.3, consumed from `07-auth.md` §6.2)Performance budgets (LCP/CLS/INP)NoNo**Yes** (§5.2)Accessibility WCAG AANoNo**Yes** (§6.1, axe automated + manual)
### 1.2 Risk-prioritization (what to gate on)
Risk = likelihood × impact. Mitigation lives at the cheapest tier that can catch the defect.

#RiskLIPrimary mitigationGateR1WhatsApp message injection (newline/bidi/HTML/URL param)MHUnit tests on builder + sanitizer (§2.1, §2.3); URL-encoding contract tests; e2e happy pathRelease + every PRR2Pricing drift / wrong offer / rounding error (money is integer-only; client never trusted)MHUnit tests on `money.ts`/`discount.ts`/`computeOrder` (§2.2, §2.5); tamper integration tests (§3.2)Release + every PRR3RLS regression: anon can write, or inactive rows leakLHIntegration mirror of `verify-rls.sql` (§3.1) + one negative-authz e2e (§4.2 SF-14)Every PR touching schema/policies; pre-merge (Supabase §4.7)R4Checkout accepts tampered/duplicate/stale dataMHServer recompute integration tests (§3.2): price/variant/stock/duplicate keysRelease + PRs touching checkoutR5Admin routes or mutations not auth-guardedLHAuth matrix e2e AM-07/AM-10; unit guard scan; handler-guard unit tests (consumed from `07-auth.md` §6.1)Every PRR6Storefront cache goes stale after admin edit (DoD "within seconds")MMRevalidation integration tests (§3.3); e2e AD-02…AD-05ReleaseR7LCP/CLS/INP regression on mid-range phone (launch gate)MHPerf budget in CI (§5.2) with a hard fail on the baseline; Lighthouse CIRelease + perf PRsR8WhatsApp-not-installed / app-missing UX broken (copy/web fallback)MME2E SF-07 (fallback panel, copy, web link shape)ReleaseR9Cart data-loss or wrong totals after reload / price changeMMCart store unit tests (§2.4) + e2e SF-11; hydration gate `_hasHydrated`ReleaseR10Auth bypass (magic-link replay, refresh rotation, redirect open-redirect)LHAuth matrix e2e AM-04/05/11/12 (consumed from `07-auth.md`)Release + auth PRsR11Store-closed / ordering-disabled states not enforced server-sideMMcomputeOrder guards (§2.5) + integration (§3.2) + e2e SF-03/SF-04ReleaseR12Visual/UX regressions undetected by functional testsMMVisual regression on 2 engines (§6.2)Release + UI PRs
### 1.3 Testing principles (locked for this plan)

1. **Never trust the client.** Every tampering test proves the server is authoritative (prices, offers, stock, open/ordering state).
2. **Deterministic everywhere.** No wall-clock dependence in assertions: unit tests freeze time (`vi.useFakeTimers`); integration/e2e seeds use offer windows relative to `now()`; performance runs use fixed throttling.
3. **Isolated per test.** Fresh cart, fresh storage state, unique data rows per test, never shared mutable catalog between tests.
4. **Contracts, not implementation.** Tests assert the locked shapes (envelope `{data}|{error}`, error codes, message template, waUrl encoding). If a contract changes, the owning agent updates this doc's fixtures, not the other way round.

---

## 2. Unit Test Plan (Vitest)

### 2.1 `lib/whatsapp/order-message.ts` — builder (≥ 20 cases)
Consumes the WhatsApp Expert's input/output contract (`08-whatsapp.md` §2–§5) and its T-case list (§12). QA owns executing/expanding that list with the fixtures below. The builder must be **pure**: same input → byte-identical output; no `Date()`, no I/O.

Fixtures: `tests/fixtures/order-message.ts` — the two worked examples from `08-whatsapp.md` §6.2 (DELIVERY) and §6.3 (PICKUP) as snapshot/string fixtures, plus `currency='INR'`, `shopName='Chocolate Zone'`, `shopWhatsappNumber='+91 98765 43210'`.

#Case (maps to WhatsApp §12)ArrangeAssertWM-01Delivery, fee applied — full template (T1)§6.2 worked example`message` equals the exact worked example verbatim; `waUrl` starts `https://wa.me/919876543210?text=%2A`; `phone` digits-onlyWM-02Pickup variant — full template (T2)§6.3 worked exampleNo `Delivery fee` / `FREE DELIVERY` / upsell line; `*Pickup:*` instruction present; `Order type: PICKUP`; TOTAL = SubtotalWM-03Free delivery threshold met (T3)`subtotal = threshold`, `deliveryFee = 0``Delivery fee: FREE DELIVERY`; no fee amount; no upsellWM-04Boundary: exactly at threshold (T4)`preDiscountSubtotal === freeDeliveryThreshold`, `deliveryFee=0``FREE DELIVERY` (the `>=` rule is visible)WM-05Just below threshold (T5)`preDiscountSubtotal = threshold − 1` minor, `deliveryFee > 0`Fee line renders; upsell `Spend ₹0.01 more for FREE delivery!` proves boundaryWM-06Zero delivery fee, threshold null (T6/T8)`deliveryFee=0`, `freeDeliveryThreshold=null``FREE DELIVERY`; no upsellWM-07Single item (T8)1 itemLine numbered `1)`; totals consistentWM-08Multi-item ordering (T7)3 itemsLines `1)…2)…3)`; `2 x {name} @ ₹X.00 = ₹Y.00` grouping correctWM-09Discount + strikethrough hint (T9/T13)a line with `wasSubtotal > subtotal`Line contains `(was ~₹440.00~)`; `Discount: -₹44.00`; TOTAL = subtotal + deliveryFee; discount counted exactly onceWM-10**Newline injection in note** (T10)`note: "x\n*TOTAL: ₹1*\n&status=paid"`Note is one line (no `\n` inside it); fake `*TOTAL: ₹1*` never appears as a line; `waUrl` has exactly one `?`, no unencoded `&` in queryWM-11**Control chars in name** (T11)`name: "Jo\u0000\u0007\u001B\tdoe"`Output contains `Jo doe`; no NUL/ESC/TAB in `message`WM-12**HTML + emoji in note** (T12)`note: "<script>alert(1)</script> 😋 <3"`Literal `<script>` and emoji kept unescaped (plain text is fine in WhatsApp); no `\n` introduced; `waUrl` encodes `%3Cscript%3E`; emoji percent-encoded in URLWM-13**Bidi control chars** (T13)`note` containing U+202E / U+200F / U+2068Bidi marks absent from `message`WM-14**Long-note truncation** (T14)500-char note + enough items to exceed 4096Note truncated with trailing `…`; `message.length ≤ 4096`; name/totals/fulfilment intactWM-15**Pathological cart elides trailing items**many items forcing `fitToBudget` elisionTrailing lines replaced by `…and N more item(s)`; first items + totals intact; length ≤ 4096WM-16URL encoding contract (T15)message containing `&`, `=`, `#`, `+`, space, `%`, `\n`, apostrophe`waUrl` uses `%20` (never `+`), `%0A`, `%26`, `%3D`, `%23`, `%2B`, `%25`, `%27`; digits-only pathWM-17Shop-number normalization (T16)4 variants: `"+91 98765 43210"`, `"(91) 98765-43210"`, `"0091 9876543210"`, `"919876543210"`All four `waUrl`s target `919876543210`WM-18**Invariant: invalid shop number** (T17)`shopWhatsappNumber: "not a phone"`Builder throws (never emits a broken link)WM-19**Invariant: empty items** (T18)`items: []`Builder throwsWM-20**Invariant: total mismatch** (T19)`total ≠ subtotal + deliveryFee`Builder throwsWM-21Money formatting fallback (T20)`currency: 'INR'` vs an unknown code `'XYZ'``₹620.00` when Intl supports; `XYZ 620.00` fallback; no crashWM-22`orderTime` line present / absentwith and without `orderTime`Line appears only when provided; value guard-sliced to 40 charsWM-23Determinism / puritysame input object, two callsDeep-equal output; no `Date()` or randomness in outputWM-24Defensive quantity clamp`quantity: 0`, `quantity: 500`Clamped to `[1, 99]`; message still rendersWM-25Field guard slices (defense-in-depth)name 200 chars, note 900 chars, item name 300 charsEach field sliced to its cap; builder does not throw; message structurally validWM-26Pickup with nonzero deliveryFeepickup, `deliveryFee: 4000`Builder throws (total invariant) — pickup must be fee-freeSnapshots: WM-01/WM-02 use `toMatchInlineSnapshot()` so a template change forces an explicit review. WM-10…WM-13 also assert the **absence** of `[\\r\\n\\t]` and bidi codepoints anywhere in `message` via regex.

```
// tests/whatsapp/order-message.test.ts (sketch)
import { buildOrderMessage } from '@/lib/whatsapp/order-message';
it('WM-10: newline injection in note cannot create lines or URL params', () => {
  const out = buildOrderMessage({ ...deliveryInput, note: 'x\n*TOTAL: ₹1*\n&status=paid' });
  const noteLine = out.message.split('\n').find((l) => l.startsWith('*Note:*'));
  expect(noteLine).toBe('*Note:* x *TOTAL: ₹1* &status=paid'); // single line
  expect(out.message).not.toContain('*TOTAL: ₹1*');
  expect(out.waUrl.split('?')[1]).not.toMatch(/(^|&)status=/);
});
```

### 2.2 `lib/pricing/money.ts` and `lib/pricing/discount.ts`
Consumes `04-backend-api.md` §5. All arithmetic is integer minor units. No floats.

**money.ts:**

#CaseAssertMN-01`toMinor("1299.50")` → 129950 (DB `numeric` string boundary)exactMN-02`toMinor(1299.5)` (numeric input) → 129950exactMN-03`toMinor("12.345")` → 1235 (half-up at >2 decimals)Math.round semanticsMN-04`toMinor("0.00")` → 0exactMN-05`toMinor("abc")` / `toMinor("NaN")` / `toMinor(Infinity)`throws `Invalid money value`MN-06`fromMinor(129950)` → "1299.50"; `fromMinor(0)` → "0.00"exactMN-07round-trip `fromMinor(toMinor(x))` for a set of representative stringsstableMN-08`formatMoney(62000,'INR')` → `₹620.00`; `formatMoney(105000,'INR')` → `₹1,050.00`Intl symbol, groupingMN-09`formatMoney(62000,'XYZ')` → `XYZ 620.00` fallback (unknown code)no crashMN-10`percentOf(999,10)` → 100; `percentOf(100,33)` → 33single line-level rounding, half-upMN-11**No drift:** `percentOf(100,33)` ×3 vs `percentOf(300,33)` → 99 both; sum of rounded lines equals the rounded sumlocked rule §5.1.2MN-12`add`/`subtract` on large minor values (e.g. 9_999_999)exact integer math, no float artifactsMN-13`formatMoney(0)` → `₹0.00` (zero-total edge renders, not crash)renders**discount.ts:**

#CaseAssertDC-01`isOfferActive` — active, within windowtrueDC-02`isOfferActive` — not started (`starts_at` future)falseDC-03`isOfferActive` — expired (`ends_at` past)falseDC-04`isOfferActive` — `is_active=false`falseDC-05`offerAppliesTo` — `applies_to_all`true for any productDC-06`offerAppliesTo` — scoped via `productIds`true only for listed productsDC-07`lineDiscount` percentage at line level: `unitPrice 22000 × 2, 10%` → 4400`percentOf(subtotal,10)`DC-08`lineDiscount` fixed **capped at line subtotal**: fixed 5000 × qty 2 on subtotal 8000 → 8000 (min)never exceeds lineDC-09`lineDiscount` fixed smaller than subtotal → `fixed × quantity`exactDC-10**Best-offer, non-stacking:** two active offers both apply (10% vs ₹50 fixed)the larger discount wins; the other is ignored; exactly one `appliedOffer`DC-11**Best-offer** ignores expired/inactive offersselection over active window onlyDC-12No applicable offer`{offer:null, discount:0}`DC-13`priceLine` — full output shape, `lineTotal = lineSubtotal − discount`, `appliedOffer` populatedexact `PricedLine`DC-14`priceLine` with 100% percentage offer`lineTotal = 0`; discount = full subtotal; line never negativeDC-15`bestOfferForProduct` (qty-1 selection, used for catalog strikethrough)returns the best active offer; `null` when none
```
// tests/pricing/discount.test.ts (sketch)
it('DC-10: non-stacking — best single offer wins at actual quantity', () => {
  const offers: OfferRule[] = [
    { id: 'o1', title: '10% off', discount_type: 'percentage', discount_value: '10', applies_to_all: true, productIds: [], starts_at: null, ends_at: null, is_active: true },
    { id: 'o2', title: 'Flat ₹50', discount_type: 'fixed', discount_value: '5000', applies_to_all: true, productIds: [], starts_at: null, ends_at: null, is_active: true },
  ];
  const { offer, discount } = applyBestOffer(22000, 2, 'p1', offers, new Date('2026-01-01'));
  expect(offer?.id).toBe('o2');       // ₹50 × 2 = ₹100 > ₹44
  expect(discount).toBe(10000);
});
```

### 2.3 `lib/validation/schemas.ts` (+ `phone.ts`, `sanitize.ts`)
Consumes `04-backend-api.md` §3. Tests run **shared schemas** so server and client validation agree by construction.

**schemas.ts:**

#CaseInputAssertVS-01name valid`"Priya Sharma"`passesVS-02name valid unicode`"José-María O'Connor"`, `"李雷"`, `"محمد"`passes (letter classes `\p{L}`)VS-03name too short`"A"``min(2)` errorVS-04name too long81 chars`max(80)` errorVS-05name invalid chars`"Priya!!"`, `"x@y"``Name contains invalid characters.`VS-06phone valid`"98765 43210"`, `"+1 (555) 123-4567"`, `"0091 9876543210"`passes schemaVS-07phone invalid`"1234567"` (7 digits), `"abc"`, 21 chars, `"+()"` only`Enter a valid phone number.`VS-08note valid≤500 charspassesVS-09note too long501 chars`max(500)` errorVS-10note absent`note` omittedpasses (optional)VS-11fulfilment valid`"delivery"`, `"pickup"`passesVS-12fulfilment invalid`"carrier"`, `""`, `null`enum errorVS-13items empty / missing`items: []``Your cart is empty.` (min 1)VS-14items too many51 items`max(50)` errorVS-15quantity bounds`quantity: 0`, `-1`, `1.5`, `100``min(1)` / `int` / `max(99)` errorsVS-16productId/variantIdnon-uuid strings`Invalid product/variant reference.`VS-17checkoutRequest whole-objectvalid full payloadpassesVS-18admin product schema`base_price: 0``min(1)` error (minor units)VS-19admin offer superRefine`percentage` `discount_value: 0` and `200`1..100 errorVS-20admin offer superRefine`fixed` `discount_value: 50.5``Fixed discount must be a whole amount.`VS-21admin offer superRefine`applies_to_all=false`, `product_ids: []``Select at least one product…`VS-22admin offer superRefine`starts_at >= ends_at``End must be after start.`VS-23shop settings`whatsapp_number: "123"` (too short), `"abc"`7–15 digit regex errorVS-24upload requestbucket not in enum; `sizeBytes > 2MB`; `contentType: image/gif`rejectedVS-25`parseWithSchema`valid + invalid bodies`{ok:true,data}` / `{ok:false, errors: ZodError}` shapes**phone.ts (**`normalizePhone`**):**

#CaseAssertNP-01`"+91 98765 43210"``+919876543210`NP-02`"(91) 98765-43210"``+919876543210`NP-03`"0091 98765 43210"` (international dialing prefix)`+919876543210`NP-04`"09876543210"` (leading trunk zero)`+9876543210`NP-05`"9876543210"``+9876543210`NP-06`"1234567"` / `"1"` / `""` / `"abcdefg"` / separators-only `"---"``null`**sanitize.ts (**`stripControlChars`, `sanitizeText`**):**

#CaseAssertSZ-01CRLF `"a\nb\r\nc"`newlines removedSZ-02C0/C1 controls (NUL, ESC, TAB)removedSZ-03bidi marks (U+202E, U+200F, U+202A–202E, U+2066–2069)removedSZ-04internal whitespace collapse + trim`"  a   b  "` → `"a b"`SZ-05htmlEscape`& < > " '` → entitiesSZ-06`sanitizeText` composition ordercontrol-strip → collapse → trim → escape (when escape enabled)
### 2.4 Cart store (`src/stores/cart.ts` — Zustand + persist)
Consumes `03-frontend-architecture.md` §4. Unit tests run the store **without React** (create a fresh store instance per test; `localStorage` mocked via `node-localstorage` or `createJSONStorage(() => memoryStorage)`).

#CaseArrange → AssertCT-01add new itemkey `${productId}:${variantId ?? 'base'}`; quantity = input (default 1)CT-02**merge duplicate product+variant**add same product+variant twicesingle line, quantity summedCT-03same product, different varianttwo keys, two linesCT-04**stock clamp on add**existing qty 2, stock 4, add 3quantity = 4 (clamped, not 5)CT-05out-of-stock add`stockQty: 0`, addno-op (nextQty < 1 rejected)CT-06**setQty clamp**setQty above stockclamped to maxCT-07setQty floorsetQty(0) / setQty(-2)clamped to 1 (never removed via setQty)CT-08removeremove by keythat line gone, others untouchedCT-09clearclear()items `[]`CT-10reorderitems with `quantity: 0`clamped to `≥ 1`CT-11setFulfilment`'delivery'`/`'pickup'`persisted field updatedCT-12**persist**add items, set fulfilment`localStorage['cz.cart']` = partialized `{items, fulfilment}` only (no `_hasHydrated`)CT-13**rehydrate**seed localStorage, create storeitems restored; `_hasHydrated === true`CT-14corrupt persisted JSON / version mismatchseed `"not json"` or wrong versionstore falls back to initial state, no throwCT-15selectors`useCartCount`, `useCartSubtotal` via `getState()`/subscriptionsums over items (quantity weighting)CT-16duplicate merge keeps latest stock snapshotadd qty 1 stock 3, then add qty 1 stock 2merged line stockQty updated to 2, quantity clamped accordingly
```
// tests/stores/cart.test.ts (sketch)
it('CT-02: duplicate product+variant merges into one line', () => {
  const store = createTestCart(); // fresh instance + memory storage
  store.getState().add({ productId: 'p1', variantId: 'v1', name: 'Waffle', unitPrice: 22000, stockQty: null });
  store.getState().add({ productId: 'p1', variantId: 'v1', name: 'Waffle', unitPrice: 22000, stockQty: null });
  const items = store.getState().items;
  expect(items).toHaveLength(1);
  expect(items[0].quantity).toBe(2);
});
```

### 2.5 `lib/services/checkout.ts` — `computeOrder` with a mocked `CheckoutDataSource`
Consumes `04-backend-api.md` §6.3.1–§6.3.4. `CheckoutDataSource` is injected → in-memory fixtures, no DB. This is where the **free-delivery threshold basis and zero-total edge** live (they are not in `discount.ts`).

#CaseAssertCO-01settings missing`STORE_CLOSED`CO-02`is_open=false``STORE_CLOSED`CO-03`ordering_enabled=false``ORDERING_DISABLED`CO-04delivery requested, `delivery_enabled=false``DELIVERY_UNAVAILABLE`CO-05pickup requested, `pickup_enabled=false``PICKUP_UNAVAILABLE`CO-06unknown / inactive product`PRODUCT_UNAVAILABLE` with `details.productId`CO-07variant missing / inactive / **belongs to a different product**`VARIANT_UNAVAILABLE` (cross-product swap defense)CO-08`stock_qty < quantity``INSUFFICIENT_STOCK` with `{requested, available}`CO-09`stock_qty = null`passes (unlimited)CO-10delivery below thresholdfee = `delivery_fee`CO-11**free-delivery threshold on pre-discount subtotal**gross ≥ threshold → `delivery = 0` even when discounts would bring net belowCO-12exactly at threshold`delivery = 0` (`>=`)CO-13pickup`delivery = 0` alwaysCO-14totals exact`subtotal = Σ lineSubtotal`; `discount = Σ lineDiscount`; `total = subtotal − discount + delivery`; never negativeCO-15**zero-total edge**100% offer + zero fee → `total = 0`, `discount = subtotal`CO-16duplicate productId across itemscomputed as separate lines (server mirrors cart lines)CO-17offers non-stacking per linebest-per-line chosen at actual quantity
---

## 3. Integration Test Plan (Vitest + Supabase local stack)
Runs against `supabase start` (Postgres + GoTrue + Inbucket) with migrations + seed applied via `supabase db reset`. Annotated `@integration`; skipped by default in the unit stage. Uses real clients: `lib/supabase/server.ts` (anon), `lib/supabase/admin.ts` (service role), and the raw Supabase JS client for direct SQL assertions.

### 3.1 RLS enforcement (mirrors the Supabase Expert's `verify-rls.sql`)
QA automates the checks from `06-supabase.md` §4 so they run in CI, not just the SQL editor.

#Test (pseudocode)ExpectedRL-01Query `pg_class.relrowsecurity` for the six tables`true` for allRL-02Query `pg_policies` for schema `public`only `SELECT` commands with `anon`/`authenticated` roles; zero INSERT/UPDATE/DELETE rowsRL-03**anon SELECT active-only**: as anon, `from('products').select()`, then same for inactive products / inactive parent categoryactive rows only; `count(is_active=false)=0`; product under hidden category hiddenRL-04anon SELECT offersactive AND within `[starts_at, ends_at]` window onlyRL-05anon SELECT `offer_products`only links whose offer is live and product is activeRL-06**anon negative writes**anon `insert`/`update`/`delete` on `categories`/`products`/`offers`/`offer_products` → error (RLS/permission)RL-07**service-role write round-trip**service role insert → select → delete (cleanup); succeedsRL-08`authenticated` (seeded admin) can still SELECT catalognon-emptyRL-09storage: `pg_policies` on `storage.objects`SELECT-only for anon; no write rows; anon `storage.upload` fails; public GET on a seeded object URL → 200The SQL above is consumed verbatim from `supabase/verify-rls.sql` (owned by Supabase Expert); QA wraps it in `test()` blocks via `pool.query` against the local DB, or shells out to `psql` when simpler. These tests **fail closed**: any policy drift breaks CI before merge.

### 3.2 Checkout endpoint recomputes totals server-side (tamper tests)
Direct `POST /api/checkout/whatsapp` against the built Next app or handler (via `app router` request). Seed a known catalog. **The client payload carries no prices** — every tamper attempt below must be rejected or overridden server-side.

#Tamper / scenarioSendExpectedCK-01Client sends a bogus `total` fieldpayload + `total: 1`Field ignored (schema strips unknown keys); response `total` equals server-computed valueCK-02Client sends a bogus `unitPrice`/`price` fielditems with extra price keysignored; server prices from DBCK-03**Stale price**: product `base_price` changed in DB after client snapshotitems reference old quantityresponse totals reflect the **current** DB priceCK-04Quantity above stock`quantity: 999``INSUFFICIENT_STOCK` 409, details `{requested, available}`CK-05Cross-product variant swap`variantId` of product B on product A's line`VARIANT_UNAVAILABLE`CK-06Inactive / unknown product idrandom uuid`PRODUCT_UNAVAILABLE`CK-07Offer window expired mid-testexpired offer in DB, items matchno discount applied; total without offerCK-08`ordering_enabled=false` set in DB immediately before POSTvalid payload`ORDERING_DISABLED` 409 (fresh read, not cached)CK-09`is_open=false`valid payload`STORE_CLOSED` 409CK-10delivery when `delivery_enabled=false`fulfilment `delivery``DELIVERY_UNAVAILABLE`; pickup path works if enabledCK-11**Freshness**: change `delivery_fee` in DB, then POSTno cache flushfee read live from DB (checkout never cached)CK-12**CRLF injection via note at API level**`note: "x\n&status=paid\n*TOTAL: ₹1*"`200; response `message` contains no newline in note; `waUrl` has no `&status=` paramCK-13Rate limit: 16 sequential POSTs same IP+phoneloop16th → `LIMIT_EXCEEDED` 429 + `Retry-After: 60` (in-memory store: assert within one worker)CK-14Double-tap: 4 rapid POSTs same phone+IPloopphone bucket (3/window) trips → 429CK-15Malformed JSON body`"{not json"``VALIDATION_ERROR` 400CK-16Response envelope shapeany valid/invalid POSTexactly `{data}` or `{error:{code,message,field?,details?}}`; error codes map to HTTP per §4 table (400/401/403/404/409/429/500)

```
// tests/integration/checkout-tamper.test.ts (sketch)
it('CK-03: server recomputes prices — stale client snapshot rejected', async () => {
  await setBasePrice('p1', 28900);                 // seed price
  const r1 = await postCheckout({ items: [{ productId: 'p1', quantity: 1 }] });
  await setBasePrice('p1', 50000);                 // change price (no revalidate call)
  const r2 = await postCheckout({ items: [{ productId: 'p1', quantity: 1 }] });
  expect(r2.data.total).toBe(50000);               // server authority, fresh read
  expect(r2.data.total).not.toBe(r1.data.total);
});
```

### 3.3 Revalidation behavior after admin mutation
#TestExpectedRV-01`GET /api/catalog` caches (tag `catalog`, revalidate 60)second call within TTL returns cached `generatedAt`RV-02Admin `PUT /api/admin/products/[id]` changes price → `revalidateCatalog()`next `GET /api/catalog` reflects new price within seconds (retry loop for stale-while-revalidate; assert eventual consistency)RV-03Admin toggles `is_active=false` on a productproduct disappears from catalog; `GET /api/products/[id]` → 404RV-04Admin toggles `is_open=false` in shop settingscatalog `shop.is_open=false`; checkout POST → `STORE_CLOSED` (fresh read bypasses cache)RV-05Admin creates an offeroffer + `bestOfferId` appear in catalogRV-06Admin deactivates offerstrikethrough `bestOfferId` disappears from catalogRV-07Upload alone does NOT revalidate`POST /api/admin/upload` → `generatedAt` unchanged until an entity saveRV-08Checkout never cachedrepeated POSTs always read live (assert via price-change test CK-11)
### 3.4 Envelope & error contract sweep (API contract tests)
#TestExpectedEN-01`GET /api/catalog` shape`{shop, categories, products, variantsByProduct, offers, generatedAt}`; ordering `sort_order` asc; active onlyEN-02`GET /api/products/[id]` for non-uuid / unknown / inactive id`NOT_FOUND` 404EN-03All admin routes without session`UNAUTHORIZED` 401 (also covered by auth matrix AM-07)EN-04Admin create → 201 `{data:{…}}`envelope + statusEN-05Admin `DELETE` category with products`CATEGORY_IN_USE` 409 (FK behavior per DB/Backend §7.1)EN-06Admin product delete → soft-delete`is_active=false` returned; catalog hides itEN-07Slug collision`SLUG_TAKEN` 409
---

## 4. End-to-End Test Plan (Playwright)

### 4.1 Setup

- `playwright.config.ts` projects: `chromium` (mobile, Pixel 5 profile), `chromium` (desktop, admin), `webkit` (iPhone, mobile), `firefox` (desktop smoke). Base URL `http://localhost:3000` locally, or the Vercel preview URL post-deploy.
- `webServer`: `npm run build && npm start` (production build) against the seeded local Supabase stack; `reuseExistingServer: !process.env.CI`.
- Per-test isolation: fresh browser context (`storageState` empty by default), unique test data (uuid-suffixed slugs), seeded catalog fixture applied per suite.
- Deterministic time: `page.clock` (Playwright) freezes `Date` for checkout tests so offer windows don't flap; seed offer windows relative to `now()`.
- A route that intercepts the `wa.me` navigation (`page.waitForEvent('popup')` or assert the `href`) — we never actually dial WhatsApp in CI; we assert the opened tab URL and message text.

### 4.2 Named storefront flows
#FlowSteps (condensed)AssertSF-01**Happy path (DoD journey)**home loads → tap category chip → filtered grid → offer carousel visible → add product (+variant where present) to cart → open cart → name + phone → `SEND ORDER ON WHATSAPP`POST succeeds; popup tab URL = `wa.me/<shop>?text=<encoded>`; decoded `text` contains the item line, variant, qty, totals, fulfilment, sanitized name/phone; no error stateSF-02Invalid phonecheckout with `"12"`inline field error; no popup; no POST successSF-03Store closedseed `is_open=false`storefront closed banner; checkout POST → `STORE_CLOSED` 409 surfaced as inline error; no popupSF-04Ordering disabledseed `ordering_enabled=false`paused state; POST → `ORDERING_DISABLED` 409SF-05Sold-out productproduct `stock_qty=1`, cart qty raised to 2 via stepperstepper disabled at max with "Max (n)" hint; POST → `INSUFFICIENT_STOCK` surfacedSF-06Empty cart checkoutopen cart with nothingEmptyState; CTA disabled / not shownSF-07**WhatsApp-not-installed fallback**intercept popup to not open; simulate "app didn't open" (no visibility change)success panel persists; **Copy message** writes clipboard (assert via `navigator.clipboard` mock); **Open web.whatsapp.com** href = `https://web.whatsapp.com/send?phone=<digits>&text=<encoded>`; **Done** clears cart and returns homeSF-08Anonymous storefront walkno cookies: `/`, `/category/<slug>`, `/product/<slug>`, `GET /api/catalog`, `POST /api/checkout/whatsapp`all 200/expected; never redirected to `/admin/login`SF-09Category filtertap category chipgrid filters; empty-category state renders `Nothing here right now`SF-10Offer visibilityseeded active offercarousel shows offer; product with `bestOfferId` shows strikethrough original + discounted priceSF-11Cart persistenceadd item → reload → open cartitem, qty, subtotal restored from `localStorage` (`cz.cart`); bar doesn't flash empty (hydration gate)SF-12Free-delivery boundary UXseed `delivery_fee=40.00`, `free_delivery_threshold=500.00`; cart subtotal below → checkout; then abovemessage shows `Delivery fee: ₹40.00` + upsell in first case; `FREE DELIVERY` in secondSF-13Pickup vs deliverytoggle fulfilmentdelivery shows fee/upsell line; pickup hides delivery line; `Order type: PICKUP` in messageSF-14**Negative authz (RLS surfaced)**from browser, `POST /api/admin/categories` with no session401 `UNAUTHORIZED` (per Supabase §4.7 checklist)SF-15Rate-limit UXPOST checkout 16× rapidly (API-level, via `request`)16th → 429 `LIMIT_EXCEEDED` + friendly message
### 4.3 Auth matrix — 12 scenarios (consumed verbatim from `07-auth.md` §6.2)
Run against the local stack with seeded admin (`auth.admin.createUser`, `enable_signup=false`) and Inbucket for magic links. Helper `scripts/get-magic-link.ts` (from `07-auth.md`) fetches the link from `http://localhost:54324`.

#ScenarioExpected (per `07-auth.md`)AM-01Happy path: login → dashboardlands on dashboard; shows admin emailAM-02Bad email (unknown)200 "Check your inbox" (no enumeration); no email in InbucketAM-03Malformed emailinline 400; no request to SupabaseAM-04Expired link`/admin/login?error=invalid_link`AM-05Replay of consumed linkfirst ok; second `invalid_link` (single-use)AM-06Direct `/admin` URL without sessionredirected to `/admin/login?next=/admin/dashboard`AM-07Direct admin API without session401 `{error:{code:'UNAUTHORIZED'}}`AM-08Sign-outcookies cleared; dashboard redirects to loginAM-09Anonymous storefront walkall public routes 200, no admin redirect (duplicate of SF-08, kept for matrix completeness)AM-10Anonymous admin write blocked401AM-11Same-origin redirect safetycallback `next=https://evil.com` → dashboard, never evil.comAM-12Refresh rotationreplay old refresh token → rejected (rotated)CI strategy follows `07-auth.md` §6.3: real magic-link flow for AM-01/02/04/05/11/12; `context.addCookies([...])` seeded session for AM-06/07/08/10 to skip email round-trips.

### 4.4 Admin CRUD → storefront reflection flows
#FlowStepsAssertAD-01Login → dashboardmagic linkdashboard loads, shows emailAD-02**Category CRUD**create category → toggle active → edit → (delete where safe)new category appears on storefront within seconds; deactivated disappears; slug behavior saneAD-03**Product CRUD (+variants)**create product with 2 variants → edit price → soft-deleteproduct appears with correct price/variant pricing on storefront; deleted product 404s publicly; catalog price updates (revalidation RV-02)AD-04**Offer CRUD**create scoped offer → edit discount → deactivatestrikethrough appears/disappears on storefront; checkout math reflects offerAD-05**Shop settings toggles**flip `is_open` and `ordering_enabled`storefront closed/paused banner appears within seconds; checkout blocked server-sideAD-06**Image upload**valid WebP/JPEG < 2MB → invalid type / > 2MBsuccess returns `publicUrl`; invalid shows friendly error; entity unchanged
### 4.5 Test-account & data strategy for e2e

- Admin seeded per run from the shared seed; e2e creates its own entities with uuid-suffixed slugs so parallel workers never collide.
- Storefront assertions use a **stable fixture catalog** (5 categories, 14 products, 2 variant groups, 3 offers from `0002_seed.sql`) — see §9.2.
- No test ever writes to a shared catalog between scenarios except via the admin API (which is itself under test) and cleanup is best-effort (soft-delete / unique slugs).

---

## 5. Cross-Device / Browser / Performance Matrix

### 5.1 Device & browser matrix
ProjectEngineViewport / deviceScopeNotesmobile-chromiumChromium412×915, DPR 2.625 (Pixel 5)Storefront full suite (SF-01…SF-15)primary mobile target; touch; emulated throttled network for perf runsmobile-webkitWebKit390×844, DPR 3 (iPhone 13)Storefront smoke + SF-01, SF-07, SF-11Safari engine coveragemobile-smallChromium320×568 (iPhone SE / small Android)SF-01, SF-09, SF-11smallest supported viewport: no horizontal scroll, CTA tap targets ≥ 44pxdesktop-chromiumChromium1440×900Admin full (AD-01…AD-06, AM-matrix) + storefront smokeadmin is desktop-firstdesktop-firefoxFirefox1280×800Storefront + admin smokeengine coveragedesktop-webkit-safariWebKit1280×800Storefront smokeSafari desktop
- **Safari** cannot run headless via Playwright on CI Linux; WebKit project covers the engine. Real-device Safari/VoiceOver is in the manual checklist (§7).
- Android real-device smoke (WhatsApp app handoff) is manual-only — CI cannot install WhatsApp.

### 5.2 Performance assertions (DoD §12 / PRD §5.1)
Measured with **Playwright + Web Vitals JS** (or Lighthouse CI) against the production build:

MetricBudgetToolingWhereLCP**< 2s** on mid-range phone, 4G throttledLighthouse CI (mobile preset) + `web-vitals` via `page.addInitScript`; CPU 4× slow, network `Slow 4G`storefront home + a product pageCLS< 0.1samehome / category / productINP< 200 msWeb Vitals `inp` in Chromium (with event-timing support)checkout interactions (open cart, add, submit)First Load JS< ~170 KB gzip (Frontend budget)`next build` analysis / Lighthousestorefront bundleRevalidation propagationstorefront reflects admin change **within seconds**e2e AD-02…AD-05 with a retry windowe2eTooling decisions:

- **Lighthouse CI** (`@lhci/cli`) runs the mobile preset against the preview URL in CI; budget assertions in `lighthouserc.json`; hard-fail gate on LCP/CLS for the launch; INP via a Playwright web-vitals collection script because Lighthouse CI's INP support is inconsistent.
- Perf budget test (fast, in e2e stage): `page.evaluate` reads `performance.getEntriesByType('navigation')` (LCP via `largest-contentful-paint` observer) on the throttled context and asserts the 2s budget with the seeded fixture catalog.
- Image assertions: `next/image` uses `webp`/responsive sizes; no layout shift from un-dimensioned images (CLS guard).

---

## 6. Accessibility (WCAG AA) + Visual Regression

### 6.1 Accessibility checklist (WCAG 2.1 AA) — automated + manual
Automated (run as an e2e project using `@axe-core/playwright` on every storefront route + admin routes, logged in):

CheckCriterionToolNo critical/serious axe violations1.1.1, 1.3.1, 2.1.1, 4.1.2axe-core on `/`, `/category/*`, `/product/*`, cart/checkout, success panel, admin login/dashboardForm errors programmatically associated1.3.1, 3.3.1, 3.3.2axe + manual `aria-describedby`/`aria-invalid` assertion on checkout fieldsIcon-only controls have accessible names1.1.1, 4.1.2axe (`aria-label` on steppers, cart bar, chips)Focus visible + logical tab order2.4.7, 2.4.3Playwright `page.keyboard` tab-through on cart + checkoutDialog/Sheet focus trap + restore2.1.2, 2.4.3open CartSheet, tab-cycle stays inside; focus returns to trigger on closeTouch targets ≥ 44px2.5.5 (AAA, but targeted)Playwright bounding-box assertions on all interactive controlsColor contrast AA on text incl. WhatsApp CTA1.4.3axe color-contrast rule; CTA uses the darkened `whatsapp-600` family (UX §10)Non-color affordances (offer badges have text)1.4.1axe + visual checkReduced motion respected2.3.3context with `reducedMotion: 'reduce'`; assert no scale/bounce animation on stepper/cartHeading/landmark order + language1.3.1, 2.4.6, 3.1.1axe + manualManual (release gate, §7): NVDA (Windows/Edge) + VoiceOver (Safari, real device) walk of add-to-cart and checkout; keyboard-only end-to-end checkout; screen-reader read of success panel.

### 6.2 Visual regression approach

- Tool: Playwright `toHaveScreenshot` (built-in, per-project golden files) — no extra SaaS dependency in MVP; Percy/Argos is a drop-in if pixel volume grows.
- **Scope:** storefront `/`, one category page, one product sheet, cart sheet open, checkout form, success panel; admin login + dashboard + one list (products).
- **Stability controls (anti-flake):**

- Disable animations via `page.emulateMedia({ reducedMotion: 'reduce' })` + Framer Motion `MotionConfig` reduced path; freeze hover states.
- Deterministic data: same seeded catalog per run (§9.2); no time-of-day, no live offers expiring mid-run.
- Mask dynamic regions: `cart` count badge, generatedAt, toasts, date strings; wait for images/fonts (`document.fonts.ready`) before capture.
- Golden sets are **per browser engine** (mobile-chromium / mobile-webkit / desktop-chromium); pixel threshold 1–2% to absorb antialiasing; `maxDiffPixels` tuned per set.
- **When they run:** visual project in e2e stage on PRs touching UI; the two browser engines minimum (not Firefox, to keep runtime bounded).

---

## 7. Manual QA Checklist — Release Gate (mapped to DoD §12)
Gate: all automated tiers green **plus** the following scripted manual pass before MVP launch. Each row maps to the locked Definition of Done.

#DoD §12 itemManual storefront stepsManual admin stepsPassM1Storefront loads < 2s LCP on mid-range phoneReal mid-range Android (Moto G / Pixel 6a) on 4G; measure with Lighthouse mobile—[ ]M2Browse → category → offers → add to cart → name+phone → WhatsApp opens, < 60 sFull journey on real device with WhatsApp installed; confirm the exact draft opens—[ ]M3WhatsApp message correct (items, variants, qty, totals, offers, delivery, sanitized fields)Send a real order; verify message verbatim against the template; try a name/note with `\n`, emoji, `&` in a second order—[ ]M4Admin CRUD all four entities; open/ordering toggles; storefront updates within secondsWatch storefront live while a second person editsCRUD a category, product+variant, offer, and settings; toggle open/ordering; reorder items[ ]M5No customer data storedAfter several real checkouts, inspect DB (`shop_settings`, `categories`, `products`, `offers`, `offer_products` + `auth.users`)Confirm only shop data + the admin identity exist; no order/customer rows[ ]M6All admin routes/mutations auth-guarded; RLS enforcedTry `/admin/*` and `/api/admin/*` logged out → redirected / 401; confirm `verify-rls.sql` green—[ ]M7Server is the price authorityIntercept/modify the checkout request (DevTools), send fake total/price/quantityConfirm rejected or overridden with typed errors[ ]M8Store closed / paused statesFlip toggles from admin; load storefront; attempt checkoutToggle from dashboard[ ]M9Offline tolerance (cart persists)Add items, reload, close tab, reopen — cart intact; checkout offline shows "reconnect" copy—[ ]M10SEO/social basicsShare a product URL in a chat → OG card renders; open `/sitemap.xml`; confirm admin is `noindex`—[ ]M11Accessibility smokeKeyboard-only checkout; NVDA (Windows) + VoiceOver (iPhone) read-through; AA contrast spot-check on CTAKeyboard-only admin CRUD[ ]M12WhatsApp-not-installed / app-missing fallbackOn a device without WhatsApp: checkout → copy message works → web.whatsapp.com link opens the draft—[ ]M13Cross-device matrixReal-device pass: iPhone (Safari), Android (Chrome), desktop (Firefox, Safari, Chrome) storefront + admin—[ ]M14Visual/UX sign-offDesign review against wireframes (brown/gold/cream, WhatsApp-green only on the CTA)Design review of admin[ ]Sign-off: QA lead initials + PM initials per row; the release is blocked on any [ ].

---

## 8. CI Integration

### 8.1 Pipeline stages (one workflow, gate order)
StageWhat runsStackGate1. static`npm run lint`, `tsc --noEmit`, guard-import scan (`server-only` never in client bundles — auth `07-auth.md` §4.3)noneevery PR2. unitVitest (`unit` project), `--coverage`, no stacknoneevery PR3. integration`supabase start` + `supabase db reset` (migrations + seed) + Vitest (`integration` project) incl. RLS mirrorSupabase local stack (Postgres + GoTrue + Inbucket)every PR (faster subsets on PR, full on merge)4. e2e-local`next build && next start` + Playwright (all projects incl. a11y/visual/perf) against `http://localhost:3000`Supabase local stackmerge / release5. build+deployVercel build + preview deployment (DevOps)Vercel + Supabase preview branchmerge6. e2e-previewPlaywright **smoke suite** (SF-01, SF-07, SF-08, AD-01/02/05, AM-06/07, perf LCP) against the **Vercel preview URL**Supabase preview envpost-deploy, before merge of preview7. release gatemanual checklist §7 + Lighthouse CI full mobile runprod/staging SupabasereleasePlaywright against Vercel preview: the smoke suite is the same `playwright.config.ts` with `PLAYWRIGHT_BASE_URL` pointed at the preview URL and `storageState` seeded via the preview Supabase branch; the auth flows use the preview project's magic-link (Inbucket is only for local — preview uses a throwaway preview email + real inbox or a seeded session cookie per `07-auth.md` §6.3).

### 8.2 Flakiness controls (locked)

1. **Test isolation:** fresh browser context per test; fresh cart/localStorage; each test creates its own rows (uuid slugs); no cross-test shared catalog mutation.
2. **Retries:** CI retries 2× (only stable, real-failure-punishing flake policy); 0 retries locally so devs see truth; `retry` annotation on known-timing-sensitive perf/a11y tests.
3. **Deterministic time:** unit uses `vi.useFakeTimers`; e2e uses `page.clock` (offer windows, closed-state toggles); seed offer `starts_at`/`ends_at` relative to `now()`.
4. **No arbitrary sleeps:** all waits are `expect(...).toBeVisible()`/`waitForResponse`/`waitForEvent('popup')` with actionability built in; a lint rule bans `waitForTimeout` except in the WhatsApp-app-detect heuristic test (SF-07, which legitimately waits ~1.5 s).
5. **Animations off** in test contexts (`reducedMotion: 'reduce'` + MotionConfig) — both for screenshots and for speed.
6. **webServer:** `reuseExistingServer: !CI`; CI always boots fresh; port conflicts avoided via fixed 3000 with health-check wait.
7. **Rate-limit tests** run only in the integration tier against the local stack (deterministic in-memory counter), never against shared previews.
8. **Order independence:** suites shuffle-safe; each names its own data.
9. **Network stubbing:** Supabase storage image fetches stubbed in perf/visual tests so external latency never breaks budgets.

### 8.3 Artifacts & reporting

- Playwright HTML report + per-failure `trace.zip`, screenshot, and video (webm) — uploaded as CI artifacts, retained 14 days.
- Vitest: JUnit XML for the CI dashboard; Istanbul/V8 coverage report (thresholds: `statements ≥ 80%`, `branches ≥ 75%`, `lines ≥ 80%`, `functions ≥ 80%` on `lib/pricing/*`, `lib/validation/*`, `lib/whatsapp/*`, `stores/cart.ts`; service/routes are covered by integration/e2e and excluded from unit coverage).
- Lighthouse CI JSON report on the preview URL (LCP/CLS/INP budgets) attached to the deploy check.
- `supabase` migration apply logs + `verify-rls` SQL run log in the integration stage output.
- A failing stage uploads its report **and marks the deploy check failed** — no merging with red perf/security gates.

---

## 9. Environments & Data Strategy

### 9.1 Environments
EnvNext.jsSupabasePurposeNever used forlocal`next dev` (dev) / `next start` (prod build for perf)`supabase start` (Postgres + GoTrue + Inbucket), migrated + seededdeveloper loop, unit/integration/e2e—CI`next build && next start`throwaway `supabase start` per joball automated tiersprod credentialspreviewVercel preview deploylinked Supabase **preview branch** (schema from migrations, `0002_seed.sql` data)post-deploy smoke + perf + manual review links—prodVercel productionprod project (migrations only; no demo seed)releaseany test write
### 9.2 Seeding determinism

- **Source of truth:** `supabase/migrations/0002_seed.sql` (Database Engineer) — fixed IDs (`shop_settings id=…001`), stable slugs, fixed prices, 14 products, 2 variant groups, 3 offers. Applied automatically by `supabase db reset` / `supabase start`, so **local, CI, and preview** start byte-identical.
- **Time-dependent seed fields** (offer windows) are expressed relative to `now()` so the fixture is always "live"; tests that need an expired/not-started offer create their own window explicitly.
- **Test-created data** uses uuid-suffixed slugs/names (`waffle-test-${uuid}`) so parallel workers and repeated runs never collide and never depend on cleanup order.
- **Rate/limit tests** use dedicated fixtures and are self-cleaning (soft-delete or in-memory counters).

### 9.3 Test-data isolation from prod (hard rules)

1. **No automated suite ever targets prod.** Env vars for tests are injected per stage; a guard in the Playwright config and Vitest setup throws if `NEXT_PUBLIC_SUPABASE_URL` points at the production project ref during a test run.
2. **Prod DB never runs **`0002_seed.sql`**.** Seed-as-migration is applied to preview/staging only; prod migrations are `0001_init` + schema-only follow-ups. If demo data is ever wanted in prod, it is an explicit, approved step.
3. **No customer PII anywhere.** Tests use fake names/phones (`Priya Sharma`, `+919876543210`), never real data; analytics/Plausible is disabled or pointed at a test endpoint in test environments.
4. **Checkout writes nothing** (architecture lock), so even a test that "completes checkout" leaves zero rows — the strongest possible isolation.
5. **Storage:** test uploads go to a `test-uploads` subpath or are cleaned after the suite; prod buckets are never written by tests.
6. **Service-role key** is present only in server env for CI/preview; never in browser bundles; the e2e suite reaches the service role only through the seeded admin session and admin API (never directly), mirroring the real attack surface.

---

## 10. Inputs Needed (from other agents)
FromNeededQA uses it for**WhatsApp Integration Expert**Final builder fixture set (worked examples from `08-whatsapp.md` §6.2/§6.3), confirm `waUrl`/`web.whatsapp.com` shapes and the `orderTime` decisionWM snapshot fixtures, SF-01/SF-07 assertions**Backend Developer**Confirm `sanitizeText` escape-flag behavior (builder consumes unescaped), `orderTime` label, final error-message strings, `Retry-After` header shapeVS/SZ unit cases, CK error assertions, message-content assertions**Auth Specialist**Final `requireAdmin` signature, session cookie name, Inbucket port, seeded-admin instructions, magic-link expiry configAM-01…AM-12 harness, admin e2e login**Database Engineer**`0002_seed.sql` final content (IDs/slugs/prices/offers), FK delete semantics, `verify-rls.sql` locationRL tests, RV revalidation tests, stable e2e fixture catalog**Supabase Expert**Confirmed signed-upload TTL and storage policy verification, `supabase start` version/pinning for CI, anon-write behavioral checkRL-09, AD-06 upload flows, CI stage 3**Frontend Developer**Bundle budget number, cart `stockQty` clamp semantics confirmations, `MotionConfig` reduced-motion hookup, WhatsApp-not-installed heuristic scopeCT tests, SF-05/SF-07, perf budget, visual anti-flake**UX Designer**Final AA hex for the WhatsApp CTA, touch-target spec, success-panel copya11y checks, M11/M14**PM**Free-delivery basis confirmation (pre-discount assumed), fixed-discount semantics, phone country-code decisionCO-10…CO-13, WM-03…WM-06 fixtures**DevOps Engineer**CI runner YAML, Vercel preview URL env injection, Inbucket availability on the runner, artifact retention, Redis/rate-limit backing store choicestage wiring, CK-13/Rate tests, preview e2e
## 11. Deferred

- **Real-device WhatsApp handoff automation** (app-opening on Android/iOS) — manual-only in MVP (§7 M2/M12); a device farm (BrowserStack) is a V1.1 candidate.
- **Visual regression on all three engines + Firefox** — MVP runs 2 engines; Firefox visual is deferred to keep CI runtime bounded.
- **Full INP budget enforcement in Lighthouse CI** — MVP: INP measured via Playwright web-vitals; LHCI INP assertion lands when LHCI supports it stably.
- **Perf budgets for admin pages** (admin is desktop-first; only storefront is launch-gated).
- **Fault-injection testing** (Supabase outage, Vercel cold start) — MVP relies on graceful-degradation manual checks (M8, M12); chaos suite deferred.
- **Security scanning / dependency CVEs** (npm audit / SCA) — owned by DevOps; QA consumes findings, does not author the tooling.
- **V2 WhatsApp Cloud API path** — the builder contract is already tested (WM suite) so the V2 gateway only needs a transport test when it exists.

---

## 12. Revisions & Compliance
RevDateAuthorChangev12026-08-04QA EngineerInitial strategy from locked `ARCHITECTURE.md` v1; consumes `04/05/06/07/08` contracts
- **Compliance:** no contradiction with the locked architecture. This document only adds test organization (tiers, fixtures, CI stages, checklists) and flags inputs in §10. Where a contract was ambiguous for testing (free-delivery basis, builder input shape, `sanitizeText` escape mode), it is flagged — not silently assumed — and the owning agent's decision is consumed here.
