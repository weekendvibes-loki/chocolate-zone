# Chocolate Zone — Product Requirements Document (PRD)
**Product**Chocolate Zone — premium dessert ordering platform**Document**`01-pm-prd.md`**Owner**Product Manager**Status**DRAFT v1 (for merged project plan)**Baseline**`docs/ARCHITECTURE.md` v1 (locked contract)**Scope**WHAT to build (product). Not UI/UX, code architecture, or DB schema.
> **Compliance note:** This PRD extends the locked architecture contract. It does not
> contradict the stack, data model, API surface, auth model, storage, WhatsApp flow,
> folder structure, or security model. Where this PRD needs details owned by another
> agent (UX, Frontend, Backend, DB, Supabase, Auth, WhatsApp, DevOps, QA), they are
> listed under **Inputs needed** — never invented here.

---

## 1. Executive Summary & Product Vision

### 1.1 Executive summary
Chocolate Zone is a **premium dessert ordering platform** for waffles, brownies, cakes,
chocolates, and beverages. It serves two audiences:

1. **Customers** — a mobile-first storefront where they browse, configure, and order
desserts in under 60 seconds.
2. **The shop owner** — an admin dashboard to manage everything that defines the menu
(categories, products, offers) and how the shop operates (open/closed, ordering
on/off, delivery settings, WhatsApp number).
The product is deliberately built around **zero friction and zero registration**:

- **No customer login, accounts, or order history.** The customer is a guest, always.
- **Checkout = Name + Phone.** That is the entire form. No email, no password,
no address capture, no payment.
- **WhatsApp is the order channel.** On submit, the platform validates and
server-recomputes the order, builds a pre-filled WhatsApp message, and opens it in
the shop's WhatsApp chat for a one-tap send.
- **The database stores only shop data** (categories, products, offers, shop
settings). No customers. No orders. Privacy by design.

### 1.2 Product vision

> **Every hungry customer is one tap away from a dessert, and the shop receives every
> order as a ready-to-send WhatsApp message — no apps, no accounts, no friction.**
The platform treats WhatsApp as the "transaction system." The storefront removes every
barrier between craving and order: browse visually, add in two taps, type a name and a
phone number, and hand off a perfectly formatted order to WhatsApp. The shop keeps full
control of its catalog and operating state in real time, and the storefront reflects
those changes within seconds.

### 1.3 Guiding principles

1. **Guests, not members.** Every visitor is anonymous. Everything must work without
   sign-in; nothing may ever require it.
2. **WhatsApp-first checkout.** The order is a message. The platform's job is to make
   that message complete, correct, and un-editable-by-accident.
3. **Shop data only.** Persist exactly four things: categories, products, offers,
   shop settings. If it is not one of those, it does not touch the database.
4. **Trust the server.** All prices, offers, availability, and the WhatsApp message are
   computed server-side. The client may *propose*; the server *decides*.
5. **Mobile is the primary experience.** Desktop is supported but never the target.

---

## 2. Problem Statement & Personas

### 2.1 Problem statement
Small dessert shops live and die on WhatsApp ordering, but today the flow is manual:

- Customers must **remember the menu** or scroll a static image, then **type a freeform
  message** with product names, sizes, quantities, and their own phone number.
- The shop owner answers **dozens of inconsistent messages**, re-asks for missing
details (size? pickup or delivery?), and manually recomputes totals and offers.
- There is **no structured menu, no pricing transparency, no offer visibility, and no
  way to communicate "we're closed" or "ordering paused"** without posting a story.
Expensive alternatives (POS apps, full e-commerce with accounts and payments) are
overkill, rejected by customers who do not want another account, and fail because the
shop's real channel is already WhatsApp.

**Chocolate Zone's core problem to solve:** turn a messy, manual WhatsApp ordering
habit into a structured, zero-friction, store-owned experience — while keeping
WhatsApp as the single order channel and keeping all customer data out of the system.

### 2.2 Personas

#### Persona 1 — "Riya", the impulse buyer (customer)

- **Profile:** 22–34, smartphone-only, uses Instagram/WhatsApp constantly, orders
dessert for herself and for friends on weekends.
- **Goals:** See what looks good, know the price, customize (size/topping), and order
  in under a minute without creating an account.
- **Pain points:** Manual WhatsApp menus are chaotic; sending a freeform order is
  error-prone; she abandons when she must call or wait for the shop to reply to confirm.
