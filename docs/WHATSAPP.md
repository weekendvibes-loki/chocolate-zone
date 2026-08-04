# WhatsApp

Document WhatsApp integration, messaging flows, and APIs.

# Chocolate Zone — WhatsApp Integration Specification
**Owner:** WhatsApp Integration Expert · **Status:** Draft v1 (implementation-ready) · **Audience:** Backend Developer, Frontend Developer, QA Engineer, Product Manager
**Locked contract:** `docs/ARCHITECTURE.md` (v1) — implements §9 (WhatsApp flow) exactly. The pure builder lives at `lib/whatsapp/order-message.ts`, invoked by `POST /api/checkout/whatsapp`. This document does not rename or contradict the locked flow, folder structure, security model, or money convention.

---

## 0. Reading Guide
SectionWhat it contains1Scope & boundaries (who owns what — the lane map)2Builder contract summary (signature, module location, purity)3Input type — exact fields, per-field rules, invariants4Output type — `{ message, waUrl }`5Reference implementation (the canonical internal behavior)6Message templates — DELIVERY & PICKUP, fully worked INR examples7wa.me URL construction, normalization, encoding, length limits8Sanitization & injection prevention (the critical section)9Pricing display rules10Client-side UX contract (what the frontend must do)11Edge cases12Unit-test case list (16 concrete cases)13V2 roadmap & interface seam (WhatsApp Cloud API)14Reconciliation with Backend draft §6.3.6 (flagged delta + mapping table)15Inputs needed (from other agents)16Deferred
---

## 1. Scope & Boundaries (Lane Map)
ArtifactOwnerWho consumes it`lib/whatsapp/order-message.ts` — input/output contract + internals (template, sanitization, wa.me URL, web fallback shape)**WhatsApp Expert (this doc)**Backend imports it; Frontend uses its URL shapes`POST /api/checkout/whatsapp` route (validation, `computeOrder`, pricing math, error mapping, response envelope)**Backend** (see `04-backend-api.md` §6.3)Frontend calls itStorefront checkout UI, success panel, copy button, cart clearing**Frontend/UX** (see `03-frontend-architecture.md`)—Pricing values, offers, stock, delivery-fee math**Backend**This builder consumes the *results***This document defines only:** the message builder contract the Backend imports, the exact message format for both fulfilments, the wa.me deep-link construction, sanitization rules for interpolated text, pricing *display* rules, the client-side UX *requirements*, edge-case behavior, the unit-test list, and the V2 seam.

**This document does NOT define:** the checkout route, zod schemas, offer/discount math, stock enforcement, store-closed logic, component code, or any DB schema. Those are other agents' lanes.

---

## 2. Builder Contract Summary

```
// lib/whatsapp/order-message.ts
// LOCKED module path. Imported by: src/app/api/checkout/whatsapp/route.ts (Backend).
// Pure + deterministic: no I/O, no Date(), no randomness. Same input → same output.
// Safe to import on the client (no server-only imports) — the Frontend uses it for
// the web.whatsapp.com fallback URL shape only; nothing here touches Supabase.

import { buildOrderMessage } from '@/lib/whatsapp/order-message';

const out = buildOrderMessage(input);   // OrderMessageInput → OrderMessageOutput
// out.message → the full WhatsApp text (rendered in the success panel, copied, and URL-encoded)
// out.waUrl   → https://wa.me/<shopDigits>?text=<encodeURIComponent(message)>
```
**Contract pillars (locked by this doc):**

1. Inputs arrive **already validated and sanitized** by the Backend (phone normalized, control chars stripped). The builder still re-guards defensively (defense-in-depth) — §8.
2. The builder is the single source of truth for message text and the wa.me URL. The route never composes message strings.
3. Money arrives as integer **minor units** (paise/cents, locked money convention §4) and is formatted only at the display boundary with `formatMoney` from `lib/pricing/money.ts`.
4. The message is plain text (WhatsApp markdown `*bold*` / `~strikethrough~`); the frontend always renders it as **text**, never as HTML — §10.

---

## 3. Input Type (`OrderMessageInput`)

```
// lib/whatsapp/order-message.ts
import type { Minor, Currency, Fulfilment } from '@/types/domain';   // Fulfilment = 'delivery' | 'pickup'

export interface OrderLineInput {
  /** Product display name, variant already appended, e.g. "Belgian Waffle (Large)". Cleaned by Backend. */
  name: string;
  /** Integer ≥ 1. Capped defensively at 99 by the builder. */
  quantity: number;
  /** Per-unit price the customer is charged (post-variant, post-offer), in minor units. */
  unitPrice: Minor;
  /** Line total actually charged = quantity × unitPrice. Server-computed. */
  subtotal: Minor;
  /** Pre-offer line total. Present ONLY when an offer discounted this line (used for the "was ₹X" strikethrough hint and the Discount line). */
  wasSubtotal?: Minor;
}

export interface OrderMessageInput {
  /** Customer name — Backend-sanitized (control chars stripped, collapsed, trimmed), NOT HTML-escaped. Max 80 chars enforced by zod; builder truncates defensively. */
  name: string;
  /** Customer phone — Backend-normalized, e.g. "+919876543210". Displayed verbatim. */
  phone: string;
  /** 'delivery' | 'pickup' */
  fulfilment: Fulfilment;
  /** Optional customer note — Backend-sanitized. May be null. Max 500 chars at input; builder truncates in-message (§8). */
  note?: string | null;
  /** Server-computed line items. Non-empty (Backend returns EMPTY_CART before calling; builder throws if empty). */
  items: OrderLineInput[];
  /** Σ items[].subtotal — the amount charged for goods, post-discount. Minor units. */
  subtotal: Minor;
  /** Delivery fee after free-delivery logic. 0 for pickup, or when threshold met. Minor units. */
  deliveryFee: Minor;
  /** Shop's free-delivery threshold (minor units) or null when the shop offers no threshold. Informational for the upsell line. */
  freeDeliveryThreshold: Minor | null;
  /** Final payable = subtotal + deliveryFee. Builder asserts this invariant. */
  total: Minor;
  /** ISO 4217, e.g. 'INR'. Passed to formatMoney. */
  currency: Currency;
  /** Shop brand name for the header/footer (from shop_settings.brand). */
  shopName: string;
  /** Shop's WhatsApp number in ANY stored formatting variant ("+91 98765 43210", "(91) 98765-43210", "919876543210", "0091 98765 43210"). Builder normalizes to digits-only for wa.me (§7). */
  shopWhatsappNumber: string;
  /** Optional pre-formatted order-time label, e.g. "5:42 PM" (Backend formats; keeps the builder deterministic for tests). Omitted line when absent. */
  orderTime?: string;
}
```

