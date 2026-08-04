# Chocolate Zone — UX & Visual Design Specification
**Owner:** UI/UX Designer · **Status:** Draft v1 · **Audience:** Frontend Developer (primary), QA, PM, Backend
**Locked contract:** `docs/ARCHITECTURE.md` (v1). This document designs *for* the locked folder structure and does not rename or contradict it.

---

## 0. Reading Guide
SectionWhat it contains1Design principles2Customer journey map + per-screen decision tables3Storefront screen inventory + wireframes4Admin screen inventory + wireframes5Design system (Tailwind tokens, shadcn/ui theming)6Component specs (anatomy, states, sizes, a11y, motion)7Accessibility requirements8Responsive rules9Baseline UX optimizations10Cross-team inputs needed11Deferred decisionsComponent names used below are the **locked** names from ARCHITECTURE.md §4. Any file/schema/API reference matches §4–§9 exactly.

---

## 1. Design Principles

### 1.1 Premium & chocolate-brand

- The palette is built on **deep chocolate, warm cream, and gold** — the brand *is* the product. The UI should feel like the inside of a premium chocolaterie: dark warm surfaces, cream paper, gold details.
- Display **serif** headings (food/premium connotation), sans body for legibility and density.
- Photography-first product presentation: large, warm-toned product images; cream background makes brown food pop; gold is used sparingly as an accent (prices, badges, active chips, focus).
- Copy is indulgent but short: "Double Dark Brownie", "Nutella Stack Waffle". No corporate filler.

### 1.2 Mobile-first, thumb-first

- Every interactive target ≥ 44×44 px. Primary actions live in the **lower third** of the screen (thumb zone).
- One-handed reachability: nav/category chips top, actions bottom, sheets slide from bottom.
- The whole purchase flow must be completable in under 60 seconds (see DoD §12).

### 1.3 Zero-friction, zero-account

- No login, no signup, no order history. The cart is the only state, persisted in `localStorage` (`stores/cart.ts`, Zustand + persist).
- Checkout is **Name + Phone only**. Every additional field is a friction tax.
- The "order" action is *send a WhatsApp message*, not "pay now" — copy and affordances must set that expectation ("Send order on WhatsApp", never "Pay").
- Repeat-customer phone auto-fill via `localStorage` (see §9.1). No server-side customer data ever.

### 1.4 Friction-killers

- One-shot catalog load (`GET /api/catalog`) so the home screen paints immediately.
- Quantity steppers on card and in cart; no confirmation modals for trivial edits.
- Strikethrough original price on any product covered by an active offer (§9.4).
- Shop open/closed awareness is surfaced at every decision point, not discovered at checkout (§9.6).
- Empty/loading/error states are designed, not afterthoughts.

### 1.5 Motion that means something

- Motion is decorative only where it communicates state: sheet slide = "a layer opened"; badge pop = "cart changed"; add-to-cart bounce = "item captured". Respect `prefers-reduced-motion` (§7.5).

---

## 2. Customer Journey Map

### 2.1 Funnel overview

```
ENTRY ──► DISCOVER ──► EVALUATE ──► SELECT ──► REVIEW ──► CHECKOUT ──► SEND ──► SUCCESS
 QR /       home page    product     add to      cart      name+phone   WhatsApp   "done"
 Instagram  (hero/offers/ sheet       cart        form         opens
 link       categories/ (bottom)                           pre-filled   wa.me
            grid)                                            message
```
Entry points (no tracked attribution for MVP; treated identically):

```
[QR on table/wall] ─► / (home)
[Instagram bio link] ─► / (home)
[Shared product link] ─► /product/[slug]
[Shared category link] ─► /category/[slug]
[Direct type-in] ─► /
```

- Deep links (`/product/[slug]`, `/category/[slug]`) must render the **full page with a floating cart bar** (shared `(storefront)/layout.tsx`), not a bare sheet — so the entry page is always a complete, usable storefront.
- On a deep product link, auto-open the `ProductSheet` after hydration *if and only if* it is a real product page (server-rendered content is the fallback).

### 2.2 Decision table (per screen)
#Screen / stateTriggerWhat the user seesPrimary actionSecondary actionSuccess →Failure →H1Home — open`GET /api/catalog` okHero + announcement, offer carousel, category chips, product grid, FloatingCartBarTap product cardTap offer / category chipProductSheet opensError state (§3.9)H2Home — closed`shop.is_open=false`Browsing allowed, "Closed now" ribbon, CTA disabled, open timings(none — browsing)View timings / call——H3Home — ordering disabled`ordering_enabled=false` (e.g. pre-order window)"Orders paused — reopen at <time>" banner; CTA disabled(none)———O1Offer carouselHome renderSwipeable offer cards (image, title, "up to X% off", expiry)Tap offer → see covered products—Category grid filtered to offer products (tag `#offer:<id>` in URL)—C1Category chipsHome render / tapHorizontal chips w/ emoji; active chip goldTap chip—Grid filters client-side; deep-link `?cat=<slug>`—P1ProductSheetTap product card / deep linkImage, name, desc, variant selectors, QtyStepper, price, offer strikethrough, Add to cartAdd to cartClose / collapseQty stepper resets, badge pops, bar updatesItem inactive → sheet opens with disabled CTA + reasonP2Product variant selectChoose variant optionOptions with price deltas (e.g. "Large +₹40")Tap option—Selected style updates; price updatesNoneV1Variant unavailablevariant `is_active=false` or `stock_qty=0`Option disabled + struck————K1CartSheetTap FloatingCartBarLine items w/ image, qty, line price; delivery/pickup toggle; subtotal + fees; checkout CTACheckout (Name+Phone)Clear cartCheckoutForm opens in-sheetEmpty cart → EmptyCart state (§3.8)K2Delivery toggleSelect "Delivery"Fee shown if below free-delivery threshold; threshold progress hint——Subtotal math updatesDelivery disabled (`delivery_enabled=false`) → option hidden with noteK3Pickup toggleSelect "Pickup"Shop address + "ready in ~20 min" hint——Subtotal updates (no fee)Pickup disabled → option hiddenF1CheckoutFormCartSheet → checkoutName, Phone (auto-filled), optional note, WhatsApp green CTASend order on WhatsAppBack to cartPOST `/api/checkout/whatsapp` → open `waUrl`Validation error / API 400 → inline errors (§3.6)F2Phone validationBlur / submitInline error "Enter a valid 10-digit number"——Error clears on valid inputBlocked submit, CTA disabledS1Order successWhatsApp openedSuccess panel + copy-message fallback + `web.whatsapp.com` linkCopy message / Open WhatsAppDoneBack to home, cart clearedWhatsApp not installed → fallback (§9.5)S2WhatsApp not installedNavigation attemptExplicit fallback modal/panel (§9.5)Copy + open web.whatsapp.com———E1Error (network/API)any fetch failsInline error + retry (§3.9)RetryReloadRetry succeeds—A1Admin login`/admin/*` unauthMagic-link email form (§4.1)Send magic link—Redirect to `/dashboard`Invalid/expired link error

