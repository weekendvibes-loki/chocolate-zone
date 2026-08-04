# Chocolate Zone — Backend & API Design Specification
**Owner:** Backend Developer · **Status:** Draft v1 (implementation-ready) · **Audience:** Frontend Developer, QA, Supabase Expert, DB Engineer, WhatsApp Expert, Auth Specialist, PM
**Locked contract:** `docs/ARCHITECTURE.md` (v1). This document implements §4–§6 exactly (folder structure, API surface, envelope). It does not rename or contradict the locked stack, data model, auth model, storage, or WhatsApp flow.

---

## 0. Reading Guide
SectionWhat it contains1Conventions: envelope, money, auth, cache, folder deltas2Shared domain types (`lib/types/domain.ts`)3Zod schemas + phone normalization + sanitization (`lib/validation/*`)4Error model (codes table, HTTP mapping, envelope helpers)5Pricing service (`lib/pricing/money.ts`, `lib/pricing/discount.ts`)6Public routes: `GET /api/catalog`, `GET /api/products/[id]`, `POST /api/checkout/whatsapp`7Admin routes: categories, products, offers, shop, upload8Service layer (`lib/services/*`)9Caching & revalidation (`lib/revalidate.ts`)10Rate limiting & abuse protection11Auth guards (admin session verification)12Sample responses13Inputs needed (from other agents)14Deferred
---

## 1. Conventions

### 1.1 Response envelope (locked)
Every Route Handler returns exactly one of:

```ts
// success
{ "data": { ... } }

// error
{ "error": { "code": "PRODUCT_UNAVAILABLE", "message": "Human readable, safe to render.", "field": "phone"?, "details": { ... }? } }
```

```ts
// lib/http.ts  (new — envelope helpers; shared by all routes)
import { NextResponse } from 'next/server';
import type { ApiError, ApiEnvelope } from '@/types/domain';

export function ok<T>(data: T): ApiEnvelope<T> { return { data }; }

export function fail(code: ErrorCode, message: string, field?: string, details?: Record<string, unknown>): ApiEnvelope<never> {
  return { error: { code, message, ...(field ? { field } : {}), ...(details ? { details } : {}) } };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(ok(data) as ApiEnvelope<T>, init);
}

export function jsonFail(code: ErrorCode, status: number, message: string, field?: string, details?: Record<string, unknown>) {
  return NextResponse.json(fail(code, message, field, details), { status });
}

export const STATUS_FOR: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400, INVALID_PHONE: 400, EMPTY_CART: 400, INVALID_FILE: 400,
  UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  CONFLICT: 409, SLUG_TAKEN: 409, CATEGORY_IN_USE: 409, PRODUCT_IN_USE: 409,
  STORE_CLOSED: 409, ORDERING_DISABLED: 409, DELIVERY_UNAVAILABLE: 409, PICKUP_UNAVAILABLE: 409,
  PRODUCT_UNAVAILABLE: 409, VARIANT_UNAVAILABLE: 409, INSUFFICIENT_STOCK: 409,
  LIMIT_EXCEEDED: 429, INTERNAL_ERROR: 500,
};
```

The HTTP status is chosen by the code (see §4). `message` is always safe to render in the UI (no HTML, already escaped) and never contains server internals. `details` is optional machine-readable context (e.g., `{ productId, requested, available }`).

### 1.2 Money convention (locked-in decision)
**All monetary values in API request/response payloads are integer minor units of **`shop_settings.currency` (paise for INR, cents for USD).

- `base_price`, `price_delta`, `discount_value` (fixed), `delivery_fee`, `free_delivery_threshold`, checkout `total` → **minor units**.
- Postgres `numeric(10,2)` comes back from Supabase as a string (`"1299.50"`). Convert at the data boundary with `lib/pricing/money.ts`.
- All pricing math is integer-only. There are **no floats anywhere in pricing**. This is the single most important correctness decision in this doc.

```
base_price: 129950   // = ₹1,299.50
total: 54500         // = ₹545.00
```

Admin forms convert to/from display currency client-side; the shared schema doc §3 documents this so UI errors match server 1:1.

### 1.3 Auth convention

- Public routes: no auth.
- Admin routes: **handler is the guard**. Every admin handler calls `requireAdmin(request)` (signature in §11, implementation owned by the Authentication Specialist — see Inputs needed §13) before touching the DB. `middleware.ts` refreshing the session and blocking `/admin/*` + `/api/admin/*` is convenience only, never the security boundary.
- Checkout reads: anon client (`lib/supabase/server.ts`) + RLS SELECT. All writes: service role (`lib/supabase/admin.ts`).

### 1.4 Cache convention

- Catalog-family reads are cached with `unstable_cache(..., { tags: ['catalog'], revalidate: 60 })`.
- Checkout is **never cached**. Availability, prices, offers and open/ordering state are re-read live from the DB at submission time.
- Any successful admin mutation calls `revalidateCatalog()` (`lib/revalidate.ts`) so the storefront updates within seconds (§9).

### 1.5 Folder deltas (extensions only, no contradictions)
Locked folders are used exactly. The following **new files** are added inside already-locked folders, plus one new top-level folder:

```
lib/
├── http.ts                      # NEW: envelope helpers (ok/fail/jsonOk/jsonFail, STATUS_FOR)
├── validation/
│   ├── schemas.ts               # LOCKED: shared Zod schemas
│   ├── phone.ts                 # NEW: normalizePhone
│   └── sanitize.ts              # NEW: sanitizeText (control-char strip + HTML-escape)
├── rate-limit.ts                # NEW: checkout + magic-link throttle helpers
├── services/                    # NEW: domain logic (see §8)
│   ├── catalog.ts  products.ts  checkout.ts  data-source.ts
│   ├── categories.ts  adminProducts.ts  offers.ts  shop.ts  uploads.ts
└── whatsapp/order-message.ts    # LOCKED: import contract only (see §6.3.6) — WhatsApp Expert owns internals
```
`lib/auth/require-admin.ts` is owned by the Authentication Specialist (§11).

---

## 2. Shared Domain Types (`lib/types/domain.ts`)
Owned here but shaped by the DB Engineer's DDL (see §13). Supabase returns `numeric` as `string` and `timestamps` as ISO strings; services convert at the boundary.

