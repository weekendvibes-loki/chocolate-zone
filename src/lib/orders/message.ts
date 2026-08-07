// WhatsApp order message builder (pure) — mirrors the `buildOrderMessage()`
// contract referenced by CheckoutResponse (docs/BACKEND.md §5.4). WhatsApp
// renders `*text*` as bold; line breaks must be URL-encoded in the wa.me link.

import { formatMoney } from '@/lib/pricing/money';
import type { CartItem, CartSummary } from '@/components/storefront/cart-context';
import type { Fulfilment } from '@/types/domain';

export interface OrderMessageInput {
  brand: string;
  whatsappNumber: string;
  name: string;
  phone: string;
  fulfilment: Fulfilment;
  address: string;
  note: string;
  items: CartItem[];
  summary: CartSummary;
  currency: string;
}

export function buildOrderMessage(input: OrderMessageInput): { text: string; waUrl: string } {
  const method = input.fulfilment === 'delivery' ? 'Home Delivery' : 'Pickup';

  const lines: string[] = [];
  lines.push(`Hi ${input.brand}! I'd like to place an order.`, '');
  lines.push('*Customer*');
  lines.push(`Name: ${input.name}`);
  lines.push(`Phone: ${input.phone}`);
  lines.push(`Method: ${method}`);
  if (input.fulfilment === 'delivery' && input.address) {
    lines.push(`Address: ${input.address}`);
  }
  if (input.note) {
    lines.push(`Notes: ${input.note}`);
  }
  lines.push('', '*Order*');
  input.items.forEach((item, i) => {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : '';
    lines.push(
      `${i + 1}. ${item.productName}${variant} x ${item.quantity} — ${formatMoney(
        item.unitPrice * item.quantity,
        input.currency,
      )}`,
    );
  });
  lines.push('', '*Summary*');
  lines.push(`Subtotal: ${formatMoney(input.summary.subtotal, input.currency)}`);
  if (input.summary.discount > 0) {
    lines.push(`Discount: -${formatMoney(input.summary.discount, input.currency)}`);
  }
  lines.push(`Total: ${formatMoney(input.summary.total, input.currency)}`);

  const text = lines.join('\n');
  const waUrl = `https://wa.me/${input.whatsappNumber}?text=${encodeURIComponent(text)}`;
  return { text, waUrl };
}