---

## 3. Storefront Screen Inventory + Wireframes
**Shared layout **`(storefront)/layout.tsx`**:** mobile-first single column, cream background, `FloatingCartBar` fixed bottom, `ProductSheet`/`CartSheet` mounted once. Max content width 480 px on mobile, centered 1120 px with a 2–4 column grid on `lg+` for tablet/desktop (see §8).

### 3.1 Home (`(storefront)/page.tsx`)

```
┌──────────────────────────────────────┐
│ [●logo] Chocolate Zone      (11:00–23:00)│   <- brand bar; open/closed chip
├──────────────────────────────────────┤
│            HERO (cream→choco fade)    │
│  ┌────────────────────────────────┐  │
│  │  [img]  Welcome to             │  │
│  │        CHOCOLATE ZONE          │  │   <- serif display, gold accent word
│  │        Handcrafted waffles,    │  │
│  │        brownies, cakes.        │  │
│  │        (order now button ↓)    │  │   <- scrolls to grid
│  └────────────────────────────────┘  │
│ ANNOUNCEMENT (gold tint strip)  "Eid delivery 10–2"   <- shop.announcement
├──────────────────────────────────────┤
│  OFFER CAROUSEL  (swipeable)         │
│  [ card ][ card ][ card ]──→         │   <- OfferCarousel
│  -30% Waffles | 2+1 Brownies | ...   │
├──────────────────────────────────────┤
│  MENU — CATEGORY CHIPS               │
│  [🧇 All][🍫 Choc][🧁 Cakes][☕ Bev] │   <- CategoryChips, horizontal scroll
├──────────────────────────────────────┤
│  PRODUCT GRID (2-col on mobile)      │
│  ┌─────────┐ ┌─────────┐             │
│  │ [img]   │ │ [img]   │             │
│  │ Nutella │ │ Dark    │             │
│  │ Waffle  │ │ Brownie │             │
│  │ ₹249    │ │ ~~₹199~~₹139│        │   <- strikethrough offer
│  │ [  +  ] │ │ [  +  ] │             │   <- QtyStepper (compact)
│  └─────────┘ └─────────┘             │
│  (… more cards …)                    │
├──────────────────────────────────────┤
│  ▼ FloatingCartBar (fixed)  [2 items | ₹488] │
└──────────────────────────────────────┘
```

- **Data:** single `GET /api/catalog` → settings, categories, products, offers. SSR + ISR (`revalidateTag('catalog')`).
- **Hierarchy:** hero (brand) → offer (motivation) → category (wayfinding) → grid (commerce). Announcement strip only when `shop.announcement` non-empty.
- **Hero CTA** scrolls to the product grid (`#menu`); does not scroll if the page is already scrolled.
- **Sticky sub-header:** on scroll past hero, the brand bar compresses and category chips pin beneath it (sticky top), so "browse by category" is always one thumb away.

### 3.2 Category view (`category/[slug]`)

```
┌──────────────────────────────────────┐
│ ← Back        🧁 Cakes        (grid) │   <- header w/ back; active chip
├──────────────────────────────────────┤
│ CATEGORY CHIPS (same component,      │
│  active chip = current category)     │
├──────────────────────────────────────┤
│  PRODUCT GRID (filtered)             │
│  ┌─────────┐ ┌─────────┐             │
│  │ [img]   │ │ [img]   │             │
│  │ Red     │ │ Cheesec-│             │
│  │ Velvet  │ │ ake Slc │             │
│  │ ₹349    │ │ ₹299    │             │
│  │ [  +  ] │ │ [  +  ] │             │
│  └─────────┘ └─────────┘             │
├──────────────────────────────────────┤
│ ▼ FloatingCartBar                    │
└──────────────────────────────────────┘
```

- URL: `/category/<slug>`; the offer-filtered grid variant uses query `?offer=<offerId>` (see O1) so "back" semantics survive.
- Grid is the same `ProductCard` grid component reused everywhere; no bespoke list.
- Unknown/`is_active=false` category → server-rendered "Category not found" empty state (§3.8).

### 3.3 Product detail bottom sheet — `ProductSheet`

```
        ┌──────────────────────────┐
        │   ─────────── drag handle │
        │  ┌────────────────────┐  │
        │  │      [photo]       │  │ 16:9, object-cover
        │  │                    │  │
        │  └────────────────────┘  │
        │  🧁 Cakes        [Close ×]│
        │  Nutella Stack Waffle     │ <- serif, 24px
        │  ₹249   ~~₹299~~ -17%    │ <- price + offer badge (gold)
        │  Warm waffle, Nutella…    │ <- desc, 14px, 2-line clamp+
        │                           │
        │  SIZE (variant group 1)   │
        │  [Regular +₹0][Large +₹40]│ <- segmented control (buttons)
        │  TOPS (variant group 2)   │
        │  [None][Extra Nutella +₹30]│
        │                           │
        │  QTY      [ - ] [ 1 ] [ + ]│ <- QtyStepper
        │                           │
        │  [  ADD TO CART  ₹249  ]  │ <- primary CTA, 52px, full width
        │  ───────────────────────  │
        │  [ ] 8:00–23:00 · Delivery/Pickup open │ <- open/closed chip
        └──────────────────────────┘
```

- Opened by tapping a `ProductCard`. Rendered with Framer Motion spring slide-up, backdrop dim at 60% chocolate-950/60, body scroll locked, `Escape` closes, focus trapped.
- **Variant rendering:** grouped by `product_variants.name`; each group is a set of option buttons. Selecting sets the effective unit price (`base_price + Σ price_delta`) — computed **client-side for display only**; server recomputes at checkout (never trust client).
- **CTA states:** `Add to cart` (normal) / `Sold out` (disabled, `stock_qty=0`) / `Inactive` (disabled, `is_active=false`, whole sheet shows "Unavailable" empty-style body).
- **Sheet idempotency:** after "Add", the sheet closes, badge pops, cart bar updates. Re-adding the same config **increments** quantity (does not stack duplicate line items). Different variant config = separate line item.
- **Not a page**: the route `product/[slug]` renders the page with sheet behavior for SSR/deep-link (SEO + no-JS), but interactivity is the sheet.

### 3.4 Cart sheet — `CartSheet`

```
        ┌──────────────────────────┐
        │  ─────────── drag handle │
        │  YOUR CART         [Clear]│  <- Clear = tiny text button
        │  ┌──────────────────────┐│
        │  │[img] Nutella Waffle  ││  <- line item
        │  │      Regular × Large ││      (variant summary)
        │  │      [−] 1 [+]= ₹289 ││      QtyStepper inline
        │  │                      ││
        │  │[img] Dark Brownie    ││
        │  │      − − −           ││
        │  │      [−] 2 [+]= ₹278 ││
        │  └──────────────────────┘│
        │  FULFILMENT              │
        │  [● Delivery] [○ Pickup] │   <- segmented control
        │  Delivery fee ₹30  (FREE over ₹499) │ <- hint, updates
        │  ─────────────────────  │
        │  Subtotal        ₹567   │
        │  Delivery fee    ₹30    │
        │  Total           ₹597   │   <- serif, gold
        │  [ ORDER ON WHATSAPP ]  │   <- WhatsApp green CTA (only green on page)
        │  "We'll open WhatsApp with your order ready to send."
        │  ⚠ Shop closed — orders start 11:00   │ <- if closed
        └──────────────────────────────────────────┘
```