```ts
// lib/types/domain.ts
export type ErrorCode =
  | 'VALIDATION_ERROR' | 'INVALID_PHONE' | 'EMPTY_CART' | 'INVALID_FILE'
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'CONFLICT' | 'SLUG_TAKEN' | 'CATEGORY_IN_USE' | 'PRODUCT_IN_USE'
  | 'STORE_CLOSED' | 'ORDERING_DISABLED' | 'DELIVERY_UNAVAILABLE' | 'PICKUP_UNAVAILABLE'
  | 'PRODUCT_UNAVAILABLE' | 'VARIANT_UNAVAILABLE' | 'INSUFFICIENT_STOCK'
  | 'LIMIT_EXCEEDED' | 'INTERNAL_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}
export type ApiEnvelope<T> = { data: T } | { error: ApiError };

export type Currency = string;                       // ISO 4217, e.g. 'INR'
export type Minor = number;                          // integer minor units (paise/cents)

export interface TimingRule {                        // shape owned by DB Engineer (§13)
  day: number | string;                              // 0=Sun..6=Sat, or 'all'
  open?: string | null;                              // "10:00"
  close?: string | null;                             // "21:00"
  closed?: boolean;
}

export interface ShopSettings {
  id: string;
  brand: string;
  logo: string | null;
  theme: Record<string, unknown>;
  currency: Currency;
  whatsapp_number: string;                           // E.164 digits, e.g. '919876543210'
  address: string | null;
  timings: TimingRule[] | null;
  delivery_fee: string;                              // numeric string from DB
  free_delivery_threshold: string | null;            // numeric string | null
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  is_open: boolean;
  ordering_enabled: boolean;
  announcement: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: string;                                // numeric string → minor units at boundary
  image_url: string | null;
  is_featured: boolean;
  is_veg: boolean | null;
  stock_qty: number | null;                          // null = unlimited
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;                                      // group label, e.g. 'Size'
  option: string;                                    // e.g. 'Large'
  price_delta: string;                               // numeric string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;                            // percentage (e.g. "10") or currency amount ("5000" = ₹50)
  applies_to_all: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  offerProductIds: string[];                         // resolved from offer_products (service-side)
}

// ---- Public aggregates -------------------------------------------------

export interface CatalogProduct extends Product {
  bestOfferId: string | null;                        // server-computed convenience for strikethrough display
}
export interface Catalog {
  shop: ShopSettings;
  categories: Category[];                            // active, sort_order asc
  products: CatalogProduct[];                        // active, sort_order asc
  variantsByProduct: Record<string, ProductVariant[]>; // active variants only
  offers: Offer[];                                   // active + within window
  generatedAt: string;
}

export interface ProductDetail {
  product: CatalogProduct;
  variants: ProductVariant[];                        // active variants
  category: { id: string; slug: string; name: string } | null;
  bestOffer: Offer | null;
}

// ---- Checkout ----------------------------------------------------------

export type Fulfilment = 'delivery' | 'pickup';

export interface CheckoutItemInput { productId: string; quantity: number; variantId?: string; }
export interface CheckoutInput {
  name: string; phone: string; fulfilment: Fulfilment; note: string | null;
  items: CheckoutItemInput[];
}
export interface PricedLine {
  productId: string;
  productName: string;
  variant: { id: string; name: string; option: string } | null;
  unitPrice: Minor;          // base_price + Σ variant deltas
  quantity: number;
  lineSubtotal: Minor;       // unitPrice * quantity
  discount: Minor;           // applied offer discount
  lineTotal: Minor;          // lineSubtotal - discount
  appliedOffer: { id: string; title: string } | null;
}
export interface CheckoutTotals {
  subtotal: Minor;           // Σ lineSubtotal (pre-discount)
  discount: Minor;           // Σ line discount
  delivery: Minor;           // delivery fee or 0 (free-threshold / pickup)
  total: Minor;              // subtotal - discount + delivery
}
export interface CheckoutResult {
  kind: 'ok';
  shop: ShopSettings;
  currency: Currency;
  lines: PricedLine[];
  totals: CheckoutTotals;
}
export interface CheckoutErrorResult {
  kind: 'error';
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}
export interface CheckoutResponse {
  message: string;   // from buildOrderMessage().text
  waUrl: string;     // https://wa.me/<shop>?text=<encoded>
  total: Minor;
  currency: Currency;
}
```

---

## 3. Validation, Normalization, Sanitization

### 3.1 Shared Zod schemas (`lib/validation/schemas.ts`)
Single source of truth, imported by both the server handlers **and** the client forms (so UI errors map 1:1 to server 400s — UX §10 requirement).

```ts
// lib/validation/schemas.ts
import { z } from 'zod';

export const phoneSchema = z
  .string({ errorMap: () => ({ message: 'Enter a valid phone number.' }) })
  .trim()
  .min(8, 'Enter a valid phone number.')
  .max(20, 'Enter a valid phone number.')
  .regex(/^\+?[0-9][0-9 ().\-]{6,18}$/, 'Enter a valid phone number.');

export const nameSchema = z
  .string({ required_error: 'Name is required.' })
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(80, 'Name must be at most 80 characters.')
  .regex(/^[\p{L}\p{N} .'\u2019-]+$/u, 'Name contains invalid characters.');

export const noteSchema = z
  .string()
  .trim()
  .max(500, 'Note must be at most 500 characters.');

export const fulfilmentSchema = z.enum(['delivery', 'pickup']);

export const checkoutItemSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product reference.' }),
  variantId: z.string().uuid({ message: 'Invalid variant reference.' }).optional(),
  quantity: z.number().int('Quantity must be a whole number.').min(1, 'Quantity must be at least 1.').max(99, 'Quantity must be at most 99.'),
});

export const checkoutRequestSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  fulfilment: fulfilmentSchema,
  note: noteSchema.optional(),
  items: z.array(checkoutItemSchema)
    .min(1, 'Your cart is empty.')
    .max(50, 'Too many items. Please remove some and try again.'),
});

// ---- Admin schemas -----------------------------------------------------

export const urlSchema = z.string().trim().url('Enter a valid URL.').max(2048);
export const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens.').max(80).optional();

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  slug: slugSchema,
  emoji: z.string().trim().max(8).optional().nullable(),
  image_url: urlSchema.optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const variantInputSchema = z.object({
  id: z.string().uuid().optional(),          // present → upsert; absent → create
  name: z.string().trim().min(1).max(60),
  option: z.string().trim().min(1).max(60),
  price_delta: z.number().int().min(0).max(10_000_000),   // minor units
  is_active: z.boolean().optional(),
});

export const productInputSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  base_price: z.number().int().min(1).max(10_000_000),    // minor units
  image_url: urlSchema.optional().nullable(),
  is_featured: z.boolean().optional(),
  is_veg: z.boolean().optional().nullable(),
  stock_qty: z.number().int().min(0).max(1_000_000).optional().nullable(), // null = unlimited
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  variants: z.array(variantInputSchema).max(20).optional(),
});

export const offerInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  image_url: urlSchema.optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive().max(1_000_000),    // % (1..100 enforced below) or fixed minor units
  applies_to_all: z.boolean(),
  product_ids: z.array(z.string().uuid()).max(500).default([]),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
}).superRefine((o, ctx) => {
  if (o.discount_type === 'percentage' && (o.discount_value <= 0 || o.discount_value > 100)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discount_value'], message: 'Percentage discount must be between 1 and 100.' });
  }
  if (o.discount_type === 'fixed' && !Number.isInteger(o.discount_value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discount_value'], message: 'Fixed discount must be a whole amount.' });
  }
  if (!o.applies_to_all && o.product_ids.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['product_ids'], message: 'Select at least one product for a scoped offer.' });
  }
  if (o.starts_at && o.ends_at && o.starts_at >= o.ends_at) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ends_at'], message: 'End must be after start.' });
  }
});

export const shopSettingsInputSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  logo: urlSchema.optional().nullable(),
  theme: z.record(z.string(), z.unknown()).optional(),
  currency: z.string().trim().length(3).optional(),
  whatsapp_number: z.string().trim().regex(/^\d{7,15}$/, 'WhatsApp number must be 7-15 digits.'),  // E.164 without '+'
  address: z.string().trim().max(500).optional().nullable(),
  timings: z.array(z.record(z.string(), z.unknown())).max(100).optional().nullable(),
  delivery_fee: z.number().int().min(0).max(1_000_000).optional(),          // minor units
  free_delivery_threshold: z.number().int().min(0).max(100_000_000).optional().nullable(),
  delivery_enabled: z.boolean().optional(),
  pickup_enabled: z.boolean().optional(),
  is_open: z.boolean().optional(),
  ordering_enabled: z.boolean().optional(),
  announcement: z.string().trim().max(500).optional().nullable(),
});

export const uploadRequestSchema = z.object({
  bucket: z.enum(['product-images', 'offer-images']),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().positive().max(2 * 1024 * 1024, 'Image must be at most 2 MB.'),
});

// Shared helper used by every handler
export function parseWithSchema<T>(schema: z.ZodType<T>, body: unknown):
  | { ok: true; data: T }
  | { ok: false; errors: z.ZodError } {
  const r = schema.safeParse(body);
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: r.error };
}
```