- **How Chocolate Zone serves her:** visual mobile menu, clear prices and add-ons,
  two-tap add-to-cart, Name + Phone only, and a pre-filled WhatsApp message she just
  sends.

#### Persona 2 — "Sameer", the shop owner/operator (customer of the admin)

- **Profile:** 28–45, runs the dessert shop with a small team, answers WhatsApp
  messages personally on one number, not technical.
- **Goals:** Keep the menu accurate and appetizing, run offers, and control
  open/ordering state — without a support ticket or a developer.
- **Pain points:** Receives malformed orders; cannot tell customers the shop is closed;
  cannot swap menu items or update prices quickly; has no idea which offers get used.
- **How Chocolate Zone serves him:** a simple dashboard to manage categories,
  products, offers, and shop settings; instant propagation to the storefront; every
  incoming order arrives as a clean, consistent WhatsApp message with totals already
  computed.

#### Persona 3 — "Dev", the shop's WhatsApp operator (secondary)

- **Profile:** part-time staffer who confirms and fulfills orders on the shop phone.
- **Goals:** Read each incoming order fast, see the customer's phone, verify pickup
  vs delivery, and reply "confirm" quickly.
- **How Chocolate Zone serves him:** one structured message per order with line items,
  variant choices, totals, pickup/delivery flag, and the customer's phone — no
  back-and-forth needed to parse it.

---

## 3. Feature Set by Phase & Priority
Priorities: **P0** = must ship for MVP / blocks launch. **P1** = should ship for MVP,
small schedule slips acceptable. **P2** = can be deferred to a point release within the
same phase without breaking the core loop.

### 3.1 Phase: MVP

#### Storefront (public, anonymous)
IDFeaturePrioritySTF-1Full menu browse: hero, offer carousel, product grid by category, all server-rendered (SSR + ISR)P0STF-2Category filtering via category chips / per-category viewsP0STF-3Product detail with **variants** (e.g., Size) and **add-ons** (extras with price deltas)P0STF-4Dynamic **offers section** (active offers from DB, e.g., % or fixed discount)P0STF-5Add to cart with quantity stepper; cart persists across refresh/close (localStorage)P0STF-6Cart sheet with line items, live total, offer discounts, and qty edit/removeP0STF-7Floating cart bar (mobile) with running total and "Checkout"P0STF-8Checkout: **Name + Phone** only, fulfilment = **pickup or delivery**, optional noteP0STF-9WhatsApp order generation: server-validated message + `wa.me` deep linkP0STF-10Success state with copy-to-clipboard fallback and `web.whatsapp.com` linkP0STF-11**Store closed / ordering paused** state: informative, non-blocking, cart preservedP0STF-12Delivery fee + free-delivery threshold shown and applied when delivery selectedP0STF-13Product availability: hidden or clearly marked when inactive / out-of-stockP1STF-14Announcement banner from shop settingsP1

#### Admin (protected, single admin)
IDFeaturePriorityADM-1Magic-link login (passwordless), admin-onlyP0ADM-2Category CRUD (name, slug, emoji, image, sort order, active)P0ADM-3Product CRUD (name, description, base price, image, category, featured, veg flag, stock, sort, active)P0ADM-4Product variant CRUD (name/option/price delta) nested under a productP0ADM-5Offer CRUD (title, description, image, % or fixed, scope all/selected products, dates, active, sort)P0ADM-6Shop settings CRUD (brand, logo, currency, WhatsApp number, address, timings, delivery fee, free-delivery threshold, delivery/pickup enabled, open/ordering toggles, announcement)P0ADM-7**Open / ordering toggles** surfaced prominently in the dashboardP0ADM-8Image upload (signed URL flow, WebP re-encode client-side)P0ADM-9Catalog revalidation: every mutation propagates to storefront within secondsP0ADM-10Admin dashboard overview (counts, quick toggles)P1ADM-11Simple validation feedback + typed errors on all admin formsP1