### 3.1 Per-field rules & invariants (builder-enforced)
FieldBackend guarantees (zod)Builder re-check (defense-in-depth)`name`trimmed, 2–80 chars, letter/number/space/`.'-`strip control chars → collapse → trim → slice(0, 80)`phone`normalized `+` + 7–15 digitsstrip control chars → slice(0, 20) for display`note`trimmed, ≤ 500 charss	rip → collapse → trim → slice(0, 500) → in-message truncation to size budget`items`non-empty (route rejects `EMPTY_CART`)**throws** if empty`quantity`integer ≥ 1 (zod `int().min(1)`)clamp to `[1, 99]``total``subtotal - discount + delivery`**asserts** `total === subtotal + deliveryFee`, throws on mismatch`shopWhatsappNumber`admin save enforces `^\\d{7,15}$`normalizes; **throws** if not 7–15 digits after normalization (config bug — fail fast, never emit a broken link)
---

## 4. Output Type (`OrderMessageOutput`)

```
export interface OrderMessageOutput {
  /** The full, human-readable WhatsApp message. LF-separated lines. Never contains CR, LF, TAB or bidi control characters (see §8). Rendered by the Frontend as plain text. */
  message: string;
  /** https://wa.me/<shopDigits>?text=<encodeURIComponent(message)> — digits-only shop number, message fully URL-encoded. Opened by the Frontend in a new tab. */
  waUrl: string;
}
```
The route response keeps `{ message, waUrl, total, currency }` exactly as locked in `ARCHITECTURE.md` §9 and `04-backend-api.md` §6.3 — the builder's `message` and `waUrl` drop straight in; `total`/`currency` come from `computeOrder` (§14 maps the shapes).

---

## 5. Reference Implementation (canonical internal behavior)
This is the specification of the builder internals. The Backend imports only `buildOrderMessage` + the two URL helpers below.