### 3.2 Phone normalization (`lib/validation/phone.ts`)

```ts
// lib/validation/phone.ts
/** Deterministic, separators-agnostic normalization to a canonical E.164-ish form.
 *  Returns null when the result is not 7-15 digits. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s().\-]/g, '');   // strip spaces, dots, parens, dashes
  let digits = s;
  if (s.startsWith('+')) {
    digits = s.slice(1);
  } else if (s.startsWith('00')) {                  // international dialing prefix
    digits = s.slice(2);
  } else if (s.startsWith('0')) {                   // leading trunk zero for local numbers
    digits = s.slice(1);
  }
  if (!/^\d{7,15}$/.test(digits)) return null;
  return `+${digits}`;
}
```

Rules:

- Accepts `+`, digits, spaces, dots, parens, hyphens; strips all separators.
- Keeps `+` prefix; converts `00…` → `+`; strips a leading trunk `0`.
- Requires 7–15 digits (E.164 range) after normalization → else `INVALID_PHONE`.
- No default-country inference in MVP (the customer phone is informational in the message, not used for routing). Default country code decision is deferred to PM (see §13).
- The normalized value is what goes into the WhatsApp message, the `waUrl` (shop number) and rate-limit hashing.

### 3.3 Sanitization (`lib/validation/sanitize.ts`)
Goal: prevent **WhatsApp message injection** — a newline or control character in `name`/`note` could inject fake line items, fake totals, or change the message's meaning. Applied server-side after validation, and the result is what the message builder sees.

```ts
// lib/validation/sanitize.ts
const CONTROL_RE = /[\u0000-\u001F\u007F\u0080-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g; // C0/C1 + bidi controls

export function stripControlChars(s: string): string {
  return s.replace(CONTROL_RE, '');   // removes CR, LF, TAB, NUL, bidi marks, etc.
}

export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Order matters: normalize → strip control chars → collapse whitespace → trim → escape. */
export function sanitizeText(raw: string): string {
  const noCtl = stripControlChars(raw)
    .replace(/\s+/g, ' ')        // collapse internal runs (incl. any stray whitespace)
    .trim();
  return htmlEscape(noCtl);
}
```

- CRLF injection is eliminated by `stripControlChars` (removes `\r` and `\n` outright — no newline survives into the message).
- HTML-escape protects the returned `message` when it is rendered as trusted inner content in the success panel (UX §3.7 preview). `encodeURIComponent` on `waUrl` handles the URL layer.
- The **WhatsApp Expert's builder must also escape/guard its own static template** (e.g., nothing user-controlled ever appears before the totals block) — internal sanitization of the template is their deliverable; the API guarantees the *inputs* it receives are clean.

---

## 4. Error Model
Envelope everywhere (§1.1). Mapping table (canonical — do not fork per-route):

ErrorCodeHTTPWhenClient-friendly `message` (example)`VALIDATION_ERROR`400zod failure / malformed JSON"Check the highlighted fields and try again." (details = flattened fields)`INVALID_PHONE`400phone fails zod or normalization"Enter a valid phone number."`EMPTY_CART`400items empty/absent"Your cart is empty."`INVALID_FILE`400upload type/size/name rejected"Image must be WebP/JPEG/PNG and under 2 MB."`UNAUTHORIZED`401admin session missing/expired"Please sign in to continue."`FORBIDDEN`403session valid but role not admin"You don't have permission to do that."`NOT_FOUND`404product/category/offer id unknown (public or admin GET/PUT/DELETE)"Product not found."`SLUG_TAKEN`409unique slug conflict"That slug is already in use."`CATEGORY_IN_USE`409hard-delete category still referenced by products"This category still has products. Deactivate it instead."`PRODUCT_IN_USE`409hard-delete product referenced by an offer"This product is part of an offer. Deactivate it instead."`CONFLICT`409generic uniqueness / stale-update conflict"This record was changed by someone else. Reload and try again."`STORE_CLOSED`409`is_open=false` at submission"We're closed right now. Please check our timings and come back!"`ORDERING_DISABLED`409`ordering_enabled=false` at submission"We're not taking orders at the moment."`DELIVERY_UNAVAILABLE`409delivery requested but `delivery_enabled=false`"Delivery is paused. Choose pickup instead."`PICKUP_UNAVAILABLE`409pickup requested but `pickup_enabled=false`"Pickup is paused. Choose delivery instead."`PRODUCT_UNAVAILABLE`409product id unknown/inactive at submission""Nutella Stack Waffle" is no longer available." (details.productId)`VARIANT_UNAVAILABLE`409variant id unknown/inactive/mismatched"That size is no longer available."`INSUFFICIENT_STOCK`409`stock_qty != null` and `stock_qty < qty`"Only 1 left of "Double Dark Brownie"." (details: requested/available)`LIMIT_EXCEEDED`429rate limit hit"Too many attempts. Please try again shortly." (+ Retry-After header)`INTERNAL_ERROR`500unexpected server error"Something went wrong. Please try again."

Conventions:

- `4xx` never include stack traces or DB error text; `INTERNAL_ERROR` is logged server-side (with request id) and returned generic.
- `5xx` also maps any Supabase error to `INTERNAL_ERROR` — never leak table/RLS details.
- All messages are static strings or composed from server-side domain data only (product names come from the DB, never from the client payload).

---

## 5. Pricing Service

### 5.1 `lib/pricing/money.ts` (pure)

```ts
// lib/pricing/money.ts
export type Minor = number;                    // integer minor units

/** DB numeric string → minor units. "1299.50" → 129950. Rounds half-up at >2 decimals. */
export function toMinor(value: string | number): Minor {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid money value: ${String(value)}`);
  return Math.round(n * 100);
}

/** minor units → DB numeric string. 129950 → "1299.50". */
export function fromMinor(minor: Minor): string {
  return (minor / 100).toFixed(2);
}

/** Human display. Uses Intl with the given currency; falls back to "<code> <amount>" if locale data is unavailable. */
export function formatMoney(minor: Minor, currency: Currency): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'symbol' })
      .format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export const roundHalfUp = (n: number): Minor => Math.round(n);

/** percentage discount on a line: single rounding at the LINE level to avoid drift. */
export function percentOf(minor: Minor, percent: number): Minor {
  return roundHalfUp((minor * percent) / 100);
}