#### Foundation
IDFeaturePriorityFND-1Supabase project (Postgres + Auth + Storage), env/secrets, Vercel deployP0FND-2Auth middleware + server-side session guards on all `/admin/*` and `/api/admin/*`P0FND-3RLS: anon SELECT-only on public reads; writes service-role onlyP0FND-4`/api/catalog` aggregate endpoint + ISR with `revalidateTag('catalog')`P0FND-5Server-side pricing + offer math; server-built WhatsApp messageP0FND-6Input sanitization (CRLF/control-char strip, HTML-escape) on checkoutP0FND-7Privacy-friendly analytics (Plausible) with structured eventsP1FND-8Seed data script (demo categories, products, offers, settings)P1

### 3.2 Phase: V1.1 (post-launch hardening, ~30–60 days)
IDFeaturePriorityV11-1Admin analytics view (KPIs from §7, no customer PII)P1V11-2Offer date countdown / "ends soon" urgency treatment on storefrontP1V11-3In-stock indicator + "sold out" treatment driven by `stock_qty`P1V11-4Featured/sort curation controls (featured-first ordering)P2V11-5Offline cart restore toast + clearer persistence messagingP2V11-6Error-rate monitoring (Sentry) + alertingP2V11-7Admin bulk quick-actions (deactivate products, reorder)P2V11-8WhatsApp message preview in admin settings (test the shop number)P2
V11-1**Note on accounts:** V2 features keep the **no-customer-account** constraint.
Re-order and loyalty use local storage and phone-only matching respectively.

### 3.3 Phase: V2 (growth, 90+ days)
IDFeaturePriorityV2-1**Quick re-order**: persist last order *locally* (no account) to re-send via WhatsApp in 2 tapsP1V2-2"Order for later" pickup/delivery time slot noteP1V2-3Loyalty stamp card **linked to phone number only** (no account; tally kept by shop, not DB)P2V2-4Multi-branch / multi-shop support (settings become per-branch)P2V2-5Advanced offers (BOGO, bundle, min-quantity)P2V2-6PWA install prompt + improved offline (skeleton storefront cache)P2V2-7Menu sharing cards (product-level OG cards optimized for WhatsApp/Instagram sharing)P2V2-8UTM/QR code campaign tracking on menu linksP2
> **Note on accounts:** V2 features keep the **no-customer-account** constraint.
> Re-order and loyalty use local storage and phone-only matching respectively.

---

## 4. User Stories & Acceptance Criteria (Given / When / Then)
Format: `[ID] As <actor>, I want <capability>, so that <benefit>.`

### 4.1 Browse menu
**US-01** As a customer, I want to see the whole menu in one scroll, so that I can decide quickly.

- **Given** the shop is open and I open the storefront, **when** the page loads,
  **then** I see the hero, the offers section, and a product grid grouped by category,
  and the page is fully interactive within 2s LCP on a mid-range phone.
- **Given** the catalog changed in the admin (new product / price edit), **when**
  the storefront is re-fetched or revalidated, **then** the change appears within
  seconds without a full redeploy.
- **Given** a product is inactive, **when** the storefront loads, **then** that product
  is not shown to customers.

### 4.2 Category filtering
**US-02** As a customer, I want to filter the menu by category, so that I can find waffles
without scrolling past cakes.

- **Given** I am on the storefront, **when** I tap a category chip (e.g., "Waffles"),
  **then** the grid filters to that category and the URL reflects the selection so it
  is shareable.
- **Given** I tap "All", **when** the filter applies, **then** the full menu returns.
- **Given** a category is inactive or has no active products, **when** I browse,
  **then** it is not shown as a filter option.
- **Given** I am on a category page with no products, **when** it renders,
  **then** a friendly empty state is shown instead of a broken page.

### 4.3 Dynamic offers section
**US-03** As a customer, I want to see active offers, so that I can save money without asking.

- **Given** there are active offers configured in the admin, **when** the storefront
  loads, **then** they appear in a dedicated offers section with title, description,
  and any scope.
- **Given** an offer is percentage-based, **when** I add a scoped product to the cart,
  **then** the discount is computed and shown at cart and checkout, and the server
  confirms the same total.
- **Given** an offer has `starts_at`/`ends_at`, **when** it is outside its window or
  `is_active=false`, **then** it is hidden from the storefront and **not** applied.
- **Given** an offer applies to selected products only, **when** a non-scoped product
  is in the cart, **then** the discount applies only to scoped line items.
- **Given** multiple offers exist, **when** I view a product, **then** the best
  applicable offer is reflected in its displayed price.

### 4.4 Product variants & add-ons
**US-04** As a customer, I want to choose a size (variant) and extra toppings (add-ons), so
that my order matches what I actually want.

