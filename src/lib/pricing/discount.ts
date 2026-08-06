// Pricing: offer discount rules (pure) — docs/BACKEND.md §5.2.
// All functions are dependency-free and integer-only (minor units).

import { percentOf, toMinor, type Minor } from './money';

export type OfferType = 'percentage' | 'fixed';

/** The offer shape the pricing layer computes against (offer_products resolved server-side). */
export interface OfferRule {
  id: string;
  title: string;
  discount_type: OfferType;
  discount_value: string; // DB numeric string; converted inside
  applies_to_all: boolean;
  productIds: string[]; // resolved from offer_products
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface PricedLineVariant {
  id: string;
  name: string;
  option: string;
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
    if (d > bestAmount) {
      best = o;
      bestAmount = d;
    }
  }
  return { offer: best, discount: bestAmount };
}

/** Best offer at qty=1 — used only for /api/catalog strikethrough display. */
export function bestOfferForProduct(offers: OfferRule[], productId: string, now: Date): OfferRule | null {
  return applyBestOffer(100, 1, productId, offers, now).offer;
}