export const add = (a: Minor, b: Minor): Minor => a + b;
export const subtract = (a: Minor, b: Minor): Minor => a - b;
```

Rounding rules (the contract):

1. Single conversion point from DB `numeric` → `Minor` (`toMinor`, half-up) at the data boundary.
2. Percentage discounts are computed on the **whole line** (`subtotal × pct / 100`) and rounded **once**, half-up — never per-unit then summed (avoids cumulative rounding drift).
3. Fixed discounts are integer minor units; `fixed × quantity`, **capped at the line subtotal** (a discount never exceeds the line cost).
4. All arithmetic thereafter is integer `Minor`; the final total is exact.
5. Display formatting happens only at the UI/`message` boundary (`formatMoney`); no formatted string is ever parsed back into math.

### 5.2 `lib/pricing/discount.ts` (pure)

```ts
// lib/pricing/discount.ts
import { toMinor, percentOf, type Minor } from './money';

export type OfferType = 'percentage' | 'fixed';

export interface OfferRule {
  id: string;
  title: string;
  discount_type: OfferType;
  discount_value: string;          // DB string; converted inside
  applies_to_all: boolean;
  productIds: string[];            // resolved from offer_products
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export function isOfferActive(o: OfferRule, now: Date): boolean {
  if (!o.is_active) return false;
  if (o.starts_at && new Date(o.starts_at) > now) return false;
  if (o.ends_at && new Date(o.ends_at) <= now) return false;
  return true;
}

export function offerAppliesTo(o: OfferRule, productId: string): boolean {
  return o.applies_to_all || o.productIds.includes(productId);
}

/** Discount for a line under one offer. Fixed is capped at the line subtotal. */
export function lineDiscount(unitPrice: Minor, quantity: number, o: OfferRule): Minor {
  const subtotal = unitPrice * quantity;
  if (o.discount_type === 'percentage') {
    return percentOf(subtotal, Number(o.discount_value));
  }
  const fixed = toMinor(o.discount_value);
  return Math.min(fixed * quantity, subtotal);
}

/** Best single offer for one line at its ACTUAL quantity (used at checkout). */
export function applyBestOffer(
  unitPrice: Minor,
  quantity: number,
  productId: string,
  offers: OfferRule[],
  now: Date,
): { offer: OfferRule | null; discount: Minor } {
  let best: OfferRule | null = null;
  let bestAmount = 0;
  for (const o of offers) {
    if (!isOfferActive(o, now) || !offerAppliesTo(o, productId)) continue;
    const d = lineDiscount(unitPrice, quantity, o);
    if (d > bestAmount) { best = o; bestAmount = d; }
  }
  return { offer: best, discount: bestAmount };
}

/** Best offer at qty=1 — used only for /api/catalog strikethrough display. */
export function bestOfferForProduct(offers: OfferRule[], productId: string, now: Date): OfferRule | null {
  return applyBestOffer(100, 1, productId, offers, now).offer;
}

/** Per-line pricing. Returns the complete priced line. */
export function priceLine(
  input: { productId: string; productName: string; variant: PricedLineVariant | null; unitPrice: Minor; quantity: number },
  offers: OfferRule[],
  now: Date,
): PricedLine {
  const lineSubtotal = input.unitPrice * input.quantity;
  const { offer, discount } = applyBestOffer(input.unitPrice, input.quantity, input.productId, offers, now);
  return {
    productId: input.productId,
    productName: input.productName,
    variant: input.variant,
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    lineSubtotal,
    discount,
    lineTotal: lineSubtotal - discount,
    appliedOffer: offer ? { id: offer.id, title: offer.title } : null,
  };
}
```

**Discount application order (the contract):**

1. Filter offers to those that are `is_active`, within `[starts_at, ends_at]`, relative to `now`.
2. Per line, consider offers that `applies_to_all` **or** are scoped to that product (`offer_products`).
3. **Offers do NOT stack.** Exactly one offer applies per line — the one producing the largest discount at that line's actual quantity.
4. Discount is applied on the pre-discount line subtotal; fixed is capped at the line subtotal.
5. Totals: `subtotal = Σ lineSubtotal` (pre-discount), `discount = Σ lineDiscount`, `delivery` (below), `total = subtotal − discount + delivery`.
6. A line never goes negative; `total` is never negative.
**Free-delivery decision (flagged):** the free-delivery threshold is evaluated against the **pre-discount subtotal** (gross order value). If `subtotal ≥ free_delivery_threshold`, delivery fee is waived (and `delivery = 0` is sent in `totals` so the message can show "Delivery free"). Confirm with PM (§13).

Both modules are pure and dependency-free → unit tests are trivial (input objects in, exact integers out). Test cases live with QA but the shapes are above.

---

## 6. Public Routes

### 6.1 `GET /api/catalog` — one-shot storefront aggregate

```ts
// src/app/api/catalog/route.ts
import { getCatalog } from '@/lib/services/catalog';
import { jsonOk, jsonFail } from '@/lib/http';

export async function GET() {
  try {
    const catalog = await getCatalog();
    return jsonOk(catalog);
  } catch (err) {
    console.error('[catalog]', err);
    return jsonFail('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
  }
}
```
`getCatalog()` (`lib/services/catalog.ts`) wraps the anon reads in `unstable_cache` (see §9) and returns a `Catalog`:

- `shop` — the single `shop_settings` row (id=1).
- `categories` — `is_active = true`, ordered by `sort_order asc`.
- `products` — `is_active = true`, ordered by `sort_order asc`, each with `bestOfferId` (server-computed via `bestOfferForProduct` over active offers) so the client can render strikethrough pricing without reimplementing offer math.
- `variantsByProduct` — active variants grouped by `product_id`.
- `offers` — active + within window, each with resolved `offerProductIds`.
- `generatedAt` — ISO timestamp (cache-aware; changes when purged).
Cache: `unstable_cache(..., { tags: ['catalog'], revalidate: 60 })` (§9). Storefront RSC pages that render from `fetch('/api/catalog')` may instead call `getCatalog()` directly with the same tag semantics.

Errors: `INTERNAL_ERROR` (500) on DB failure; the storefront error/empty states (UX §3.9) handle it.

### 6.2 `GET /api/products/[id]` — product detail + variants + best offer

```ts
// src/app/api/products/[id]/route.ts
import { NextRequest } from 'next/server';
import { getProductDetail } from '@/lib/services/products';
import { jsonOk, jsonFail } from '@/lib/http';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonFail('NOT_FOUND', 404, 'Product not found.');
  try {
    const detail = await getProductDetail(id);
    if (!detail) return jsonFail('NOT_FOUND', 404, 'Product not found.');
    return jsonOk(detail);
  } catch (err) {
    console.error('[products/:id]', err);
    return jsonFail('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
  }
}
```
`getProductDetail(id)` (`lib/services/products.ts`) returns `ProductDetail` (`{ product, variants, category, bestOffer }`) for an **active** product (inactive/unknown → `null` → 404). Cached per-id with `unstable_cache(..., ['product', id], { tags: ['catalog'], revalidate: 60 })`.

### 6.3 `POST /api/checkout/whatsapp` — validate + recompute + build message
This is the crown-jewel handler. The client *proposes*; the server *decides*. Full handler:

```ts
// src/app/api/checkout/whatsapp/route.ts
import { NextRequest } from 'next/server';
import { checkoutRequestSchema, parseWithSchema } from '@/lib/validation/schemas';
import { normalizePhone } from '@/lib/validation/phone';
import { sanitizeText } from '@/lib/validation/sanitize';
import { checkCheckoutRateLimit } from '@/lib/rate-limit';
import { createCheckoutDataSource } from '@/lib/services/data-source';
import { computeOrder } from '@/lib/services/checkout';
import { buildOrderMessage } from '@/lib/whatsapp/order-message';   // LOCKED import — see §6.3.6
import { jsonOk, jsonFail, STATUS_FOR } from '@/lib/http';

export async function POST(request: NextRequest) {
  if (!(await checkCheckoutRateLimit(request))) {
    return jsonFail('LIMIT_EXCEEDED', 429, 'Too many attempts. Please try again shortly.');
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonFail('VALIDATION_ERROR', 400, 'Request body must be valid JSON.'); }

  const parsed = parseWithSchema(checkoutRequestSchema, body);
  if (!parsed.ok) {
    return jsonFail('VALIDATION_ERROR', 400, 'Check the highlighted fields and try again.',
      undefined, { fields: parsed.errors.flatten() });
  }
  const { name, phone, fulfilment, note, items } = parsed.data;
  if (items.length === 0) return jsonFail('EMPTY_CART', 400, 'Your cart is empty.');

  const phoneOk = normalizePhone(phone);
  if (!phoneOk) return jsonFail('INVALID_PHONE', 400, 'Enter a valid phone number.', 'phone');
  const safeName = sanitizeText(name);
  const safeNote = note ? sanitizeText(note) : null;

  const result = await computeOrder(
    { name: safeName, phone: phoneOk, fulfilment, note: safeNote, items },
    createCheckoutDataSource(),
  );
  if (result.kind === 'error') {
    return jsonFail(result.code, STATUS_FOR[result.code], result.message, undefined, result.details);
  }

  const msg = buildOrderMessage({
    shop: result.shop,
    customer: { name: safeName, phone: phoneOk },
    fulfilment,
    note: safeNote,
    currency: result.currency,
    lines: result.lines,
    totals: result.totals,
  });

  const waUrl = `https://wa.me/${msg.phone}?text=${encodeURIComponent(msg.text)}`;

  return jsonOk({
    message: msg.text,
    waUrl,
    total: result.totals.total,
    currency: result.currency,
  });
}
```

#### 6.3.1 Steps in `computeOrder` (`lib/services/checkout.ts`) — the authoritative logic

```
export async function computeOrder(input: CheckoutInput, db: CheckoutDataSource): Promise<CheckoutResult | CheckoutErrorResult> {
  const settings = await db.getSettings();
  if (!settings) return err('STORE_CLOSED', 'We are closed right now. Please check our timings and come back!');
  if (!settings.is_open) return err('STORE_CLOSED', 'We are closed right now. Please check our timings and come back!');
  if (!settings.ordering_enabled) return err('ORDERING_DISABLED', 'We are not taking orders at the moment.');
  if (input.fulfilment === 'delivery' && !settings.delivery_enabled)
    return err('DELIVERY_UNAVAILABLE', 'Delivery is paused. Choose pickup instead.');
  if (input.fulfilment === 'pickup' && !settings.pickup_enabled)
    return err('PICKUP_UNAVAILABLE', 'Pickup is paused. Choose delivery instead.');

  const [products, variants, offers] = await Promise.all([
    db.getProducts(input.items.map(i => i.productId)),
    db.getVariants(input.items.flatMap(i => (i.variantId ? [i.variantId] : []))),
    db.getActiveOffers(),
  ]);
  const productById = new Map(products.map(p => [p.id, p]));
  const variantById = new Map(variants.map(v => [v.id, v]));
  const now = new Date();
  const offerRules = offers.map(toOfferRule);

  const lines: PricedLine[] = [];
  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product || !product.is_active)
      return err('PRODUCT_UNAVAILABLE', `"${product?.name ?? 'An item'}" is no longer available.`, { productId: item.productId });

    const unitPrice = toMinor(product.base_price)
      + (item.variantId ? variantDelta(variantById, item.variantId, product.id) : 0);

    if (product.stock_qty != null && product.stock_qty < item.quantity)
      return err('INSUFFICIENT_STOCK',
        `Only ${product.stock_qty} left of "${product.name}".`,
        { productId: product.id, requested: item.quantity, available: product.stock_qty });

    lines.push(priceLine({ productId: product.id, productName: product.name,
      variant: resolveVariant(variantById, item.variantId, product.id), unitPrice, quantity: item.quantity },
      offerRules, now));
  }