- **Given** a product has variants (e.g., Small/Large), **when** I open its sheet,
  **then** each variant is selectable and shows its correct price delta.
- **Given** a product has add-ons, **when** I configure it, **then** I can add multiple
  add-ons and each adds to the line total.
- **Given** I select a variant with `is_active=false`, **when** I view the product,
  **then** that variant is not offered.
- **Given** a variant/add-on change, **when** I confirm, **then** the cart line total
  and the running cart total update immediately.
- **Given** a product is out of stock (`stock_qty = 0`), **when** I view it,
  **then** I cannot add it to the cart and it is clearly marked.

### 4.5 Add to cart
**US-05** As a customer, I want to add items and adjust quantities, so that my cart matches
my order.

- **Given** I have configured a product, **when** I tap "Add to cart",
  **then** it appears in the cart sheet with variant/add-on breakdown, unit price, and
  quantity, and the floating cart bar shows the new total.
- **Given** I want more of an item, **when** I tap the quantity stepper,
  **then** the quantity and totals update and the change persists.
- **Given** I close the browser or app, **when** I return,
  **then** my cart is restored (localStorage) with totals intact.
- **Given** I want to remove something, **when** I remove it,
  **then** the line item disappears and the total is recomputed.
- **Given** the cart is empty, **when** I view the cart sheet, **then** an empty state
  with a prompt to browse is shown.

### 4.6 Name + Phone checkout
**US-06** As a customer, I want to check out with only my name and phone, so that I can
order without creating an account.

- **Given** I tap "Checkout", **when** the form opens, **then** the only required
  fields are Name and Phone, with an optional note and a delivery/pickup choice.
- **Given** I submit an empty name, **when** the form validates,
  **then** a clear inline error is shown and nothing is sent.
- **Given** I submit an invalid phone number, **when** the form validates,
  **then** an inline error is shown for the phone format.
- **Given** my cart is empty, **when** I attempt checkout,
  **then** I am prevented from submitting and prompted to add items.
- **Given** the order payload is valid, **when** I submit,
  **then** the server recomputes totals and returns a success response — no account, no order stored.

### 4.7 WhatsApp order generation
**US-07** As a customer, I want my order to open in WhatsApp pre-filled, so that I can send
it to the shop with one tap.

- **Given** I submit a valid checkout, **when** the response arrives,
  **then** a correctly formatted order message (line items, variants, quantities,
  totals, delivery/pickup, note, my name/phone) opens in WhatsApp via `wa.me`.
- **Given** the WhatsApp app is unavailable, **when** the link fails,
  **then** I see the full message text with a copy button and a `web.whatsapp.com`
  fallback link.
- **Given** the customer enters a phone, **when** the message is built,
  **then** the phone appears in the message so the shop can call back — and it is
  **not** stored server-side.
- **Given** the shop's WhatsApp number changes in settings, **when** I checkout,
  **then** the message goes to the *current* number.
- **Given** I tamper with prices client-side, **when** the server validates,
  **then** the server recomputes authoritative totals and refuses invalid payloads with
  a typed error.

### 4.8 Pickup vs delivery
**US-08** As a customer, I want to choose pickup or delivery, so that my order is set up the
way I need it.

- **Given** both are enabled in settings, **when** I check out, **then** I can choose
  either, and the message includes the chosen option.
- **Given** delivery is selected and enabled, **when** the total is computed,
  **then** the delivery fee is added, unless the subtotal meets the free-delivery
  threshold (then it is waived and shown).
- **Given** delivery is disabled in settings, **when** I check out,
  **then** delivery is not offered, and the message only supports pickup.
- **Given** pickup is selected, **when** the message is built,
  **then** the shop's address/timings (from settings) are referenced so the customer knows where/when.

### 4.9 Store closed state
**US-09** As a customer, I want to know when the shop is closed or not taking orders, so
that I am not left waiting for a reply.

- **Given** the shop is closed (`is_open=false`), **when** I open the storefront,
  **then** a clear "We're closed" state is shown with timings from settings, and I can
  still browse the menu.
- **Given** the shop is open but ordering is paused (`ordering_enabled=false`), **when** I open the storefront,
  **then** I can browse but the checkout/order path is blocked with an explanation.