```
// lib/whatsapp/order-message.ts — reference implementation (WhatsApp Expert owns this file)
import { formatMoney, type Minor } from '@/lib/pricing/money';
import type { Currency, Fulfilment } from '@/types/domain';

export const WA_ME_BASE = 'https://wa.me/';
export const WEB_WHATSAPP_SEND = 'https://web.whatsapp.com/send';
export const MAX_MESSAGE_CHARS = 4096;   // WhatsApp text ceiling; see §7.3
export const MAX_NAME_CHARS = 80;
export const MAX_NOTE_CHARS = 500;
export const MAX_ITEM_NAME_CHARS = 200;
export const MAX_SHOP_NAME_CHARS = 60;
export const MAX_PHONE_DISPLAY_CHARS = 20;
export const MAX_QUANTITY = 99;
const ELLIPSIS = '\u2026';

const CONTROL_RE = /[\u0000-\u001F\u007F\u0080-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

export function stripControlChars(s: string): string { return s.replace(CONTROL_RE, ''); }

function guardField(raw: string, max: number): string {
  return stripControlChars(raw).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Any formatting variant of a shop number → E.164 digits (no '+'). Throws if not 7–15 digits. */
export function normalizeShopNumber(raw: string): string {
  let s = raw.trim().replace(/[\s().\-]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('00')) s = s.slice(2);   // international dialing prefix
  if (!/^\d{7,15}$/.test(s)) throw new Error(`Invalid shop WhatsApp number: ${JSON.stringify(raw)}`);
  return s;
}

function clampQuantity(q: number): number {
  if (!Number.isInteger(q) || q < 1) return 1;
  return Math.min(q, MAX_QUANTITY);
}

function formatItemLine(index: number, line: OrderLineInput, currency: Currency): string {
  const name = guardField(line.name, MAX_ITEM_NAME_CHARS);
  const qty = clampQuantity(line.quantity);
  const hint = line.wasSubtotal != null && line.wasSubtotal > line.subtotal
    ? ` (was ~${formatMoney(line.wasSubtotal, currency)}~)`   // WhatsApp strikethrough, plain text
    : '';
  return `${index}) ${qty} x ${name} @ ${formatMoney(line.unitPrice, currency)} = ${formatMoney(line.subtotal, currency)}${hint}`;
}

export function waMeUrl(phoneDigits: string, text: string): string {
  return `${WA_ME_BASE}${phoneDigits}?text=${encodeURIComponent(text)}`;
}

export function webWhatsappUrl(phoneDigits: string, text: string): string {
  return `${WEB_WHATSAPP_SEND}?phone=${phoneDigits}&text=${encodeURIComponent(text)}`;
}

export function buildOrderMessage(input: OrderMessageInput): OrderMessageOutput {
  if (input.items.length === 0) throw new Error('Cannot build an order message with zero items.');
  if (input.total !== input.subtotal + input.deliveryFee) {
    throw new Error(`Total invariant failed: total ${input.total} !== subtotal ${input.subtotal} + deliveryFee ${input.deliveryFee}`);
  }

  const shopName = guardField(input.shopName, MAX_SHOP_NAME_CHARS).toUpperCase();
  const customerName = guardField(input.name, MAX_NAME_CHARS);
  const phone = guardField(input.phone, MAX_PHONE_DISPLAY_CHARS);
  const note = input.note ? guardField(input.note, MAX_NOTE_CHARS) : null;
  const itemLines = input.items.map((l, i) => formatItemLine(i + 1, l, input.currency));

  const totalDiscount = input.items.reduce((s, l) => s + ((l.wasSubtotal ?? l.subtotal) - l.subtotal), 0);
  const preDiscountSubtotal = input.subtotal + totalDiscount;   // free-delivery basis (matches Backend)
  const freeDeliveryUpsell =
    input.fulfilment === 'delivery' &&
    input.deliveryFee > 0 &&
    input.freeDeliveryThreshold != null &&
    preDiscountSubtotal < input.freeDeliveryThreshold
      ? `Spend ${formatMoney(input.freeDeliveryThreshold - preDiscountSubtotal, input.currency)} more for FREE delivery!`
      : null;

  const block = [
    `*${shopName} — NEW ORDER*`,
    '='.repeat(28),
    `*Name:* ${customerName}`,
    `*Phone:* ${phone}`,
    `*Order type:* ${input.fulfilment.toUpperCase()}`,
    input.orderTime ? `*Order time:* ${guardField(input.orderTime, 40)}` : null,
    '-'.repeat(28),
    '*Items:*',
    ...itemLines,
    '-'.repeat(28),
    `Subtotal: ${formatMoney(input.subtotal, input.currency)}`,
    totalDiscount > 0 ? `Discount: -${formatMoney(totalDiscount, input.currency)}` : null,
    input.fulfilment === 'delivery'
      ? input.deliveryFee > 0
        ? `Delivery fee: ${formatMoney(input.deliveryFee, input.currency)}`
        : 'Delivery fee: FREE DELIVERY'
      : null,
    `*TOTAL: ${formatMoney(input.total, input.currency)}*`,
    '-'.repeat(28),
    input.fulfilment === 'delivery'
      ? `*Deliver to:* ${customerName} (${phone})`
      : '*Pickup:* Your order will be ready for pickup. Please collect from our store.',
    freeDeliveryUpsell,
    note ? `*Note:* ${note}` : null,
    '-'.repeat(28),
    'Thank you for ordering with us! We will confirm your order on this chat.',
    `- ${shopName}`,
  ].filter((s): s is string => s != null);

  let message = block.join('\n');
  if (message.length > MAX_MESSAGE_CHARS) {
    message = fitToBudget(message, itemLines, note);   // §5.1
  }

  const phoneDigits = normalizeShopNumber(input.shopWhatsappNumber);
  return { message, waUrl: waMeUrl(phoneDigits, message) };
}
```

### 5.1 Size budget (`fitToBudget`) — deterministic truncation
`MAX_MESSAGE_CHARS = 4096` is the message cap. Given the zod caps (name 80, note 500, cart item cap ~50, item names from DB), a normal order is far below it; the budget only engages on pathological input and is therefore **tested**.

1. Build the full message. If `length ≤ 4096`, return as-is.
2. **Truncate the note.** `noteBudget = 4096 − (full.length − note.length) − 4` (newline + ellipsis overhead), floored at 40. Replace the note with `note.slice(0, noteBudget − 1) + '…'`. Rebuild. (Note is user-controlled, lowest-value content — it is sacrificed first.)
3. If still over, **elide trailing items**: keep the first `k` item lines (largest `k` with rebuilt length ≤ 4096, binary search, `k ≥ 1`) and append a final line `…and ${n} more item(s)`. Rebuild.
4. If a single item still exceeds the budget, throw (cannot happen given field caps — programmer error).
The builder never truncates the customer name, totals, or fulfilment lines: those are the parts the shop must never lose.

---

## 6. Message Templates

### 6.1 Design rules (apply to both fulfilments)

- Lines are joined with `\n` (LF only — never `\r\n`, never trailing newline).
- WhatsApp markdown only: `*bold*` for header, `Order type`, TOTAL, and field labels; `~strikethrough~` for was-prices. No emoji in the MVP template (branding decision — see §16).
- Interpolated fields (`name`, `phone`, `item name`, `note`) are guard-serialized (§8) so they can never break the template structure.
- The order of blocks is **fixed and never interleaved with user content**: header → identity → fulfilment → items → totals → fulfilment instruction → note → footer. User content (name, phone, note) is confined to its own labeled section so no user string can masquerade as an item, a total, or a system line.
- Money renders via `formatMoney` → e.g. `₹220.00`, `₹1,050.00`.

### 6.2 DELIVERY template
Template (placeholders → values, one line per field):

```
*{SHOPNAME} — NEW ORDER*
============================
*Name:* {customer name}
*Phone:* {customer phone}
*Order type:* DELIVERY
*Order time:* {orderTime}        ← omitted when not provided
----------------------------
*Items:*
{n}) {qty} x {item name} @ {unit price} = {line total}[ (was ~{was line total}~)]
...
----------------------------
Subtotal: {subtotal}
Discount: -{discount}            ← only when any line was discounted
Delivery fee: {fee | FREE DELIVERY}
*TOTAL: {total}*
----------------------------
*Deliver to:* {customer name} ({customer phone})
Spend {amount} more for FREE delivery!   ← only when fee>0, threshold set, pre-discount subtotal < threshold
*Note:* {note}                   ← only when note present
----------------------------
Thank you for ordering with us! We will confirm your order on this chat.
- {SHOPNAME}
```
**Fully worked example (INR)** — input:

```
{
  "name": "Priya Sharma",
  "phone": "+919876543210",
  "fulfilment": "delivery",
  "note": "Please add extra chocolate drizzle and keep it less sweet.",
  "items": [
    { "name": "Belgian Waffle (Large)", "quantity": 2, "unitPrice": 22000, "subtotal": 44000 },
    { "name": "Double Dark Brownie", "quantity": 1, "unitPrice": 18000, "subtotal": 18000 }
  ],
  "subtotal": 62000,
  "deliveryFee": 4000,
  "freeDeliveryThreshold": 99900,
  "total": 66000,
  "currency": "INR",
  "shopName": "Chocolate Zone",
  "shopWhatsappNumber": "+91 98765 43210",
  "orderTime": "5:42 PM"
}
```
Exact `message`:

```
*CHOCOLATE ZONE — NEW ORDER*
============================
*Name:* Priya Sharma
*Phone:* +91 98765 43210
*Order type:* DELIVERY
*Order time:* 5:42 PM
----------------------------
*Items:*
1) 2 x Belgian Waffle (Large) @ ₹220.00 = ₹440.00
2) 1 x Double Dark Brownie @ ₹180.00 = ₹180.00
----------------------------
Subtotal: ₹620.00
Delivery fee: ₹40.00
*TOTAL: ₹660.00*
----------------------------
*Deliver to:* Priya Sharma (+91 98765 43210)
Spend ₹379.00 more for FREE delivery!
*Note:* Please add extra chocolate drizzle and keep it less sweet.
----------------------------
Thank you for ordering with us! We will confirm your order on this chat.
- CHOCOLATE ZONE
```
Exact `waUrl` (abridged; the `text` value is the full message `encodeURIComponent`-ed):

```
https://wa.me/919876543210?text=%2ACHOCOLATE%20ZONE%20%E2%80%94%20NEW%20ORDER%2A%0A%3D...
```
Note: checkout collects **Name + Phone only** (locked). There is no delivery-address field, so the shop confirms the address in the WhatsApp chat; the `*Deliver to:*` line names the customer for the shop to reply to.

### 6.3 PICKUP template
Same skeleton; **no** delivery-fee line, no free-delivery upsell, and the fulfilment instruction switches to pickup wording.

Template deltas vs §6.2:

- `*Order type:* PICKUP`
- Totals block: `Subtotal:` → `*TOTAL:*` only (no delivery line).
- Fulfilment instruction line: `*Pickup:* Your order will be ready for pickup. Please collect from our store.`
**Fully worked example (INR)** — input:

```
{
  "name": "Rahul Verma",
  "phone": "+919999988888",
  "fulfilment": "pickup",
  "note": null,
  "items": [
    { "name": "Triple Chocolate Cake", "quantity": 1, "unitPrice": 45000, "subtotal": 45000 },
    { "name": "Hazelnut Fudge (Box of 6)", "quantity": 2, "unitPrice": 30000, "subtotal": 60000 }
  ],
  "subtotal": 105000,
  "deliveryFee": 0,
  "freeDeliveryThreshold": null,
  "total": 105000,
  "currency": "INR",
  "shopName": "Chocolate Zone",
  "shopWhatsappNumber": "919876543210"
}
```
Exact `message`:

```
*CHOCOLATE ZONE — NEW ORDER*
============================
*Name:* Rahul Verma
*Phone:* +91 99999 88888
*Order type:* PICKUP
----------------------------
*Items:*
1) 1 x Triple Chocolate Cake @ ₹450.00 = ₹450.00
2) 2 x Hazelnut Fudge (Box of 6) @ ₹300.00 = ₹600.00
----------------------------
Subtotal: ₹1,050.00
*TOTAL: ₹1,050.00*
----------------------------
*Pickup:* Your order will be ready for pickup. Please collect from our store.
----------------------------
Thank you for ordering with us! We will confirm your order on this chat.
- CHOCOLATE ZONE
```

---

## 7. wa.me URL Construction

### 7.1 Format

```
https://wa.me/<shopNumberDigitsOnly>?text=<encodeURIComponent(message)>
```

- **Digits only, country code required.** The shop number is stored in `shop_settings.whatsapp_number`; the builder normalizes whatever variant is stored into bare E.164 digits (no `+`, no `00`): `normalizeShopNumber` strips spaces/dots/parens/dashes, drops a leading `+` or `00`, then requires `/^\d{7,15}$/` or throws. A stored `+91 98765 43210`, `(91) 98765-43210`, `0091 9876543210` and `919876543210` all produce the same link target `919876543210`.
- **Country code is mandatory.** WhatsApp's wa.me API refuses numbers without the country code. The admin `shop_settings` form enforces 7–15 digits; the builder's normalizer is the second gate.
- `text`** query only.** Exactly one query parameter. The shop phone lives in the path, never in the query.

### 7.2 Query building

- `encodeURIComponent(message)` is applied to the whole message string — never hand-assembled encoding, never `+` for spaces.
- Resulting encoding (why it is safe — see also §8):