  const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  let delivery = 0;
  if (input.fulfilment === 'delivery') {
    const threshold = settings.free_delivery_threshold ? toMinor(settings.free_delivery_threshold) : null;
    const fee = toMinor(settings.delivery_fee);
    delivery = threshold != null && subtotal >= threshold ? 0 : fee;
  }

  return {
    kind: 'ok',
    shop: settings,
    currency: settings.currency,
    lines,
    totals: { subtotal, discount, delivery, total: subtotal - discount + delivery },
  };
}
```

Guards that reject **before** message-building, in order: settings present → `STORE_CLOSED` → `ORDERING_DISABLED` → fulfilment availability → per-line availability/stock/variant. `variantDelta`/`resolveVariant` return a typed `VARIANT_UNAVAILABLE` error when the variant is missing, inactive, or belongs to a different product (defense against cross-product variant swapping).

#### 6.3.2 Availability & stock rules

- Product must exist and be `is_active` → else `PRODUCT_UNAVAILABLE`.
- Variant (if provided) must exist, be `is_active`, and belong to the same product → else `VARIANT_UNAVAILABLE`.
- `stock_qty = null` → unlimited; `stock_qty < quantity` → `INSUFFICIENT_STOCK` with `{ productId, requested, available }`.
- Server does **not** decrement stock (no orders are stored — locked). Stock enforcement is point-in-time at submission; that's the guarantee the UI relies on.

#### 6.3.3 Offers
Applied per line via `applyBestOffer` with fresh offers from the DB (active + window + `applies_to_all` OR `offer_products`), non-stacking, best at actual quantity (§5.2). No offer id is ever accepted from the client.

#### 6.3.4 Delivery fee
`fulfilment === 'delivery'` → fee added unless pre-discount subtotal ≥ `free_delivery_threshold` (then 0). `pickup` → always 0. Fee/threshold read fresh from settings each call (so a mid-flight settings change is enforced at submission — US-11).

#### 6.3.5 No idempotency key needed
Checkout performs **no writes** — the only "side effect" is opening WhatsApp on the client. Double-submit therefore cannot corrupt state. The client disables the CTA while in-flight; the server additionally rate-limits per IP+phone (§10) which absorbs accidental double-taps. An `idempotencyKey` is deferred (§14) in case orders are ever persisted.

#### 6.3.6 WhatsApp builder INPUT/OUTPUT contract (locked import, internals owned by WhatsApp Expert)
`lib/whatsapp/order-message.ts` is imported by the checkout route. Backend defines **only** the input/output types and treats the implementation as a black box:

```ts
// lib/whatsapp/order-message.ts — INPUT/OUTPUT CONTRACT (Backend-owned types)
// IMPLEMENTATION OWNED BY: WhatsApp Integration Expert.