- **Given** I have items in my cart, **when** the shop closes or pauses ordering,
  **then** my cart is preserved and a notice appears; it is **not** silently cleared.
- **Given** I attempt checkout while closed or paused, **when** I submit,
  **then** the server rejects with a typed error and the UI explains why.

### 4.10 Admin: category / product / offer / shop-settings CRUD
**US-10** As the shop owner, I want full CRUD over categories, products, offers, and shop
settings, so that my menu is always accurate.

- **Given** I am an authenticated admin, **when** I create a category, **then** it
  appears in the category list and storefront within seconds of save.
- **Given** I edit a product's price, **when** I save, **then** the storefront shows
  the new price after revalidation, and future checkout uses the new price.
- **Given** I create an offer with a date window, **when** I save,
  **then** it is active only within the window and applies server-side.
- **Given** I edit shop settings (e.g., WhatsApp number, delivery fee), **when** I
  save, **then** they take effect on the next storefront render and checkout.
- **Given** I submit a form with invalid data (e.g., negative price), **when** the
  request validates, **then** I get a typed error and the data is not saved.
- **Given** I have no session, **when** I hit any `/api/admin/*` or admin page,
  **then** I am redirected to login or receive 401.

### 4.11 Admin: open / ordering toggles
**US-11** As the shop owner, I want to flip open/ordering toggles, so that I can control
order intake without touching code.

- **Given** I toggle "open" off, **when** I save, **then** the storefront shows the
  closed state within seconds.
- **Given** I toggle "ordering" off while open, **when** I save, **then** browsing
  stays available but checkout is blocked.
- **Given** the toggles are flipped, **when** a customer has an in-flight checkout,
  **then** the server enforces the state at submission time (client UI is a
  convenience, not the guard).

### 4.12 Admin: image upload
**US-12** As the shop owner, I want to upload images for products, offers, and categories,
so that the menu looks appetizing.

- **Given** I select an image file, **when** I submit it, **then** it is re-encoded to
  WebP client-side, uploaded via a signed URL, and a public URL is saved to the entity.
- **Given** the file is too large or wrong type, **when** I upload,
  **then** I receive a friendly error and the entity is unchanged.
- **Given** I update an image, **when** I save, **then** the storefront serves the new
  image through an approved remote pattern.

---

## 5. Non-Functional Requirements

### 5.1 Performance (mobile-first)
MetricTargetNotesLCP**< 2s** on a mid-range phone (4G, throttled)Locked by ARCHITECTURE.md §12; primary launch gateCLS< 0.1Reserve space for images, cart bar, sheetsINP< 200ms on mid-range deviceInteractive checkout pathTTI / First Load JSbudgeted by Frontend (target < ~170 KB gzip client JS)Set by Frontend; storefront is RSC-heavyRevalidation propagationstorefront reflects admin changes in **seconds**`revalidateTag('catalog')` per contractImage strategyWebP, responsive `next/image`, lazy-load below the foldper contract §8

### 5.2 Availability & resilience

- Target **99.9%** storefront availability on Vercel.
- **Graceful degradation** on Supabase outage: storefront error/retry state without
  crash; checkout returns a typed error the UI can explain.
- **WhatsApp outage / app missing:** checkout flow never hard-depends on the WhatsApp
  app — copy fallback + `web.whatsapp.com` always available (US-07).
- Monitoring: Vercel logs, Plausible for product events; Sentry optional (V1.1-6).

### 5.3 Offline tolerance (cart persistence)

- Cart lives in **localStorage** (Zustand persist per contract §4) — survives refresh,
  tab close, and brief offline periods.
- Offline behavior on load: cart restores with correct totals; checkout requires
  connectivity (server validation) and shows a clear "reconnect to order" state.
- V1.1: offline-restore toast so users understand their cart persisted (V11-5).

### 5.4 SEO & social sharing

- Product and category pages are **SSR/ISR renderable** and indexable; canonical URLs,
  meta title/description, and Open Graph image per product.
- **WhatsApp/Instagram link previews** show an appetizing card (title, image, price)
  when a product link is pasted.
- `sitemap.xml` + `robots.txt`; storefront pages crawlable; admin pages `noindex`.
- V2: richer share cards + campaign/QR tracking (V2-7, V2-8).

### 5.5 Accessibility (WCAG 2.1 AA)

