import { formatMoney, toMinor } from '@/lib/pricing/money';
import type { Offer } from '@/types/domain';

export function discountLabel(o: Offer, currency: string): string {
  if (o.discount_type === 'percentage') return `${o.discount_value}% OFF`;
  return `${formatMoney(toMinor(o.discount_value), currency)} OFF`;
}

/** Multi-product (bundle) offer: the discount only applies when the full set is in the cart, never as an individual product discount. */
export function isBundleOffer(o: Offer): boolean {
  return o.offerProductIds.length > 1;
}
