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

/** A cart line as seen by the discount layer. */
export interface DiscountCartLine {
  productId: string;
  quantity: number;
  unitPrice: Minor;
  offer: OfferRule | null;
}

/** Total quantity of a product across the given cart lines. */
function quantityFor(lines: DiscountCartLine[], productId: string): number {
  return lines.reduce((sum, l) => (l.productId === productId ? sum + l.quantity : sum), 0);
}

/**
 * Discount for the cart lines that share ONE offer.
 *
 * Existing behavior is preserved exactly for:
 *  - percentage offers (per-line percentage, as before)
 *  - fixed offers on a single product or applies_to_all (per-line fixed,
 *    capped at each line's subtotal, as before)
 *
 * Multi-product fixed offers (bundles, offer_products length > 1) apply the
 * fixed discount ONCE PER COMPLETE QUALIFYING SET across the offer's
 * products: pairs are matched product-for-product, an incomplete set gets
 * no discount, and the discount never exceeds the qualifying subtotal.
 */
export function offerLinesDiscount(lines: DiscountCartLine[], offer: OfferRule): Minor {
  if (offer.discount_type === 'percentage') {
    return lines.reduce((sum, l) => sum + lineDiscount(l.unitPrice, l.quantity, offer), 0);
  }
  const fixed = toMinor(offer.discount_value);
  if (offer.productIds.length > 1) {
    const sets = Math.min(...offer.productIds.map((pid) => quantityFor(lines, pid)));
    if (sets <= 0) return 0;
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    return Math.min(fixed * sets, subtotal);
  }
  return lines.reduce((sum, l) => sum + lineDiscount(l.unitPrice, l.quantity, offer), 0);
}

/**
 * Total offer discount for a whole cart. Lines are grouped by their offer
 * and each offer is priced with {@link offerLinesDiscount}, so bundle
 * offers are matched across the lines that carry them while all other
 * offers keep their original per-line behavior.
 */
export function cartDiscount(lines: DiscountCartLine[]): Minor {
  const byOffer = new Map<string, { offer: OfferRule; lines: DiscountCartLine[] }>();
  for (const line of lines) {
    if (!line.offer) continue;
    const entry = byOffer.get(line.offer.id);
    if (entry) entry.lines.push(line);
    else byOffer.set(line.offer.id, { offer: line.offer, lines: [line] });
  }
  let total = 0;
  for (const { offer, lines: offerLines } of byOffer.values()) {
    total += offerLinesDiscount(offerLines, offer);
  }
  return total;
}
