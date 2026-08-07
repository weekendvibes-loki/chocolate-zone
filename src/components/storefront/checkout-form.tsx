'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { nameSchema, phoneSchema, noteSchema } from '@/lib/validation/schemas';
import { formatMoney } from '@/lib/pricing/money';
import { buildOrderMessage } from '@/lib/orders/message';
import { useCart } from '@/components/storefront/cart-context';
import { useToast } from '@/components/admin/toast';
import { EmptyState } from '@/components/admin/empty-state';
import type { Fulfilment } from '@/types/domain';

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200';
const labelClass = 'mb-1 block text-sm font-medium text-zinc-700';

export function CheckoutForm({
  whatsappNumber,
  currency,
  brand,
}: {
  whatsappNumber: string;
  currency: string;
  brand: string;
}) {
  const router = useRouter();
  const { items, summary, clear } = useCart();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfilment, setFulfilment] = useState<Fulfilment>('pickup');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const nameResult = nameSchema.safeParse(name);
    const phoneResult = phoneSchema.safeParse(phone);
    const noteResult = noteSchema.safeParse(note);
    return {
      name: nameResult.success ? undefined : nameResult.error.issues[0]?.message,
      phone: phoneResult.success ? undefined : phoneResult.error.issues[0]?.message,
      address:
        fulfilment === 'delivery' && !address.trim() ? 'Delivery address is required.' : undefined,
      note: noteResult.success ? undefined : noteResult.error.issues[0]?.message,
    };
  }, [address, fulfilment, name, note, phone]);

  const isValid =
    items.length > 0 && !errors.name && !errors.phone && !errors.address && !errors.note;

  const blur = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitted(true);

    const { waUrl } = buildOrderMessage({
      brand,
      whatsappNumber,
      name: name.trim(),
      phone: phone.trim(),
      fulfilment,
      address: address.trim(),
      note: note.trim(),
      items,
      summary,
      currency,
    });

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    clear();
    toast('success', 'Order sent to WhatsApp');
    router.push('/order-success');
  };

  if (items.length === 0 && !submitted) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Your cart is empty"
          description="Add a few items before checking out."
        />
        <div className="mt-6 text-center">
          <Link
            href="/products"
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-zinc-900">Checkout</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Fill in your details and place the order on WhatsApp.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 lg:col-span-3">
          <div>
            <label htmlFor="checkout-name" className={labelClass}>
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              id="checkout-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => blur('name')}
              placeholder="Your name"
              className={inputClass}
            />
            {touched.name && errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="checkout-phone" className={labelClass}>
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              id="checkout-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => blur('phone')}
              placeholder="e.g. 98765 43210"
              className={inputClass}
            />
            {touched.phone && errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          <fieldset>
            <legend className={labelClass}>Delivery Method</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['pickup', 'delivery'] as Fulfilment[]).map((f) => (
                <label
                  key={f}
                  className={`cursor-pointer rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                    fulfilment === f
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="fulfilment"
                    value={f}
                    checked={fulfilment === f}
                    onChange={() => setFulfilment(f)}
                    className="sr-only"
                  />
                  {f === 'pickup' ? 'Pickup' : 'Home Delivery'}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="checkout-address" className={labelClass}>
              Delivery Address{' '}
              {fulfilment === 'delivery' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id="checkout-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => blur('address')}
              rows={3}
              placeholder="House, street, area, landmark, city"
              className={`${inputClass} resize-none`}
            />
            {fulfilment === 'delivery' && (
              <p className="mt-1 text-xs text-zinc-400">Required for home delivery.</p>
            )}
            {touched.address && errors.address && (
              <p className="mt-1 text-xs text-red-500">{errors.address}</p>
            )}
          </div>

          <div>
            <label htmlFor="checkout-note" className={labelClass}>
              Order Notes <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="checkout-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => blur('note')}
              rows={3}
              placeholder="Anything we should know?"
              className={`${inputClass} resize-none`}
            />
            {touched.note && errors.note && <p className="mt-1 text-xs text-red-500">{errors.note}</p>}
          </div>

          <div>
            <button
              type="submit"
              disabled={!isValid}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Place Order on WhatsApp
            </button>
            <p className="mt-2 text-center text-xs text-zinc-500">
              You'll be redirected to WhatsApp to confirm your order.
            </p>
          </div>
        </form>

        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-bold text-zinc-900">Order Summary</h2>
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-zinc-300">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{item.productName}</p>
                    {item.variantLabel && (
                      <p className="truncate text-xs text-zinc-500">{item.variantLabel}</p>
                    )}
                    <p className="text-xs text-zinc-500">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">
                    {formatMoney(item.unitPrice * item.quantity, currency)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex items-center justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">{formatMoney(summary.subtotal, currency)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Discount</span>
                  <span className="font-medium text-emerald-600">
                    − {formatMoney(summary.discount, currency)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-base font-bold text-zinc-900">
                <span>Grand Total</span>
                <span>{formatMoney(summary.total, currency)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