- Line item = `{ productId, variantId?, quantity }` keyed by `productId + variantId`.
- **Clear cart** requires one inline confirm: button flips to "Confirm clear?" for 3 s (no modal). Restores on tap-away/timeout.
- **Fulfilment toggle** defaults to `pickup` if enabled else `delivery` (mirrors shop flags). Totals recompute live.
- **Free delivery progress:** "Add ₹X more for free delivery" small hint with a thin gold progress bar when subtotal < `free_delivery_threshold`.
- Empty state §3.8.

### 3.5 Checkout form — `CheckoutForm`

```
        ┌──────────────────────────┐
        │  ─────────── drag handle │
        │  CHECKOUT                 │
        │  < Back to cart           │
        │                           │
        │  YOUR DETAILS             │
        │  Name                      │
        │  ┌──────────────────────┐ │
        │  │ Priya Sharma          │ │ <- auto-focus; auto-capitalize words
        │  └──────────────────────┘ │
        │  Phone                    │
        │  ┌──────────────────────┐ │
        │  │ +91 98765 43210      │ │ <- tel keyboard, auto-fill (localStorage)
        │  └──────────────────────┘ │
        │   ✓ Saved for next time   │ <- "your number stays on this device"
        │  Note (optional)          │
        │  ┌──────────────────────┐ │
        │  │ e.g. no nuts, table 5│ │ <- 3 rows max, counter 120
        │  └──────────────────────┘ │
        │  ─────────────────────  │
        │  FULFILMENT  [Delivery][Pickup] │
        │  Total (2 items)   ₹597  │
        │                           │
        │  [ SEND ORDER ON WHATSAPP ]│ <- WhatsApp green, 52px
        │  "Opens WhatsApp with your order message. No payment online."
        │  ⚠ Closed now — sending will be for the next open slot   │
        └──────────────────────────────────────────┘
```

- **Fields:** Name (required), Phone (required), Note (optional ≤120 chars). That's it.
- **Validation (Zod `lib/validation/schemas.ts`):**

- Name: non-empty, 2–50 chars, letters/spaces/`.'-`, no control chars. Error: "Please enter your name."
- Phone: digits with optional `+` and spaces, 8–15 digits total. Error: "Enter a valid phone number."
- Note: ≤120 chars, strips CRLF/control chars.
- Errors render **inline under the field**, red text + `role="alert"`, `aria-invalid` on input, and **only after** blur or submit (no live-typing errors).
- **Submit → loading:** CTA shows spinner + "Preparing…", disabled, double-submit prevented (button lock + server idempotency).
- On success the API returns `{ message, waUrl, total }` — client opens `waUrl` in a new tab and transitions to Order success (§3.7).
- **Delivery address note:** the *shop's* address is shown in the pickup option; there is no customer address field for MVP (address goes in the note) — flagged in §11.

### 3.6 Checkout validation states (visual)

```
FIELD states:
 DEFAULT    ┌────────────────┐   border chocolate-200, bg white
 FOCUS      ┌────────────────┐   border gold-500 + ring-4 ring-gold-500/20
 VALID      ┌────────────────┐   (no persistent green; only on blur with valid)
 ERROR      ┌────────────────┐   border red-600 + ring; message below
 DISABLED   CTA: bg neutral-300, text neutral-500, not clickable, aria-disabled

 inline error block:
   │
   ▼
   ⚠ Enter a valid phone number.          <- 12px, red-700, role="alert"
```

- Error banner for server `400`/network failure at the top of the form (§3.9), keeps field values (no lossy reset).

### 3.7 Order success state

```
┌──────────────────────────────────────┐
│            ✓  (big, WhatsApp green)  │
│     ORDER READY FOR WHATSAPP          │   <- serif display
│   We opened WhatsApp with your order  │
│   message ready to send.              │
│                                        │
│   ┌────────────────────────────────┐  │
│   │  Your order                   │  │
│   │  ─────────────────────────    │  │
│   │  Nutella Waffle ×1       289  │  │   <- full message preview
│   │  Dark Brownie ×2         278  │  │
│   │  Delivery fee             30  │  │
│   │  Total                   ₹597 │  │
│   │  Name: Priya · +91 9876543210│  │
│   │  Fulfilment: Delivery        │  │
│   └────────────────────────────────┘  │
│                                        │
│   [ COPY MESSAGE ]                     │   <- copies `message`; toast "Copied"
│   [ OPEN WHATSAPP AGAIN ]              │   <- re-opens waUrl (web.whatsapp.com fallback)
│   [ Done — back to menu ]              │   <- clears cart, closes sheet, home
└──────────────────────────────────────┘
```

- Shown in the same bottom-sheet slot (morphs from CheckoutForm) to preserve context.
- **Cart is NOT cleared until** "Done" (or when returning to home), so a failed copy → retry doesn't lose the order. Actually: see §9.5 — the message is already built server-side; the cart can clear on "Done".
- **WhatsApp-not-installed fallback** triggers when the `wa.me` intent fails to open (heuristic: page keeps `visibilitychange` event vs. tab stays visible; see §9.5). Fallback panel promotes `Copy message` + `Open web.whatsapp.com`.

### 3.8 Empty & edge states
**Empty cart (CartSheet):**

```
        ┌──────────────────────────┐
        │  ─────────── drag handle │
        │     (large 🛒 in gold)   │
        │     Your cart is empty   │   <- serif
        │   Add something delicious│
        │   from the menu.         │
        │   [ BROWSE MENU ]        │   <- closes sheet, scrolls to #menu
        └──────────────────────────┘
```

- FloatingCartBar hides when cart is empty (0 items). `CartSheet` can only open with ≥1 item, but the empty state is defined for safety.
**Empty grid (category with no active products):**

```
    (illustration / emoji)
    Nothing here right now
    New treats are on the way.
    [ BROWSE ALL ]
```
- **Closed state (H2):**

- Ribbon across the top under the brand bar, cream-on-chocolate:
  `We're closed · Open tomorrow 11:00 AM` (from `timings` jsonb). Add-to-cart CTAs disabled with tooltip "We open at 11:00". CartSheet CTA disabled with note. If `ordering_enabled=false`: `Orders paused · reopen <time>` variant.

### 3.9 Loading & error states
**Skeleton (SSR fallback / client revalidation):**

```
┌───────────────────────────────┐
│  ░░ brand bar ░░              │
│  ┌─────────────────────┐      │
│  │  ░░░░░░░░░░░░░░░░░░ │      │  <- hero shimmer block
│  └─────────────────────┘      │
│  ░░░░░░░░░░░░░░                │  <- offer carousel placeholder
│  ░░░░  ░░░░░░                │  <- chips
│  ┌────┐ ┌────┐  ┌────┐        │  <- product card skeletons
│  │ ░░ │ │ ░░ │  │ ░░ │        │      (image block + 2 lines + button)
│  └────┘ └────┘  └────┘        │
└───────────────────────────────┘
```