import type { Minor, PricedLine, ShopSettings, Fulfilment } from '@/types/domain';

export interface OrderMessageInput {
  shop: ShopSettings;                                  // includes whatsapp_number (E.164 digits, no '+')
  customer: { name: string; phone: string };           // phone already normalized ('+91…'), name already sanitized
  fulfilment: Fulfilment;
  note: string | null;                                 // already sanitized/escaped
  currency: string;                                    // ISO 4217
  lines: PricedLine[];                                 // server-computed, authoritative
  totals: { subtotal: Minor; discount: Minor; delivery: Minor; total: Minor };
}

export interface OrderMessageOutput {
  text: string;        // the full, human-readable WhatsApp message (line items, variants, qty,
                       // line prices, totals block, fulfilment, customer name/phone, note, brand/address/timings)
                       // Must NOT contain CR/LF injection (inputs already cleaned); expert's template is static-safe.
  phone: string;       // normalized shop number WITHOUT '+' for wa.me (e.g. '919876543210')
}

export declare function buildOrderMessage(input: OrderMessageInput): OrderMessageOutput;
```

- The route composes `waUrl = https://wa.me/${msg.phone}?text=${encodeURIComponent(msg.text)}`. The expert confirms the exact URL/encoding contract (see §13).
- The expert owns: template layout, field order, totals formatting (may use `formatMoney` from `lib/pricing/money.ts`), pickup/delivery header, note placement, and the `web.whatsapp.com/send?phone=…&text=…` fallback URL shape.

---

## 7. Admin Routes (session-guarded CRUD)
All under `/api/admin/*`. Every handler:

```
const session = await requireAdmin(request);   // auth helper — signature in §11, owned by Auth Specialist
if (!session.ok) return jsonFail('UNAUTHORIZED', 401, 'Please sign in to continue.');
```
Pattern (shared by every admin route, shown once in full for categories, then diffs):

### 7.1 `GET|POST /api/admin/categories` + `PUT|DELETE /api/admin/categories/[id]`

```ts
// src/app/api/admin/categories/route.ts
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';            // Auth Specialist (signature §11)
import { categoryInputSchema, parseWithSchema } from '@/lib/validation/schemas';
import { listCategories, createCategory } from '@/lib/services/categories';
import { jsonOk, jsonFail, STATUS_FOR } from '@/lib/http';

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session.ok) return jsonFail('UNAUTHORIZED', 401, 'Please sign in to continue.');
  try { return jsonOk({ categories: await listCategories() }); }
  catch (e) { return handleInternal(e); }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session.ok) return jsonFail('UNAUTHORIZED', 401, 'Please sign in to continue.');
  const parsed = parseWithSchema(categoryInputSchema, await readJson(request));
  if (!parsed.ok) return validationFail(parsed.errors);
  try {
    const category = await createCategory(parsed.data);
    return jsonOk({ category }, { status: 201 });
  } catch (e) { return mapDbError(e); }
}
```
`PUT /api/admin/categories/[id]` and `DELETE /api/admin/categories/[id]` mirror the pattern (full-body PUT; validation same schema).

- **DELETE semantics:** hard delete when no products reference the category; on FK violation (products exist) return `CATEGORY_IN_USE` (409) and instruct the admin to deactivate instead. FK behavior is a DB Engineer decision (see §13) — the handler detects the constraint violation via the Supabase error code and maps it; never auto-cascades deletes.
- **Slug auto-derivation:** when `slug` is omitted, `slugify(name)`; unique-violation → `SLUG_TAKEN`.

### 7.2 `GET|POST /api/admin/products` + `PUT|DELETE /api/admin/products/[id]`
Same guard pattern. Bodies use `productInputSchema` (variants nested, minor-unit prices).

- `POST /api/admin/products` → create product **and** its variants in one round trip (service inserts product, then variants).
- `PUT /api/admin/products/[id]` → update product + upsert/delete variants: variant inputs with `id` → update; without `id` → insert; variants in DB not present in payload → `is_active=false` (soft-deactivate, preserves FKs). Multi-table write: recommended as a single Postgres RPC (`admin_upsert_product`) owned by DB Engineer; MVP fallback is sequential writes with error rollback note (§14).
- `DELETE` → **soft delete** (`is_active=false`). Hard delete is unsafe because `offer_products` references products — the handler always soft-deletes and returns the deactivated row. (Hard delete with cascade is a DB decision, deferred.)
- Validation errors (e.g., negative price) → `VALIDATION_ERROR`; unique slug/name → `SLUG_TAKEN`/`CONFLICT`.

### 7.3 `GET|POST /api/admin/offers` + `PUT|DELETE /api/admin/offers/[id]`
Bodies use `offerInputSchema`; `applies_to_all=false` requires `product_ids` non-empty (superRefine). Service writes the offer row **and replaces** `offer_products` (delete-then-insert scoped to the offer) — transactionality via DB Engineer RPC recommended (§13).

- `discount_value` is a percentage when `discount_type='percentage'` (validated 1..100) or fixed minor units otherwise.

### 7.4 `GET|PUT /api/admin/shop`