- space → `%20` (not `+`; `+` in a query can be decoded as a space by some parsers and would also be ambiguous — `%20` is unambiguous)
- `\n` → `%0A` (a newline cannot escape the `text` value)
- `&` → `%26` (**critical** — a literal `&` would otherwise start a second query parameter, e.g. `...&status=paid`)
- `=` → `%3D`, `#` → `%23`, `?` → `%3F`, `%` → `%25`, `+` → `%2B`, `'` → `%27`
- Because every reserved character is percent-encoded, **no user input can add parameters to the URL or change the phone path segment.** User-controlled characters only ever appear inside the encoded `text` value.
- The Frontend derives the `web.whatsapp.com` fallback from `waUrl` (§10.4):
`digits = waUrl.split('/')[3].split('?')[0]` → `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`.

### 7.3 Length limits

- `MAX_MESSAGE_CHARS = 4096` (enforced in §5.1). Rationale: the WhatsApp Business API caps a text message at 4096 characters; wa.me drafts open in the same client, and staying under the cap guarantees the prefilled text is accepted and displayable.
- URL length: `encodeURIComponent` can expand a message by up to ~3x (e.g. `%` → `%25`), so the encoded URL for a 4096-char message is at most ~12,300 characters. Browsers and the WhatsApp mobile handlers comfortably support URLs this long; no additional URL cap is needed beyond the message cap. Long URLs are fine in Chrome/Safari address fields; some chat apps truncate long URLs in *preview* text, but the draft content itself is complete.
- Guardrail: because item names come from the DB and notes are capped at 500, a real order is typically < 1,000 chars. The 4096 budget is a safety net for pathological cart sizes.

---

## 8. Sanitization & Injection Prevention (Critical)
Two independent layers — the message-text layer and the URL layer. Defeating one still leaves the other.

### 8.1 What the Backend already guarantees (inputs)
Per `04-backend-api.md` §3.3 and the locked route: `normalizePhone` (7–15 digits, `+` kept) for the customer phone; `sanitizeText` for `name`/`note` — control-char strip (C0/C1 + bidi), whitespace collapse, trim. Zod caps: name ≤ 80, note ≤ 500. Product/variant names come from the DB, never from the client payload.

**Contract clarification (flagged, see §14):** the builder consumes `name`/`note` **control-char-stripped but NOT HTML-escaped**. If the Backend passed the html-escaped form (`&lt;script&gt;`), the shop would see literal entities in WhatsApp. XSS protection is handled at the render boundary: the Frontend renders `message` as **plain text, never **`innerHTML` (§10.5), and the URL layer percent-encodes. The Backend should pass `sanitizeText(name, { escape: false })` (control-strip + collapse + trim only) into the builder. This refines — does not contradict — the locked flow; see §14.

### 8.2 Builder rules (defense-in-depth — always applied, even to DB-sourced item names)

1. **Strip control characters.** `stripControlChars` removes C0/C1 (incl. `\r`, `\n`, `\t`, NUL) and bidi controls (`U+200E/200F`, `U+202A–U+202E`, `U+2066–U+2069`) from every interpolated field — name, phone, item names, note, shopName, orderTime.
2. **Collapse & trim.** Internal whitespace runs → single space; leading/trailing trimmed. No field can contribute a blank line, a paragraph break, or trailing whitespace.
3. **Length caps.** `guardField` slices each field to its cap (§3.1). An attacker cannot bloat the message past the budget, and the budget function can therefore always converge (§5.1).
4. **No re-escape of the template.** The template is a static array of literal lines; only the guard-serialized fields are interpolated, so there is no double-escaping of the builder's own output.
5. **Fixed block order.** User content only ever appears in its own labeled lines (identity block, note). Nothing user-controlled is ever placed before the totals block or inline with item/total text.
6. **URL layer.** Even in the impossible case that a control char survived the builder, `encodeURIComponent` percent-encodes it (`\n` → `%0A`, `&` → `%26`) so it can neither create WhatsApp message lines nor URL parameters.

### 8.3 Why a malicious note cannot inject
Take `note = "x\n*TOTAL: ₹1*\n&status=paid\nhttps://evil.example"`.

- **Message layer:** step 1 strips every `\n` (a C0 control), so the note becomes `x *TOTAL: ₹1* &status=paid https://evil.example` — one single line, inside the `*Note:*` section, after the totals. It cannot add a fake line item, overwrite `*TOTAL:*`, or escape its own block because newlines are the only line separator and none survive.
- **URL layer:** the same note, if any character somehow reached the URL, is `encodeURIComponent`-ed: `&` → `%26`, so `&status=paid` cannot become a real query parameter; `https%3A%2F%2Fevil.example` is inert text.
- **No path injection:** user input never touches the URL path (`/919876543210`); only `normalizeShopNumber(shopWhatsappNumber)` (shop settings, admin-controlled) does.

---

## 9. Pricing Display Rules

- **Money is formatted, never computed, here.** All math is integer minor units (locked convention). The builder calls `formatMoney(minor, currency)` (`lib/pricing/money.ts`) at display time: `Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'symbol' })`. INR renders as `₹220.00`, `₹1,050.00`; if locale data is unavailable the fallback is `INR 220.00`. The builder performs **zero** floating-point arithmetic.
- **Quantity grouping.** Every line shows `{qty} x {name} @ {unitPrice} = {lineTotal}` — the unit price and the grouped line total are both visible: `2 x Belgian Waffle (Large) @ ₹220.00 = ₹440.00`. Quantity renders as a bare integer (`2 x`, `1 x`).
- **Offer/strikethrough hint.** When `wasSubtotal > subtotal`, the line appends ` (was ~{wasSubtotal}~)` using WhatsApp's plain-text strikethrough markdown. Example line:

```
1) 2 x Belgian Waffle (Large) @ ₹198.00 = ₹396.00 (was ~₹440.00~)
Subtotal: ₹396.00
Discount: -₹44.00
```
- **Discount summary.** Derived from the items (`Σ (wasSubtotal − subtotal)`); rendered as a `Discount: -₹X.00` line only when > 0. Discounts never appear twice (no separate per-line discount text beyond the `was` hint).
- **Rounding.** The Backend rounds once at the line level (locked `percentOf` / `roundHalfUp`). The builder inherits those already-rounded integers; `formatMoney` only renders `minor / 100` with two decimals. There is no rounding drift in the message.
- **Free-delivery basis.** The free-delivery upsell and the `FREE DELIVERY` state use `preDiscountSubtotal = subtotal + totalDiscount`, matching the Backend's threshold comparison on pre-discount subtotal (§14 mapping).

---

## 10. Client-side UX Contract (WHAT the Frontend must do — no component code)
Consumed by `CheckoutForm` + `OrderSuccess` (`03-frontend-architecture.md` §C*). The route returns `{ message, waUrl, total, currency }`.

1. **Open **`waUrl`** in a new tab.** `window.open(waUrl, '_blank', 'noopener')`. To survive popup blockers the open must originate from the user gesture: either open `window.open('', '_blank')` synchronously in the submit handler and assign `win.location.href = waUrl` after the await, or open `waUrl` directly in the handler once the POST resolves. Never call `window.open` in a timer/callback detached from the gesture.
2. **Success state.** On `200`, show the `OrderSuccess` panel: a confirmation heading ("Order ready in WhatsApp"), the `message` text rendered read-only, and three actions — **Open WhatsApp** (re-opens `waUrl`), **Copy message**, **Done**. The panel is the persistent fallback surface, so it must remain fully interactive if the app is missing (step 6).
3. **Copy message fallback.** `navigator.clipboard.writeText(message)`; on success show "Copied — paste it into WhatsApp", on failure (non-secure context / permission) fall back to `document.execCommand('copy')` from a hidden textarea, then to displaying the message selectable in full. Copy must always work even when neither the app nor web is reachable.
4. **web.whatsapp.com deep link.** Always offer "Open in WhatsApp Web" alongside the app link: derive `digits = waUrl.split('/')[3].split('?')[0]` and use `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}` (the exact shape is locked by this doc, §7.2). This covers desktop and "app missing" cases.
5. **WhatsApp-not-installed detection.** A browser cannot reliably query whether the app is installed. Strategy: never branch solely on detection. On mobile, if the app is missing, `wa.me` serves a "Get WhatsApp from the App/Play Store" page — so the success panel **must** keep the Copy button and the web link available above the fold. Optionally, when the app is present, `wa.me` auto-redirects into it (no user agent sniffing is required). Do not rely on `navigator.userAgent` heuristics for gating; treat them as non-authoritative hints only. (Detection of "opened from within WhatsApp", `userAgent` containing `WhatsApp/`, is informational only.)
6. **Cart lifecycle.** Clear the cart **only** on "Done" (after a successful order), never on open, so the user can retry or copy without losing the cart. Reset the form after Done.
7. **Error mapping.** Render `{ error }` per the shared error-code table (`STORE_CLOSED`, `ORDERING_DISABLED`, `EMPTY_CART`, `INVALID_PHONE`, …) — the WhatsApp Expert does not define UI copy beyond confirming these are all 4xx and non-fatal to the form.

---

## 11. Edge Cases
#CaseBehaviorE1**Empty cart**Backend rejects with `EMPTY_CART` (400) before the builder runs. Builder additionally **throws** on `items.length === 0` (programmer-error guard — never emits an empty order).E2**Invalid/absent phone**Backend rejects with `INVALID_PHONE` (400) before the builder runs. The builder is never invoked with a non-normalized customer phone; it still guard-slices the display copy defensively.E3**Store closed / ordering disabled / fulfilment paused**`computeOrder` rejects (`STORE_CLOSED` / `ORDERING_DISABLED` / `DELIVERY_UNAVAILABLE` / `PICKUP_UNAVAILABLE`, all 409) **before** `buildOrderMessage` is called. A message is simply never buildable in these states.E4**Single item**Works identically — line `1)` renders; numbering stays stable.E5**Multi-item**Sequential `1)`, `2)`, … numbering; no assumptions about array order (Backend passes menu/insertion order).E6**Delivery at threshold boundary**`subtotal(pre-discount) === freeDeliveryThreshold` → Backend sets `deliveryFee = 0` (locked `>=` rule) → builder renders `Delivery fee: FREE DELIVERY`.E7**Just below threshold**`deliveryFee > 0` → fee line renders and the upsell line appears (`Spend ₹X more for FREE delivery!`).E8**Zero delivery fee, no threshold**Shop set `delivery_fee = 0`, `free_delivery_threshold = null` → `deliveryFee === 0` → `FREE DELIVERY` renders (correct: delivery is genuinely free), no upsell.E9**Pickup**No delivery line, no upsell, pickup instruction line; `deliveryFee` must be `0` (asserted by the `total` invariant).E10**Shop number stored with formatting variants**`normalizeShopNumber` produces the same digits for all variants; link works regardless of how the admin saved it.E11**Un-normalizable shop number**Builder throws (config bug) — the route 500s rather than emitting a broken link. Admin save validation should make this unreachable.E12**Pathological message length**§5.1 budget: note truncated first, then trailing items elided (`…and N more item(s)`), never the totals/name.E13**Offer-discounted lines**`was` hint + `Discount:` summary render; totals stay consistent (discount counted exactly once).E14**Quantity out of range**Clamped to `[1, 99]` defensively (Backend zod already enforces `min(1)` and a cart cap).
---