- Shimmer = gradient sweep, `aria-hidden`, `prefers-reduced-motion` → static placeholder.
**Error state (E1):**

```
        (⚠ warm icon)
   We couldn't load the menu
   Check your connection and try again.
   [ RETRY ]
```

- Inline, top of the content region. Keeps header/nav usable. `Retry` re-runs the fetch. Server render failure → Next.js error boundary with the same visual, "Reload" button.
- **Checkout API 400/5xx:** error banner at top of CheckoutForm, field errors preserved, CTA re-enabled.

---

## 4. Admin Dashboard Screen Inventory + Wireframes
Admin = desktop-first (see §8.3). Uses shadcn primitives (Dialog, Table, Select, Input, etc.) themed by the token system. Locked component names: `DataTable`, `ImageUpload`, `ToggleSwitch`, `SortableList`, `ProductForm`, `OfferForm`, `SettingsForm`.

### 4.1 Login (`(admin)/login/page.tsx`)

```
┌────────────────────────────────────────────┐
│   (chocolate block left  / right: form)     │
│   Chocolate Zone — Admin                   │
│   Sign in with email                        │
│   [ owner@chocolatezone.in            ]     │
│   [ SEND MAGIC LINK ]                      │
│   "We'll email you a secure sign-in link."  │
│   ── sent state ─────────────────────────   │
│   ✓ Link sent — check your inbox.          │
└────────────────────────────────────────────┘
```

- Magic link (Supabase Auth, passwordless). Desktop card, centered; mobile stacks.

### 4.2 Dashboard shell + Overview

```
┌──────────────────────────────────────────────────────────┐
│ ◉ Chocolate Zone           [Site] [Log out]  owner@…      │  <- topbar
├───────────┬──────────────────────────────────────────────┤
│ DASHBOARD │  Overview                                     │
│ ●Overview │                                               │
│ Categories│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ Products  │  │ 24     │ │ 5      │ │ 3      │ │ OPEN   │ │  <- KPI cards
│ Offers    │  │Products│ │Cats    │ │Offers  │ │●toggle │ │
│ Settings  │  └────────┘ └────────┘ └────────┘ └────────┘ │
│           │  Recent edits (products, by updated_at)      │
│           │  ┌────────────────────────────────────────┐  │
│           │  │ DataTable (recent products) → see 4.4  │  │
│           │  └────────────────────────────────────────┘  │
│           │  Open/ordering quick-toggle with            │
│           │  countdown-aware hint (timings)             │
└───────────┴──────────────────────────────────────────────┘
```

- Left sidebar nav (icon + label) on `lg+`; bottom tab bar on `<lg` (admin also usable on tablet).
- KPI cards: Products (active/total), Categories (active), Offers (active), **Open status** as a `ToggleSwitch` that flips `shop.is_open` live.
- Overview reads from the same `GET /api/catalog` aggregate (no separate metrics API for MVP).

### 4.3 Categories

```
│ Categories                                    [+ Add category] │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ SortableList ──  drag handle ────────────────────────── │ │
│ │  🧇   Waffles          ● on      Edit   ⋮⋮             │ │
│ │  🍫   Chocolates       ● on      Edit   ⋮⋮             │ │
│ │  🧁   Cakes            ○ off     Edit   ⋮⋮             │ │
│ └──────────────────────────────────────────────────────────┘ │
│  (dialog: emoji picker [🧇🍫🧁☕], name, slug auto, image,   │
│   ToggleSwitch active, SortableList order)                   │
```

- Row = emoji, name, slug, active toggle, edit. Drag-to-reorder persists `sort_order`.

### 4.4 Products — `DataTable` + `ProductForm`

```
│ Products                                       [+ Add product] │
│ [ Search…                      ]  [Filter: All/On/Sold out]    │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Name           Cat     Price    Stock   Offer    Active ⋮ │ │
│ │ Dark Brownie   🧁      139      ∞       2+1 on   ●      ⋮ │ │
│ │ Nutella Waffle 🧇      249      40      −30% on  ●      ⋮ │ │
│ │ …                                                        │ │
│ └───────────────────────────────────────────────────────────┘ │
│  (rows = DataTable: sortable columns, row actions menu,      │
│   pagination when >10)                                        │
```
**ProductForm dialog (create/edit):**

```
┌────────────────────────────────────────────┐
│ New product                         [×]    │
│ Name *      [ Nutella Stack Waffle      ]  │
│ Category *  [ 🧇 Waffles      ▼ ]           │
│ Description [ Warm waffle… (textarea) ]     │
│ Base price *[ 249            ]  Currency   │
│ Image *     [ ImageUpload: drop / browse,  │
│               crop-square preview, WebP ]   │
│ Feature?  [●]  Veg? [○]   Stock [ 40 | ∞ ]  │
│ Variants repeater (SortableList)            │
│   SIZE   Regular +₹0   [×]  ─ drag─        │
│   SIZE   Large   +₹40  [×]                 │
│   TOP    Extra Nutella +₹30 [×]             │
│   [+ Add variant]                          │
│ Active [●]                                 │
│                     [ Cancel ] [ SAVE ]    │
└────────────────────────────────────────────┘
```

- Variants repeater: rows of `{ name, option, price_delta, is_active }`; add row, remove row, drag-reorder. Validation per row (name non-empty, price_delta numeric).
- Saving calls `/api/admin/products`; on success `revalidateTag('catalog')` and table refreshes.
- Unsaved changes → confirm-on-close (`aria` + dialog close trap).

### 4.5 Offers

```
│ Offers                                       [+ Add offer]     │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ SortableList ────────────────────────────────────────── │  │
│ │ [banner img] "Waffle Wednesday −30% all waffles"        │  │
│ │              until 2026-08-11   ● on      Edit   ⋮⋮     │  │
│ │ [banner img] "2+1 Brownies"      expires never ○ off    │  │
│ └──────────────────────────────────────────────────────────┘  │
```
**OfferForm dialog:**

```
│ Title *  [ Waffle Wednesday                      ]           │
│ Description [ −30% on all waffles ]                          │
│ Image *    [ ImageUpload ]                                   │
│ Discount   (●) Percentage  [ 30 ]%   (○) Fixed [ ₹ ]        │
│ Applies to (●) All products  (○) Selected: [☑ waffle ids]    │
│ Starts    [ 2026-08-04 ]  (blank = now)                      │
│ Ends      [ 2026-08-11 ]  (blank = never)                    │
│ Active [●]   Order: SortableList of offers                   │
│                                            [ Save ]          │
```

- Preview line: "Customer sees: ~~₹299~~ ₹209" computed live (needs `discount.ts` math parity — see §10).

### 4.6 Settings — `SettingsForm`

