import { formatMoney, toMinor } from '@/lib/pricing/money';
import type { Offer } from '@/types/domain';

export function discountLabel(o: Offer, currency: string): string {
  if (o.discount_type === 'percentage') return `${o.discount_value}% OFF`;
  return `${formatMoney(toMinor(o.discount_value), currency)} OFF`;
}