## 12. Unit-Test Case List (builder — `buildOrderMessage`)
16 concrete cases. Framework-agnostic (Vitest expected; `expect(out.message)` snapshot + exact string assertions).

#TestInput emphasisAssertionsT1Delivery with fee — full template§6.2 worked example`message` equals the exact worked example verbatim; `waUrl` starts `https://wa.me/919876543210?text=%2A`T2Pickup variant — full template§6.3 worked exampleNo `Delivery fee` / `FREE DELIVERY` / upsell line; `*Pickup:*` instruction present; `Order type: PICKUP`; TOTAL = SubtotalT3Free-delivery threshold metpre-discount subtotal == threshold`Delivery fee: FREE DELIVERY`; no fee amount; no upsellT4Boundary — exactly at thresholdpre-discount subtotal === `freeDeliveryThreshold``FREE DELIVERY` (the `>=` rule is visible)T5Just below thresholdpre-discount subtotal = threshold − 1 minor`Delivery fee: ₹40.00`; upsell `Spend ₹0.01`? — assert `Spend ₹0.01 more for FREE delivery!` — no, assert exact `₹0.01` wording and fee line. *(Uses a ₹0.01 gap to prove boundary.)*T6Zero delivery fee, threshold null`deliveryFee: 0`, `freeDeliveryThreshold: null``FREE DELIVERY` renders; no upsellT7Multi-item ordering3 itemsLines numbered `1)…2)…3)`; `2 x {name} @ ₹X.00 = ₹Y.00` grouping correctT8Single item1 itemNumbered `1)`; totals consistentT9Discount + strikethrough hint`wasSubtotal > subtotal` on a lineLine contains `(was ~₹440.00~)`; `Discount: -₹44.00`; TOTAL = subtotal + deliveryFeeT10Newline injection attempt`note: "x\n*TOTAL: ₹1*\n&status=paid"``message` contains **no **`\n`** inside the note** — note is one line; `*TOTAL: ₹1*` does not appear as a line; `&` → `%26` in `waUrl`; `waUrl` has exactly one `?` and one `&`-free queryT11Control chars in name`name: "Jo\\u0000\\u0007\\u001B\\tdoe"`Output contains `Jo doe` (controls/TAB stripped); no NUL in `message`T12HTML + emoji in note`note: "<script>alert(1)</script> 😋 <3"`Message text keeps literal `<script>` and emoji (plain text, allowed in WhatsApp) **unescaped**; no `\n` introduced; `waUrl` encodes `%3Cscript%3E`T13Bidi control chars`note` with `U+202E` (RLO)Bidi marks removed from `message` (regex §5)T14Long-note truncation`note` of 500 chars + enough items to bust 4096 (or injected via budget override)Note truncated with trailing `…`; `message.length ≤ 4096`; name/totals intactT15URL encoding contractmessage containing `&`, `=`, `#`, `+`, space, newline, `%``encodeURIComponent` output — space→`%20`, newline→`%0A`, `&`→`%26`, `#`→`%23`, `+`→`%2B`, `%`→`%25`; digits-only pathT16Shop-number normalization`"+91 98765 43210"`, `"(91) 98765-43210"`, `"0091 9876543210"`, `"919876543210"`All four `waUrl`s target `919876543210`T17Invalid shop number`"not a phone"`Builder **throws**T18Empty items`items: []`Builder **throws**T19Total invariant mismatch`total !== subtotal + deliveryFee`Builder **throws**T20Money formatting fallbackcurrency `INR` (Intl available) and an unknown code`₹620.00` when Intl supports; `X 620.00` fallback otherwise; no crash*(T1–T20 — the list is deliberately ≥ 12 core cases; T10–T14 are the injection class, T3–T6 the delivery boundary class.)*

---

## 13. V2 Roadmap — WhatsApp Cloud API & the Interface Seam

### 13.1 The seam (introduced now, used in V2)

```
// lib/whatsapp/gateway.ts — NEW in V2 (does NOT exist in MVP; MVP is transport-less)
export interface OrderNotification {
  to: string;                 // customer wa_id (E.164, no '+')
  message: string;            // produced by buildOrderMessage — unchanged pure function
  idempotencyKey: string;     // V2: e.g. `order_${checkoutToken}` — dedupe on retry
}

export interface SendResult { ok: true; messageId: string } | { ok: false; error: string };

export interface WhatsAppGateway {
  sendOrderNotification(n: OrderNotification): Promise<SendResult>;
  broadcast(payload: { text: string; to: string[] }): Promise<BroadcastResult>;  // offer blasts to saved numbers
}
```

- **MVP (locked):** there is **no gateway**. The "send" is the client opening the `waUrl` draft. `buildOrderMessage` stays a pure function returning `{ message, waUrl }` — the Frontend does the transport (open tab).
- **V2:** a `CloudApiGateway` implements the seam by calling the WhatsApp Business Cloud API (`POST /{phone_number_id}/messages`) with the **same** `buildOrderMessage` output. Nothing in `order-message.ts` changes: it stays pure, deterministic, and shared between the deep-link path and the API path.