```
│ Settings                                                        │
│ BRAND                                                           │
│  Brand name * [ Chocolate Zone ]      Logo [ ImageUpload ]      │
│  Currency [₹ INR ▼]   WhatsApp number * [ +919876543210 ]       │
│ FULFILMENT                                                      │
│  Delivery enabled [●]  Pickup enabled [●]                       │
│  Delivery fee [₹30]  Free delivery over [₹499]                  │
│ ADDRESS & TIMINGS                                               │
│  Address [ 12 Cocoa Lane… ]                                    │
│  Timings:  Mon [11:00]–[23:00] ○closed …  (per-day rows)        │
│ SHOP STATE                                                      │
│  Open now          [●]                                         │
│  Ordering enabled  [●]   (off = "orders paused" on storefront) │
│  Announcement      [ textarea, optional ]                       │
│                                              [ SAVE CHANGES ]  │
│  Saved ✓ (toast)      ·   [ REVALIDATE → live in seconds ]     │
└────────────────────────────────────────────────────────────────┘
```

- Every toggle maps to a `shop_settings` column (§5 of ARCH). "Open now" vs "Ordering enabled" are distinct toggles with helper text explaining the storefront effect.
- Save → `PUT /api/admin/shop` → `revalidateTag('catalog')` → toast "Saved — storefront updated".

---

## 5. Design System
Single source of truth: **Tailwind v4 **`@theme`** tokens** in the global CSS (or `tailwind.config` for v3 — the tokens below are what must exist). shadcn/ui consumes the same values via `:root`/`.dark` CSS variables. **No hardcoded hex in components.**

### 5.1 Color palette
TokenHexUsage`--color-chocolate-950``#1A0F0B`Darkest surface (admin sidebar, sheet header, text on cream)`--color-chocolate-900``#241512`Deep surface (hero gradient end, footer)`--color-chocolate-800``#33201A`Elevated dark surface, topbar`--color-chocolate-700``#462C22`Dark hover`--color-chocolate-600``#5C3B2C`Muted dark text on cream? No → used for icons on cream`--color-chocolate-500``#6F4E37`Primary text on cream, borders, secondary CTA`--color-chocolate-400``#8A6247`Disabled text on cream (must meet AA → see §7.1)`--color-chocolate-300``#AD8A6E`Placeholder text, divider on dark`--color-chocolate-200``#D3BCA4`Borders on cream, skeleton base`--color-chocolate-100``#E9DBCC`Hairlines, chip bg`--color-chocolate-50``#F7F0E8`Cream-tinted white, card bg hover`--color-cream-50``#FDFAF5`**Page background**`--color-cream-100``#F8F1E7`Card background, sheet body`--color-cream-200``#F0E4D4`Elevated card, input bg`--color-gold-500``#C9971E`**Accent**: prices, active chip, badges, focus ring`--color-gold-400``#DDB23C`Gold hover, gold text on dark`--color-gold-600``#A87E14`Gold pressed, accessible gold text on cream`--color-gold-50``#FBF3DC`Gold tint chip/banner bg`--color-whatsapp-500``#25D366`**Order CTA only** (never elsewhere)`--color-whatsapp-600``#1DA851`WhatsApp CTA hover/pressed`--color-success-*`green scale (see 5.5)success only`--color-error-*`red scale (see 5.5)errors only`--color-warning-*`amberclosed banner, low-stock`--color-neutral-*`graysystem neutrals (disabled)**Brand rule:** WhatsApp green is *reserved exclusively* for the order CTA ("Send order on WhatsApp") and the order-success icon. It must never be used for a generic button, badge, or accent. Chocolate brown is the primary brand color; gold is the accent; cream is the canvas.

### 5.2 Typography

- **Display serif:** `Fraunces` (weights 400/500/600/700; optical size auto). Fallback stack `Georgia, serif`. Used for: hero headline, section titles, sheet titles, totals, empty-state titles, admin page H1s.
- **Body sans:** `Inter` (400/500/600/700). Fallback system-ui. Used for: everything else — body, buttons, inputs, labels, tables.
- Load via `next/font/google` with `display: "swap"`.
RoleClass recipeSize / Weight / Line-heightDisplay XL (hero)`text-4xl font-serif` → `text-[2.25rem] leading-[1.1]`36 px / 700 / 1.1Heading (sheet title)`text-2xl font-serif`24 px / 600 / 1.25Section title`text-lg font-serif`18 px / 600 / 1.3Body`text-base`16 px / 400 / 1.5 (base 16, no `<16px` for body)Body small / price`text-sm`14 px / 600 / 1Price emphasis`font-semibold text-gold-600`14–20 px
- **Money:** `₹` symbol, no decimals for MVP (whole rupees), right-aligned in tables. `lib/pricing/money.ts` owns formatting.
- Numeric tabular figures for prices/totals (avoid jitter on stepper): `font-variant-numeric: tabular-nums`.

### 5.3 Spacing scale (Tailwind defaults + custom)
Use the standard `--spacing` scale (`px, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12, 16, 20, 24`) and standardize:

UseTokenScreen gutters (mobile)`px-4` (16 px)Screen gutters (≥lg)`px-6`/`px-8` (24/32 px)Between hero / carousel / chips / grid`mt-6`→`mt-8` (24–32 px)Card padding`p-3`–`p-4` (12–16 px)Sheet body padding`p-4`–`p-6`Between fields in CheckoutForm`space-y-4`Touch target minimum**44×44 px** (§7.2)
### 5.4 Radius & elevation
TokenValueUse`--radius-sm`6 pxchips, badges, inputs`--radius-md`10 pxbuttons, cards, inputs default`--radius-lg`16 pxcards, sheets top corners`--radius-xl`24 pxlarge cards, hero`--radius-full`9999 pxpills, avatars, stepper buttonsShadow tokenValueUse`--shadow-soft``0 1px 2px rgb(26 15 11 / .06), 0 2px 8px rgb(26 15 11 / .06)`cards`--shadow-lifted``0 2px 6px rgb(26 15 11 / .10), 0 12px 24px rgb(26 15 11 / .12)`FloatingCartBar, popovers, sticky header`--shadow-sheet``0 -8px 40px rgb(26 15 11 / .22)`bottom sheets`--shadow-focus`ring: `0 0 0 4px rgb(201 151 30 / .25)`gold focus ring
### 5.5 Semantic color roles (success / error / neutral / warning)
RoleToken baseExample hexUsed forSuccess`--color-success``#15803D` (text) / `#DCFCE7` (bg)"Saved" toast, valid state, ✓ iconsError`--color-error``#B91C1C` (text) / `#FEE2E2` (bg)field errors, error bannersWarning`--color-warning``#B45309` (text) / `#FEF3C7` (bg)closed/paused banners, low stockNeutral`--color-neutral`gray 400–600disabled, hints, skeletonsInfo`--color-info``#1D4ED8` / `#DBEAFE`"saved for next time", note hintsEach semantic role ships a `*-text`, `*-bg`, `*-border` pair so components never mix raw hex.