- Full keyboard operability on storefront and admin; visible focus states.
- Screen-reader labels on icon-only controls (cart, steppers, chips).
- Color contrast AA; non-color affordances (offer badges also have text, not just color).
- **Reduced-motion** respected for Framer Motion (translate/fade over scale/bounce).
- Touch targets ≥ 44px; sheets/dialogs trap focus and restore on close.
- Form errors are programmatically associated with their fields.

### 5.6 Security (non-functional summary)

- All admin endpoints session-guarded server-side (handler is the guard).
- Server recomputes every price/offer; client never trusted.
- Checkout input sanitized (CRLF/control chars stripped, HTML-escaped).
- No customer PII stored; analytics events carry item counts/totals only (see §7).

---

## 6. Hard Constraints Inherited from Baseline (locked)
These are **non-negotiable** and this PRD builds on them (source: `docs/ARCHITECTURE.md`).

1. **No customer login, no customer accounts, no order history.** The storefront is
guess-only, permanently. V2 features (§3.3) must preserve this.
2. **The database stores only shop data** — categories, products, offers, shop
   settings. No customers, no orders, no message logs. Nothing customer-identifiable
   is persisted.
3. **Single admin auth.** Supabase Auth magic-link, admin-only. There is exactly one
   privileged persona; no customer auth exists or will exist.
4. **WhatsApp is the order channel.** Orders are delivered as pre-filled WhatsApp
   messages to the shop's number. No in-app ordering pipeline, no payments, no
   notifications outside WhatsApp.
5. **Server owns money math.** Pricing, discounts, availability, and the WhatsApp
   message are computed server-side only.
6. **Storefront writes are impossible.** Public reads are RLS-gated SELECTs with the
   anon key; all writes are service-role, server-side.
7. **One app, one deploy.** Single Next.js 15 app on Vercel; `(storefront)` and
   `(admin)` route groups; no separate services.

---

## 7. Success Metrics / KPIs
Privacy-friendly (Plausible) events. **Never** capture name, phone, note, or any PII
in events — only aggregates that do not identify a customer.

#KPIDefinitionTargetImplementation hook (event)1**Browse-to-order conversion**Sessions that reach a successful checkout / all storefront sessions≥ 4%`checkout_success` fired when `POST /api/checkout/whatsapp` returns 200 with `waUrl`2**Offer tap-through**Offer interactions / offer impressions≥ 15%`offer_impression` (offer id, on load) and `offer_tap` (offer tapped / scoped product added)3**Add-to-cart rate**Product detail views → at least one add-to-cart≥ 40%`product_view` (product id) and `add_to_cart` (product id, variant id)4**Average order value (AOV)**Sum of server-computed totals / number of checkoutstrending upServer computes total → send `checkout_total` (amount, line-item count) as an event on `checkout_success`; no PII5**Time-to-order**Storefront load → `checkout_success`≤ 60s medianSession-timed pair of `storefront_load` and `checkout_success` (Plausible session metrics)6**Checkout abandonment**`checkout_start` → no `checkout_success`< 50%`checkout_start` fired when the checkout form opens7**Cart recovery / persistence**Sessions with cart restored (`cart_restore`) that then checkoutobserve`cart_restore` fired when a persisted cart is restored on load8**Closed-state impact**Sessions arriving while closed/pausedobserve`store_closed_view` and `store_paused_view` events**Guardrail:** no event may carry name, phone, note, or any free-text user input.
Offer/product ids and amounts are aggregate-safe. (V1.1-1 exposes these in the admin.)

---

## 8. Release Roadmap & MVP Definition of Done

### 8.1 Roadmap
MilestoneWindowScopeExit gate**Foundation**Sprint 0 (pre-build)Supabase project, schema/RLS, seed data, CI/CD, env/secrets, auth scaffoldingDB migrated + seeded; deploy green; admin can log in**MVP**LaunchAll P0 + P1 features in §3.1DoD below (§8.2)**V1.1**+30–60 daysFeatures in §3.2Analytics live; perf regressions closed**V2**+90 daysFeatures in §3.3 (re-evaluated with real data)Growth KPIs improving
### 8.2 MVP Definition of Done
Locked gate (per `ARCHITECTURE.md` §12, expanded here). MVP ships when **all** hold:

1. Storefront **LCP < 2s** on a mid-range phone (4G, throttled), verified in QA.
2. A real customer journey completes in **under 60 seconds**: browse → category filter
   → see offers → add to cart → Name + Phone checkout → correct pre-filled WhatsApp
   message opens.
3. **Admin full CRUD** on categories, products, offers, shop settings; open/ordering
   toggles work; storefront reflects any change within seconds.
4. **WhatsApp message is correct**: line items with variants/quantities, recomputed
   totals with offers + delivery fee, pickup/delivery flag, sanitized name/phone/note.
5. **Store closed / ordering paused** states render correctly and are enforced
   server-side at checkout submission.
6. **No customer data stored.** DB contains only categories, products, offers, shop
   settings; analytics events carry no PII.
7. **All admin routes and mutations auth-guarded**; public reads RLS-gated; server is
   the price authority (client tampering rejected with typed errors).
8. **Offline tolerance**: cart persists across refresh/close; checkout explains
   connectivity requirements.
9. **SEO/social basics** live: renderable product/category URLs, OG cards, sitemap;
   admin pages noindexed.
10. **Accessibility** smoke pass: keyboard + screen reader on add-to-cart and checkout;
    AA contrast; reduced motion respected.

---

## 9. Out of Scope (explicit)
These are **never** part of this product as specified; anything below that later
becomes desired must be re-scoped with the PM and flagged against the locked baseline.

1. Customer accounts, login, profiles, or order history — **permanently out**.
2. Storing orders, customers, or any customer-identifiable data in the DB —
   **permanently out**.
3. Online payments, wallets, POS integration, or invoices.
4. Real-time order status, order tracking, or in-app notifications (any status
   communication happens over WhatsApp, manually).
5. Delivery logistics: routing, couriers, or external delivery integrations.
6. Customer reviews, ratings, or social feeds on the platform.
7. Loyalty programs requiring accounts; email/SMS marketing to customers.
8. Multi-language / i18n storefront (deferred to a separate decision).
9. Multi-branch management, franchise, or staff/role management beyond the single admin.
10. Native mobile apps or a separate WhatsApp Business API bot (the channel stays a
   plain `wa.me` message for MVP).
11. Menu printouts, QR-table-ordering-at-table, or self-service kiosk flows.
12. Admin bulk import/export of catalog data via files (V2 candidate, not committed).

---

## 10. Inputs Needed (from other agents)
This PRD deliberately does **not** own UX, code, or schema. To reach implementation
readiness, the following are required from the owning agents and must not conflict with
this document or the architecture baseline:

OwnerInput neededMust satisfy**UI/UX Designer**Flows + wireframes for storefront (browse → cart → checkout → WhatsApp success), closed/paused states, empty states, admin layouts; design tokens; full a11y specUS-01…US-12; §5.5**Backend Developer**Detailed API contracts, zod schemas, error codes, revalidation mechanics; pricing/offer math rules (best-offer selection, stacking rules)§4.7/§4.8/§4.11; §5.6**WhatsApp Integration Expert**Exact order-message template (line format, totals block, delivery/pickup header, sanitization rules), `wa.me` builder contract, copy/`web.whatsapp.com` fallback specUS-07; US-08; §6.4**Database Engineer**DDL, indexes, RLS policies, seeds, migrations for the five tables in §5 of ARCHITECTURE.md§6.1–6.6**Frontend Developer**Cart store shape, sheet/dialog motion, SSR/ISR split, bundle budget, offline/cart-restore mechanics§5.1, §5.3**Supabase Expert**Three client setups, storage bucket policies + signed-URL flow, RLS verification plan§5.2; ADM-8**Authentication Specialist**Magic-link config, session handling, middleware guards, rate limiting/CSRF on adminADM-1; §5.6**DevOps Engineer**Vercel/Supabase env, CI/CD, observability (Plausible event schema, Sentry), PITR backups§5.2; FND-7**QA Engineer**Test strategy from DoD (§8.2) + US acceptance criteria; LCP/CLS/INP verification method on mid-range device§5.1; §8.2
---

## 11. Revisions & Compliance
RevDateAuthorChangev12026-08-04PMInitial PRD from locked ARCHITECTURE.md v1
- **Compliance:** no contradiction introduced against `docs/ARCHITECTURE.md`. Where the
baseline was underspecified (offer stacking, AOV events, closed-state behavior), this
PRD defines product intent and flags the owning agent in §10.