### 13.2 What changes in V2
ConcernMVP (now)V2 (Cloud API)TransportClient opens `wa.me` draftServer POSTs `/v1/{phone_number_id}/messages`Message typeFree-form prefilled text (no approval)**Template approval required** for business-initiated messages: `order_confirmation` with variables `{{1}}` customer name, `{{2}}` total — must map 1:1 to the builder's blocksIdempotencyNone (no writes, §6.3.5 backend doc)**Idempotency keys** (`X-Idempotency-Key`/custom header) + store `messageId`; otherwise a retry re-sends the order24h windowN/ABusiness can only initiate within the 24h customer-service window; the shop must first receive a message from the customer (or an approved opt-in) — this changes the flow from "customer sends us" to "we send customer"BroadcastN/A`broadcast` to saved customer numbers (offers); requires consent registry + WhatsApp marketing-policy complianceStatusN/AWebhooks: `sent` / `delivered` / `read` / `failed` → V2 admin order tracking (still no DB orders unless Product Manager approves)Phone numbersShop number in settings onlyMeta Business phone-number-id + access token (new env vars, secrets)Costs₹0Pay-per-message (service/utility/marketing rates)
### 13.3 Invariants preserved

- `lib/whatsapp/order-message.ts` is imported by both paths; its `{ message, waUrl }` output is consumed by the Frontend (deep link) and, in V2, its `message` is consumed by the gateway. **The builder never sends, never awaits, never knows about tokens.**
- The Cloud API path sends the identical text the MVP drafts — the shop sees the same format whether the customer tapped "Open WhatsApp" or the shop runs `sendOrderNotification`.
- The template's strict field/block structure (§6) is exactly what maps to Cloud-API template variables in V2, so the V1→V2 migration is mechanical.

---

## 14. Reconciliation with Backend Draft `04-backend-api.md` §6.3.6 (Flagged Delta)
**Flagged, per the locked architecture rule ("any conflict must be flagged, never silently changed"):** the Backend draft defines builder input as `{ shop, customer, fulfilment, note, currency, lines: PricedLine[], totals: CheckoutTotals }` and output as `{ text, phone }` with the **route** composing `waUrl`. **This document, which owns the builder contract, locks a flat input and a **`{ message, waUrl }`** output** (per the architecture flow §9, which returns `{ message, waUrl, total }`). Both are compatible with `ARCHITECTURE.md`; the Backend must adopt the contract below. The mapping is mechanical because `computeOrder` already produces every flat field:

Flat builder field (this doc)Backend source`items[].name``PricedLine.productName` + (`PricedLine.variant` → "Name (Option)" or "Name"`)`items[].quantity``PricedLine.quantity``items[].unitPrice``PricedLine.lineTotal / quantity` (effective post-offer unit price; integer, computed by Backend)`items[].subtotal``PricedLine.lineTotal` (post-discount)`items[].wasSubtotal``PricedLine.lineSubtotal` **only when** `lineSubtotal !== lineTotal``subtotal``totals.subtotal − totals.discount` (i.e. Σ `lineTotal`)`deliveryFee``totals.delivery``freeDeliveryThreshold``settings.free_delivery_threshold` → `toMinor` (or null)`total``totals.total``currency``settings.currency``shopName``settings.brand``shopWhatsappNumber``settings.whatsapp_number``name`, `phone`, `note`, `fulfilment`route's `CheckoutInput`Required Backend edits to §6.3 / §6.3.6: (1) import and call `buildOrderMessage` with the flat mapping above; (2) stop composing the URL — use `msg.waUrl` in the response directly; (3) pass `name`/`note` control-stripped but **not** HTML-escaped (§8.1); (4) re-export the builder's types from `types/domain.ts` if desired (the builder keeps its own canonical copies). `PricedLine`/`CheckoutTotals` remain in the Backend's `computeOrder`; only the builder call-site mapping changes.

---

## 15. Inputs Needed (from other agents)
Needed fromItemPurpose**Backend**The flat builder fields per call (§14 mapping) — confirm `unitPrice = lineTotal / quantity` and that `wasSubtotal` is set only when `lineSubtotal !== lineTotal`Builder input**Backend**Confirm `name`/`note` reach the builder **unescaped** (control-stripped only) — adjust `sanitizeText` call accordinglySanitization pipeline (§8.1)**Backend**`orderTime` display label (or drop the line) — the builder accepts a pre-formatted stringOptional `Order time:` line**Backend**Cart item cap (items array max) and max `quantity` enforced by zodBuilder length-budget calibration (§5.1)**Backend**Whether `unitPrice` should show pre-offer or post-offer per-unit price (this doc locks **post-offer** with a `was` hint)Strikethrough display (§9)**DB Engineer**`shop_settings.whatsapp_number` exact column semantics + admin save regex (`^\\d{7,15}$`, no `+`) — confirm the stored form`normalizeShopNumber` input guarantees**PM**Default country code for customer phone inference (deferred in `04-backend-api.md` §13)Future phone UX; not needed by the builder**Frontend/UX**Confirm the success panel renders `message` as plain text (never `innerHTML`)XSS posture (§8.1/§10.5)
## 16. Deferred

- **Emoji in the message template** (header icon, free-delivery check, etc.) — branding decision; the template currently uses plain-text dividers so it renders identically everywhere. PM/UX to lock a visual voice.
- **Delivery address collection** — checkout stays Name + Phone (locked); the shop asks for the address in-chat. Any future address field would add a line to the delivery template only.
- **Shop address/timings in the message** (e.g., pickup location line) — requires `shop_settings.address`/`timings` to be passed into the builder; additive, does not change the contract.
- **Customer phone country-code inference** — PM decision (mirrors Backend deferral).
- **V2 Cloud API** — seam designed (§13), implementation deferred until MVP proves order volume justifies per-message costs and template approval.
- **Per-message **`was`** hints for percentage offers at quantity** — the hint reflects the actual line-level discount; per-unit "was" pricing (`was ₹245 → ₹198`) is a display nicety deferred to V2.