### 5.6 Theming shadcn/ui via CSS variables

- Define shadcn vars in `:root` (light) mapped to palette tokens:

```
:root {
  --background: var(--color-cream-50);
  --foreground: var(--color-chocolate-950);
  --card: var(--color-cream-100);
  --card-foreground: var(--color-chocolate-950);
  --primary: var(--color-chocolate-800);          /* primary actions */
  --primary-foreground: var(--color-cream-50);
  --accent: var(--color-gold-500);                /* accents */
  --accent-foreground: var(--color-chocolate-950);
  --muted: var(--color-chocolate-100);
  --muted-foreground: var(--color-chocolate-600);
  --border: var(--color-chocolate-200);
  --input: var(--color-chocolate-200);
  --ring: var(--color-gold-500);
  --destructive: var(--color-error);              /* error bg */
  --destructive-foreground: white;
  --success: var(--color-success);
  --radius: 0.5rem;
}
```

- **Dark theme (admin only, optional):** keep `.dark` with chocolate-950 background, cream text, gold accents. Storefront is **always light/cream** — never force dark on customers (product photos need light canvas).
- shadcn/ui primitives (`components/ui/*`) then consume `var(--*)` via `cn()`/`@theme` — Frontend wires tokens → components; this spec fixes the token *values* and mapping.

---

## 6. Component Specs
General contract for all: default/hover/active/disabled/loading/error states; ≥44×44 px targets; visible gold focus ring; `prefers-reduced-motion` respected. Micro-interactions via Framer Motion (framer-motion), all durations 120–320 ms.

### 6.1 Storefront components

#### 6.1.1 `ProductCard`

- **Anatomy (mobile 2-col grid):** image (aspect 4:3, rounded-lg, `next/image` fill) → name (2-line clamp, 14 px/600) → offer strikethrough + price row (struck old price `text-chocolate-400 line-through`, new price `font-semibold text-gold-600`) → stepper/CTA row.
- **CTA slot:** if `stock_qty>0` → compact `QtyStepper` with a `+` when qty=0; if `stock_qty=0` → disabled "Sold out" tag overlay on image.
- **Offer badge:** gold pill top-left of image `−30%`.
- **States:** default (card bg cream-100, `shadow-soft`); press (`scale-[0.98]` via `whileTap`, `shadow` deepen); disabled (sold-out overlay, `opacity-90`, no interaction); loading (skeleton §3.9); error (badge `⛔` + retry on card — rare, grid-level retry preferred).
- **A11y:** whole card is an `<article>`; image `alt = product name`; tap target for the interactive control is the stepper/CTA **separately** ≥44 px (not the whole card).
- **Motion:** `whileHover={y:-2}`; `whileTap={scale:0.97}`; enter stagger in grid (`initial{opacity:0,y:12}` → `animate`), stagger 40 ms, only on first mount.

#### 6.1.2 `OfferCarousel`

- **Anatomy:** horizontal snap-scroll strip (`overflow-x-auto`, `scroll-snap-type:x mandatory`, `scroll-px-4`), cards 280 px wide, rounded-xl, image bg + gradient scrim + title (serif) + "Up to 30% off" + validity ("Ends Aug 11"). Optional prev/next chevrons on desktop.
- **States:** default / hover (`y:-2`) / active-tap / disabled (offer expired → greyed, "Ended" tag, non-interactive). Loading: 2 skeleton cards.
- **A11y:** `role="region"` `aria-label="Offers"`; each card a link with `aria-label` incl. offer + discount; snap-scroll is keyboard-safe (`tabindex` cards, native arrow scroll on focus); scroll container `aria-orientation="horizontal"` via `role="list"`/`role="listitem"`.
- **Motion:** Framer Motion `useScroll`/`useTransform` parallax scrim (optional, `reduced-motion` → none); tap cards scale 0.98; entrance stagger.

#### 6.1.3 `CategoryChips`

- **Anatomy:** horizontal scroll row (no scrollbar), pill chips `h-10 px-4 rounded-full bg-cream-100 border border-chocolate-200 text-chocolate-700`, emoji prefix. Leading "All" chip always present. Active chip: `bg-chocolate-800 text-cream-50` (or gold accent variant `bg-gold-500 text-chocolate-950`).
- **States:** default / active / hover (`border-gold-400`) / pressed (`scale-0.97`) / disabled (category `is_active=false` not rendered at all).
- **A11y:** `role="tablist"` + `role="tab"` + `aria-selected`; `aria-controls`→grid region id; arrow keys move focus; wrap selection; `aria-label` on strip. Focus ring gold.
- **Motion:** active chip gets layoutId pill background (shared element) for a smooth sliding "pill" (`motion.span layoutId="chip"`); disabled under reduced motion.

#### 6.1.4 `ProductSheet`

- **Anatomy:** bottom sheet, drag handle, max-height 90dvh, `overflow-y-auto` body, image top, content, sticky CTA footer inside sheet. See §3.3 wireframe.
- **States:** opening (spring slide `y: "100%"→0`, spring `{damping:26, stiffness:300}`), closing (reverse), disabled (sold-out/inactive body), error (variant fetch fail → inline retry in body), loading (skeleton §3.9 while fetching `/api/products/[id]`).
- **A11y:** `role="dialog"` `aria-modal="true"` `aria-labelledby` (title id); focus trap (shadcn Dialog pattern); `Escape` closes; backdrop click closes; scroll lock; initial focus on first focusable; returns focus to opening card. Contrast: dim backdrop `bg-chocolate-950/60`.
- **Motion:** slide + backdrop fade `animate={{opacity:[0,1]}}`; price updates on variant change with a subtle 120 ms `AnimatePresence` flip of the number.

#### 6.1.5 `CartSheet`

- **Anatomy:** bottom sheet (reuse sheet shell), line-item rows, fulfilment segmented control, totals, CTA. See §3.4.
- **States:** default; empty (§3.8); "Clear" confirm (button morphs to "Confirm clear?"); disabled CTA when closed (`⚠` note); loading (quantities optimistic-update with 150 ms spinner on the row, rollback on failure); error (row-level "Couldn't update" + retry).
- **A11y:** `role="dialog"` modal, line items as `li`/`role="list"`; each stepper `aria-label="Change quantity of Nutella Waffle"`, live region announcing "Qty 2 of Nutella Waffle" on change; totals `aria-live="polite"`.
- **Motion:** rows `AnimatePresence` slide/height collapse on remove; total number flip 150 ms; CTA `whileTap scale .98`.

#### 6.1.6 `CheckoutForm`

- See §3.5–3.6. **States:** pristine / focused / valid / error per field; submitting (CTA spinner, disabled); server error banner; success morphs to §3.7.
- **A11y:** `<form novalidate>` (custom Zod validation), labels `<label htmlFor>` always visible (no placeholder-as-label), `inputMode="tel"` on phone, `enterKeyHint="next"/"send"`, `aria-invalid` + `aria-describedby` per error, errors `role="alert"`, submit `type="submit"` and the CTA is the submit button, `aria-busy` during submit.
- **Motion:** focus ring via CSS transition; on error, shake the invalid field container 2×20 px, 200 ms (skipped under reduced motion); submit CTA pulses (opacity) while loading.