- `GET` → `{ data: { shop: ShopSettings | null } }` (null → admin UI shows an "initialize" state; the create is just a `PUT` since it's a single-row upsert on id=1).
- `PUT` → body `shopSettingsInputSchema` (partial), upsert row id=1, then `revalidateCatalog()`. Full settings replace on save (admin form submits the complete object).

### 7.5 `POST /api/admin/upload` — signed upload URL

```ts
// src/app/api/admin/upload/route.ts
const BUCKET_EXT = { 'product-images': ['webp', 'jpeg', 'jpg', 'png'], 'offer-images': ['webp', 'jpeg', 'jpg', 'png'] } as const;
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session.ok) return jsonFail('UNAUTHORIZED', 401, 'Please sign in to continue.');

  const parsed = parseWithSchema(uploadRequestSchema, await readJson(request));
  if (!parsed.ok) return validationFail(parsed.errors);

  const { bucket, fileName, contentType, sizeBytes } = parsed.data;
  if (sizeBytes > MAX_BYTES) return jsonFail('INVALID_FILE', 400, 'Image must be under 2 MB.');
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!BUCKET_EXT[bucket].includes(ext)) return jsonFail('INVALID_FILE', 400, 'Unsupported file type.');

  const path = `${bucket}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error) return jsonFail('INTERNAL_ERROR', 500, 'Could not prepare upload. Please try again.');

  const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return jsonOk({ uploadUrl: data.signedUrl, publicUrl, path, bucket }, { status: 200 });
}
```

- Service role (`lib/supabase/admin.ts`) creates the signed upload URL; the browser then `PUT`s the (client-side WebP-re-encoded) file directly to storage. When the entity save that references `publicUrl` succeeds, `revalidateCatalog()` runs.
- Server never receives the binary. Content-type/size are enforced at signed-URL creation and re-checked in the handler.
- Paths are UUID-prefixed (unpredictable, no user-controlled segments); bucket is allowlisted; upload URLs are short-lived (Supabase default; expert/DB to confirm TTL).

---

## 8. Service Layer (`lib/services/*`)
**Rule: Route handlers are thin HTTP adapters; services own domain logic and DB access.** A handler: parses body, guards, validates, delegates, envelopes. It never contains pricing math, offer logic, or storage calls inline.

ServiceExportsDB clientNotes`catalog.ts``getCatalog()`anon (`server.ts`) via `unstable_cache`aggregate; cached, tag `catalog``products.ts``getProductDetail(id)`anon via `unstable_cache`per-id cache, tag `catalog``checkout.ts``computeOrder(input, db)`injected `CheckoutDataSource`pure-ish, fully unit-testable`data-source.ts``createCheckoutDataSource()`anon (`server.ts`), **no cache**fresh reads for checkout`categories.ts``listCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory()`admin (service role)each mutation → `revalidateCatalog()``adminProducts.ts`list/create/update/delete product + variantsadminsoft-delete; nested variant upsert`offers.ts`list/create/update/delete offer + offer_productsadminreplaces M2M rows`shop.ts``getShop()`, `upsertShop(partial)`adminid=1 upsert`uploads.ts``createSignedUpload(bucket, ext)`adminstorage**Dependency notes:**

- `lib/supabase/server.ts` (anon, `@supabase/ssr`) — public reads; RLS SELECT policies must expose only active/appropriate rows (DB Engineer + Supabase Expert). Checkout deliberately reads through this same client for freshness.
- `lib/supabase/admin.ts` (service role, `import 'server-only'`) — all admin writes and storage signed URLs. Never imported into client bundles; never used for public reads.
- `CheckoutDataSource` interface (in `checkout.ts`) lets `computeOrder` be tested with in-memory fixtures (no Supabase), satisfying the tests-friendly requirement:

```
export interface CheckoutDataSource {
  getSettings(): Promise<ShopSettings | null>;
  getProducts(ids: string[]): Promise<Product[]>;
  getVariants(ids: string[]): Promise<ProductVariant[]>;
  getActiveOffers(): Promise<OfferRule[]>;
}
```

---

## 9. Caching & Revalidation

```ts
// lib/revalidate.ts
import { revalidateTag } from 'next/cache';

export const CATALOG_TAG = 'catalog' as const;

export function revalidateCatalog(): void {
  revalidateTag(CATALOG_TAG);
}
```
When to call it (service layer, immediately after a successful write):

- `create/update/delete` of a **category**, **product** (incl. variant changes), **offer** (incl. `offer_products`), or **shop settings** PUT.
- Not after `POST /api/admin/upload` by itself — the image only becomes visible when the entity that references its `publicUrl` is saved (which revalidates). Upload-then-save always goes through an entity mutation.
Usage in catalog/product reads:

```ts
// lib/services/catalog.ts (excerpt)
import { unstable_cache } from 'next/cache';
import { CATALOG_TAG } from '@/lib/revalidate';

export const getCatalog = unstable_cache(
  async (): Promise<Catalog> => {
    /* anon reads: settings, categories, products, variants, offers + offer_products */
  },
  ['catalog-aggregate'],
  { revalidate: 60, tags: [CATALOG_TAG] },
);
```
Rules & rationale:

- `revalidateTag(CATALOG_TAG)` purges any `unstable_cache`/`fetch` entry tagged `catalog`; the next request re-renders/re-reads fresh → storefront updates within seconds (DoD). `unstable_cache` revalidation is stale-while-revalidate: a background refresh serves slightly stale data once, then fresh.
- **Avoiding stale stock:** the checkout path (`computeOrder` + `createCheckoutDataSource`) never touches `unstable_cache`. Prices, offers, settings, and stock are always read live at submission — the server is the enforcement point (US-11). Displayed stock/catalog may be up to `revalidate: 60` seconds stale by design (acceptable for a menu); checkout correctness is never affected.
- Storefront RSC pages call the same `getCatalog()` (cache+tag shared with the route handler) or use `fetch` with `next: { tags: [CATALOG_TAG] }` — one tag, one invalidation path.
- `revalidateTag` must be called from a Route Handler / Server Action (it is, in services called by admin handlers). No `revalidatePath` needed for API-driven updates.

---

## 10. Rate Limiting & Abuse Protection

### 10.1 `POST /api/checkout/whatsapp` (public, unauthenticated → must be throttled)

```ts
// lib/rate-limit.ts
// Token-bucket keyed by IP, and (when present) by normalized phone. Sliding window per key.

export async function checkCheckoutRateLimit(request: NextRequest): Promise<boolean> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const windowMs = 60_000;
  const maxPerWindow = 15;              // per IP per minute
  const ok = await take(key(`checkout:ip:${ip}`), maxPerWindow, windowMs);
  if (!ok) return false;
  const body = await request.clone().json().catch(() => null);
  const phone = body?.phone ? normalizePhone(String(body.phone)) : null;
  if (phone) {
    const okPhone = await take(key(`checkout:phone:${phone}:${ip}`), 3, windowMs);
    if (!okPhone) return false;
  }
  return true;
}

function key(k: string) { /* namespaced key for the backing store */ }
async function take(key: string, limit: number, windowMs: number): Promise<boolean> { /* increment-or-reject */ }
```

Backing store decision (flagged for DevOps/Supabase):

- **MVP:** in-memory Map in the same lambda instance (per-instance, best-effort) — documented limitation: it is per warm instance, not global. Fine for a single-Vercel-function workload; do not rely on it for high-scale.
- **Recommended:** Upstash Redis (single cache read per call) for global enforcement. If Redis is provisioned, the same `take()` is used by the Auth Specialist's magic-link throttles.
- Response: 429 `LIMIT_EXCEEDED` with `Retry-After: 60`.
Rules:

- IP from `x-forwarded-for` first value (Vercel sets it); never trust client-supplied IP headers beyond the proxy.
- Phone-keyed bucket hashes the normalized phone (a hash, not the raw number, to avoid storing PII even transiently in Redis keys).
- Body is consumed from a cloned request (the route parses the body afterward).

### 10.2 Magic-link / auth endpoints
Owned by the **Authentication Specialist** (§13). Backend coordination notes:

- The same `take()` primitive should be used for the magic-link send endpoint (e.g., 5 requests/hour per email/IP) to prevent inbox bombing.
- Since checkout and auth are both public and unauthenticated, keep one shared `lib/rate-limit.ts` implementation so throttles behave consistently.

### 10.3 Idempotency

- Checkout: no server side effects → no idempotency key required; IP+phone bucket absorbs double-taps; client disables CTA in-flight.
- Admin writes: `PUT` is full-body idempotent by construction; `POST` creates new rows on each call (intended — create semantics). No client-supplied idempotency key in MVP (§14).

---

## 11. Auth Guards (admin routes)
Every admin handler calls this helper first (the handler, not middleware, is the security boundary — locked §7):

```ts
// lib/auth/require-admin.ts
// OWNED BY: Authentication Specialist. Backend defines the CONTRACT only (see §13 Inputs needed).
export type RequireAdminResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: 'no_session' | 'invalid_session' | 'forbidden' };