#### 6.1.7 `FloatingCartBar`

- **Anatomy:** fixed bottom, `inset-x-0 bottom-0` (safe-area padding `pb-[env(safe-area-inset-bottom)]`), pill/card `m-3` or full-width bar on mobile, `shadow-lifted`. Left: cart icon + badge count + total. Right: "View cart" pill (or whole bar = CTA to open CartSheet).
- **States:** hidden when `count===0` (with 200 ms exit animation); visible with badge pop on change; disabled? No — bar is always actionable.
- **A11y:** `role="button"`/button with `aria-label="Open cart, 2 items, total ₹597"`; badge `aria-hidden` (count is in the label); live region announces "Cart updated: 2 items".
- **Motion:** `AnimatePresence` slide up/down (hide when scrolled far up the page? — keep visible always on mobile for zero-friction; optional desktop "hide on scroll down / show on scroll up"); badge count `key={count}` spring pop (`scale 1→1.35→1`).

#### 6.1.8 `QtyStepper`

- **Anatomy:** `[−] value [+]`, 44 px square buttons, 32–40 px value width, pill container `rounded-full bg-chocolate-100`. On ProductCard: value 0 renders as just `[+]`.
- **States:** default; `−` disabled at 1 (in cart; but **not** on card where 0→1 is the norm); `+` disabled at stock max (show `stock_qty` hint if finite); press `scale-0.92`; loading (brief disabled during optimistic sync).
- **A11y:** buttons with `aria-label="Decrease quantity"/"Increase quantity"`, value as `aria-live="polite"` output; 44×44 targets (§7.2).
- **Motion:** value change animates via 100 ms flip/scale on the number (`key={value}`).

### 6.2 Admin components (desktop-first, shadcn-based)
All admin components: mouse + keyboard + screen-reader usable; 36 px dense rows OK (desktop, non-touch) but keep ≥32 px; gold focus ring on interactive elements.

#### 6.2.1 `DataTable`

- **Anatomy:** sortable column headers (asc/desc arrows), row actions `⋮` menu (Edit / Toggle active / Duplicate), inline active `ToggleSwitch`, empty state row ("No products yet — Add product"), optional search + filter + pagination (10/page).
- **States:** default / hover row (bg chocolate-50) / selected / disabled row (`is_active=false` dimmed, "off" chip) / loading (skeleton rows) / error (banner + retry).
- **A11y:** real `<table>` with `<th scope>`, `aria-sort` on active column, row actions menu = shadcn DropdownMenu (keyboard nav), `aria-live` for row count.

#### 6.2.2 `ImageUpload`

- **Anatomy:** dashed drop zone (`role="button"`), click-to-browse, drag-drop, paste; preview square; buttons Replace / Remove; client re-encode to WebP (max 1000×1000, quality 80) then `POST /api/admin/upload` → signed URL → `PUT`; progress bar; success thumbnail + public URL state.
- **States:** idle / dragging (`border-gold-500`, bg gold-50) / uploading (progress, disabled) / success (✓ + preview) / error (file type >2MB, "Re-encode failed") / existing-image (edit mode).
- **A11y:** label links to hidden `<input type="file">`; drop zone keyboard-activated (Enter/Space); error `role="alert"`; alt set separately by product name.

#### 6.2.3 `ToggleSwitch`

- **Anatomy:** 44×24 px track, 20 px knob, label to the right; `role="switch"` `aria-checked`; keyboard Space toggles; disabled state (`opacity-50`, `aria-disabled`). On state = chocolate-800 with gold knob; off = chocolate-200 track. Motion: knob 150 ms spring slide.

#### 6.2.4 `SortableList`

- **Anatomy:** vertical list rows each with drag handle (`⋮⋮`), visible order number, content slot, remove `×`; used for categories, variants, offers ordering.
- **States:** default / dragging (row lifts, `shadow-lifted`, `scale 1.02`, item behind dims) / drop (re-animate into place) / disabled (readonly view) / error (row-level).
- **A11y:** rows `role="list"`; each draggable `tabIndex=0`, drag handle keyboard: `Alt+↑/↓` moves, announces "Moved to position 3"; `aria-roledescription="sortable"` on handle; touch drag via pointer events with `touch-action:none` on handle.
- **Motion:** `Reorder.Group`/`Reorder.Item` (framer-motion) with spring layout animation; disabled under reduced motion (fall back to up/down buttons? → see §11).

#### 6.2.5 `ProductForm` / `OfferForm` / `SettingsForm`

- **Anatomy:** shadcn Dialog + Form (react-hook-form + Zod). ProductForm per §4.4 (variants repeater = SortableList), OfferForm per §4.5, SettingsForm per §4.6 (long-form page, not dialog).
- **States:** pristine/dirty (`Save` disabled until dirty), per-field error, submit loading, success toast, server error banner; SettingsForm shows "Saved ✓ — storefront updated".
- **A11y:** Dialog focus trap + `Escape` + `aria-describedby` (description) + close confirm when dirty; labels always visible; errors inline `aria-describedby`.
- **Motion:** dialog spring scale/fade (shadcn default, 150–250 ms); nothing else heavy.

---

## 7. Accessibility Requirements (WCAG AA)

1. **Contrast on brown palette (AA, 4.5:1 body / 3:1 large):**