export declare function requireAdmin(request: NextRequest): Promise<RequireAdminResult>;
```
Handler usage (canonical):

```
const session = await requireAdmin(request);
if (!session.ok) {
  return jsonFail(session.reason === 'forbidden' ? 'FORBIDDEN' : 'UNAUTHORIZED',
    session.reason === 'forbidden' ? 403 : 401,
    session.reason === 'forbidden' ? "You don't have permission to do that." : 'Please sign in to continue.');
}
```

- The helper reads the session cookie via the server Supabase client (`lib/supabase/server.ts`), verifies the JWT, and confirms the user is an admin (supabase auth `user_metadata.is_admin === true` or the DB role model the Auth Specialist chooses — their call; backend only needs the boolean).
- `middleware.ts` (Auth Specialist) refreshes sessions and blocks unauthenticated access to `/admin/*` and `/api/admin/*` as defense-in-depth; the handler guard is authoritative.
- Public routes never call this helper.

---

## 12. Sample Responses

### 12.1 Checkout success — `200 OK`
Request:

```
{
  "name": "Priya Sharma",
  "phone": "+91 98765 43210",
  "fulfilment": "delivery",
  "note": "Extra chocolate sauce please",
  "items": [
    { "productId": "7b6c…", "quantity": 2 },
    { "productId": "9a1e…", "quantity": 1, "variantId": "c3f2…" }
  ]
}
```
Response:

```
{
  "data": {
    "message": "New order for Chocolate Zone\n\n▸ Nutella Stack Waffle ×2 — ₹578.00\n▸ Double Dark Brownie (Size: Large) ×1 — ₹345.00\n\nSubtotal: ₹923.00\nDiscount (Weekend Waffle 20% off): ₹115.60\nDelivery: ₹49.00\nTotal: ₹856.40\n\nFulfilment: Delivery\nName: Priya Sharma\nPhone: +91 98765 43210\nNote: Extra chocolate sauce please\n\nChocolate Zone · 21 Lakeview Road\nWe'll confirm on WhatsApp.",
    "waUrl": "https://wa.me/919876543210?text=New%20order%20for%20Chocolate%20Zone%0A%0A%E2%96%B8%20Nutella%20Stack%20Waffle%20%C3%972%20%E2%80%94%20%E2%82%B9578.00%0A…",
    "total": 85640,
    "currency": "INR"
  }
}
```

### 12.2 Validation error — `400`

```
{ "error": { "code": "VALIDATION_ERROR", "message": "Check the highlighted fields and try again.", "details": { "fields": { "fieldErrors": { "phone": ["Enter a valid phone number."], "items": ["Quantity must be at least 1."] } } } } }
```

### 12.3 Phone invalid — `400`

```
{ "error": { "code": "INVALID_PHONE", "message": "Enter a valid phone number.", "field": "phone" } }
```

### 12.4 Shop closed at submission — `409`

```
{ "error": { "code": "STORE_CLOSED", "message": "We're closed right now. Please check our timings and come back!" } }
```

### 12.5 Stock shortfall — `409`

```
{ "error": { "code": "INSUFFICIENT_STOCK", "message": "Only 1 left of \"Double Dark Brownie\".", "details": { "productId": "9a1e…", "requested": 3, "available": 1 } } }
```

### 12.6 Rate limited — `429` (with `Retry-After: 60`)

```
{ "error": { "code": "LIMIT_EXCEEDED", "message": "Too many attempts. Please try again shortly." } }
```

### 12.7 Admin unauthorized — `401`

```
{ "error": { "code": "UNAUTHORIZED", "message": "Please sign in to continue." } }
```

### 12.8 Admin catalog write success (e.g., `POST /api/admin/products`) — `201`

```
{ "data": { "product": { "id": "…", "category_id": "…", "name": "Nutella Stack Waffle", "base_price": 28900, "is_active": true, "variants": [ { "id": "…", "name": "Size", "option": "Large", "price_delta": 5600 } ] } } }
```

### 12.9 Upload success — `200`

```
{ "data": { "uploadUrl": "https://<project>.supabase.co/storage/v1/object/upload/product-images/1720…-uuid.webp?token=…", "publicUrl": "https://<project>.supabase.co/storage/v1/object/public/product-images/1720…-uuid.webp", "path": "product-images/1720…-uuid.webp", "bucket": "product-images" } }
```

---

## 13. Inputs Needed (from other agents)
FromNeededBackend depends on it for**Authentication Specialist**Final signature of `requireAdmin(request)` (my §11 contract is a proposal), session cookie name/shape, admin-flag model (metadata vs role), magic-link rate-limit params, `middleware.ts` scopeAdmin route guards (§7, §11), shared `lib/rate-limit.ts`**WhatsApp Integration Expert**Implement `lib/whatsapp/order-message.ts` `buildOrderMessage(input) → { text, phone }`; confirm `wa.me` encoding (newlines as `%0A` etc.), `web.whatsapp.com` fallback URL shape, `phone` format (no `+`), exact template/field order, whether `formatMoney` is usedCheckout route §6.3.6, message content, waUrl correctness**Database Engineer**Confirmed row shapes for the 5 tables (matching my `types/domain.ts`), `timings` jsonb shape, FK behaviors (`categories.id` on delete; `offer_products`/`product_variants` on delete), optional transaction RPCs (`admin_upsert_product`, `admin_upsert_offer`) for multi-table writes, RLS anon SELECT policy guaranteesCheckout reads, admin multi-table writes, delete semantics (§7)**Supabase Expert**Signed-upload TTL, `createSignedUploadUrl` availability on the plan, storage bucket policies, confirm `numeric` returns as string`POST /api/admin/upload`, `toMinor` boundary**PM**Free-delivery threshold basis (pre- vs post-discount — I assumed pre-discount), fixed-discount semantics (per item vs per order — I assumed per item, capped at line), default phone country code, hard-delete vs soft-delete preference for categories/productsCheckout math §5.2, delete semantics §7**DevOps Engineer**Upstash Redis availability (global rate limiting) vs in-memory MVP§10.1
## 14. Deferred

- **Idempotency keys** for checkout/admin (no server side effects today; revisit if orders are ever persisted).
- **Global rate limiting** without Redis (in-memory is per-instance best-effort in MVP).
- **Multi-table transaction RPCs** (product+variant, offer+offer_products) — MVP does sequential writes with error handling; DB Engineer RPCs are the hardening follow-up.
- **Default country code / full E.164 validation** for customer phone (informational today).
- **Hard-delete UX** for categories/products (soft-delete is default; FK/cascade decision pending DB Engineer).
- `formatMoney`**/currency display policy** for the WhatsApp message (expert decides; the API returns minor units).
- **Customer-order persistence / order history** (locked out of MVP by architecture).

---

## Revisions & Compliance
RevDateAuthorChangev12026-08-04Backend DeveloperInitial spec from locked `docs/ARCHITECTURE.md` v1
- **Compliance:** no contradiction with the locked architecture. Extends underspecified detail only: money representation (minor units), offer stacking (non-stacking, best-per-line), free-delivery basis, new files under `lib/` (`http.ts`, `validation/*`, `rate-limit.ts`, `services/*`), and the `lib/auth/require-admin.ts` contract for the Auth Specialist. Any conflict is flagged in §13, never silently changed.