- Text on cream: `chocolate-950` (#1A0F0B on #FDFAF5) ≈ 16+:1 ✓.
- **Gold on cream must be **`gold-600`** (#A87E14, ≈4.8:1)** for text/prices; `gold-500` (#C9971E) is *graphics-only* (badges OK with white/`chocolate-950` text, or on chocolate-950 backgrounds where contrast passes).
- Placeholder/disabled `chocolate-400` (#8A6247 on cream) ≈ 4.0:1 — acceptable for placeholder, **not** for essential text. Essential disabled-state text uses `chocolate-500`.
- WhatsApp green button: white text on `whatsapp-500` #25D366 ≈ 2.1:1 — fails AA for normal text. **Fix:** use `whatsapp-600` #1DA851 (white text ≈ 3.3:1 — still short) → **use dark text or darken**: order CTA = `#128C4B`-family (white text ≈ 4.9:1) or white text on `#0E7A3F`. Spec: **order CTA uses **`whatsapp-600`**-dark variant with white text meeting 4.5:1** (Final hexes validated by Frontend against WCAG; intent locked: CTA must pass AA).
- Error text `error` #B91C1C on cream ≈ 5.4:1 ✓.
2. **Touch targets:** all interactive ≥44×44 CSS px (storefront; admin ≥32 desktop, ≥44 if touch device). No exceptions for stepper `−`/`+`.
3. **Labels:** every input has a visible `<label>`; placeholder never the only label; error messages linked via `aria-describedby`; groups (variants, fulfilment) use `fieldset`+`legend` or `aria-labelledby`.
4. **Focus states:** visible gold ring (`--shadow-focus`) on every interactive element; never `outline:none` without replacement; `:focus-visible` only (no focus ring on mouse click unless keyboard).
5. **Reduced motion:** `prefers-reduced-motion` → disable sheet slide (fade only), stagger, parallax, badge pop (opacity only), skeleton shimmer (static), stepper flip, SortableList drag (fallback keyboard reorder), shake on error. Use `MotionConfig reducedMotion="user"` (framer-motion) globally.
6. **Announcements:** cart count, qty changes, price changes, "Copied", "Saved" use polite live regions (`role="status"`); errors use `role="alert"`.
7. **Semantics:** real buttons/links; `alt` on all images (product name, or `alt=""` decorative); empty states get `role="status"`; sheets are proper dialogs with focus trap; carousel keyboard-safe.
8. **Reduced data:** skeleton screens `aria-hidden`; every interactive label communicates purpose ("Open cart", "Change quantity of X").

---

## 8. Responsive Rules

### 8.1 Breakpoints
Mobile-first. Tailwind defaults: `sm 640 · md 768 · lg 1024 · xl 1280`.

RangeTargetLayout`<640` (sm down)small phones (360–414)2-col product grid, full-width bars, sheets full-width, `dvh` safe areas`640–1023`tablets (portrait)3-col grid, hero taller, sheets max-width 480 centered, FloatingCartBar centered pill`≥1024`desktop/tablet-landscapeStorefront: max-width 1120 container, 4-col grid, sticky sidebar not used (still mobile-ish for customers); Admin: full sidebar layout
### 8.2 Storefront adaptation

- **Small phones (<380 px):** reduce card image aspect to 1:1, price font 13 px, gutters `px-3`; FloatingCartBar stays full-width; sheets `max-h-[92dvh]`.
- **Tablets (640–1023):** grid 3-col; hero headline `text-5xl`; FloatingCartBar becomes a centered pill (`max-w-md mx-auto`, still ≥44 targets); sheets centered with `max-w-lg mx-auto rounded-2xl` (desktop-sheet look).
- **Desktop (≥1024):** content column centered (grid on the sides hidden), 4-col grid, hover states active, offer carousel gains chevrons and shows 3.5 cards. Bottom sheets become centered dialog-style panels (still called ProductSheet/CartSheet internally) — same components, width constrained.
- Breakpoints are purely layout; interaction model (sheets, steppers) is identical everywhere.

### 8.3 Admin adaptation

- **Desktop-first (≥1024):** sidebar `w-64` fixed, content `max-w-6xl`, DataTable full width, dialogs `max-w-2xl`.
- **Tablet (768–1023):** sidebar collapses to icon rail (`w-16`), tables horizontally scroll within `overflow-auto` card.
- **Mobile (<768):** sidebar → bottom tab bar (4–5 tabs), tables render as card list (row = stacked mini-card) or keep scrollable table (pick list view; QA to verify), dialogs full-screen sheets.

---

## 9. Baseline UX Optimizations (explicit requirements)

1. **Phone auto-fill for repeat customers:** on successful checkout submit, persist `{name, phone}` in `localStorage` key `cz.customer` (storefront scope). On next CheckoutForm mount, pre-fill. A one-line hint below phone: "Saved on this device — used to fill this form." A "Clear" link forgets it. **No PII leaves the device**; nothing sent server-side. Respect the fact that cart lives in `stores/cart.ts` (same localStorage pattern).
2. **Reorder:** the "Copied" order message + cart both survive a reload (`stores/cart.ts` persist). No "repeat order" list (no history by design) — but the WhatsApp message preview doubles as a re-send artifact.
3. **Cart survives reload:** Zustand `persist` middleware → `localStorage`; cart restores on first render; qty/variant items validated against a fresh `/api/catalog` snapshot when present (stale product → row marked "unavailable", removable, price re-checked at checkout server-side).
4. **Strikethrough pricing on offers:** any product with an active offer shows original `strikethrough` (chocolate-400, `line-through`) + discounted price in gold. Applied on ProductCard, ProductSheet, and line items where the offer still applies. Price math **display** is client-side; **authoritative** math is `lib/pricing/discount.ts` at checkout.
5. **WhatsApp-not-installed fallback:** open `waUrl` via `window.open`. Heuristic detection: if `document.hidden` stays false within ~1.5 s (tab didn't blur / no visibilitychange), assume the app didn't open → show success panel with elevated **Copy message** + **Open web.whatsapp.com** (link to `https://web.whatsapp.com/send?phone=...&text=...`). Always provide Copy + web link in the success state regardless, so this is not a hard failure. Server keeps returning the *pure message* + `waUrl` so either path is available.
6. **Open/closed awareness:**

- Derived client-side (SSR data) from `shop.is_open` + `shop.timings` jsonb: state = `open` / `closed` / `ordering-paused`.
- Surfaces: brand-bar chip (home), ProductSheet footer chip, CartSheet warning, CheckoutForm warning, disabled CTAs with reason. Browsing always allowed; only ordering is gated. Copy per state defined in §3.8.
7. **Preview & live updates:** admin mutations → `revalidateTag('catalog')` → storefront ISR refreshes within seconds (per DoD). Frontend shows a toast "Saved — live" on admin save.

---

## 10. Inputs Needed (cross-team)
FromNeeded to design/confirmPMConfirmed copy for closed/paused banners; whether a "pre-order while closed" flow is in scope for MVP (affects CTA states); delivery address handling (note field vs. new field)FrontendValidate CTA contrast fix for WhatsApp green (final AA hex); confirm `MotionConfig reducedMotion` global; confirm shadcn Dialog is the sheet shell baseBackendExact Zod field constraints for name/phone/note (so UI errors match server 400 codes 1:1); the `{error}` envelope code enum (UI maps codes → messages)WhatsApp Expert`waUrl` format incl. phone normalization; confirm `web.whatsapp.com` fallback URL shape; message template field order (name/phone/fulfilment placement)Database Engineer`timings` jsonb shape (per-day open/close, holiday flag) so the closed-state logic can parse itQAAccessibility audit pass (axe/WCAG AA) on brown palette; touch-target checks; WhatsApp-not-installed heuristic reliability on Android WebViewPM/BackendDecision: 1:1 offer↔product mapping assumption (offer applies via `offer_products` OR `applies_to_all`) — UI must render both
---

## 11. Deferred

- **Delivery address** beyond the note field (MVP: note only; flagged for V2).
- **Currency selection UI** in SettingsForm (data exists; rendering a picker deferred — display-only until PM confirms multi-currency need).
- **Admin dark mode** (`.dark` palette sketched; storefront stays light).
- **SortableList keyboard-fallback** (button up/down) if reorder drag complexity exceeds MVP; PM/QA to weigh.
- **Hero imagery copy/asset direction** (photography brief to PM; placeholder gradients acceptable).
- **Detailed per-day timings editor UX** (SettingsForm lists rows; advanced recurring-rule editor deferred).
- **Attribution/entry-point analytics** (no tracking for MVP; design assumes identical entry flows).
