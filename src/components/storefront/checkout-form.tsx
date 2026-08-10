'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { nameSchema, phoneSchema, noteSchema } from '@/lib/validation/schemas';
import { formatMoney } from '@/lib/pricing/money';
import { buildOrderMessage } from '@/lib/orders/message';
import { useCart } from '@/components/storefront/cart-context';
import { useToast } from '@/components/admin/toast';
import type { Fulfilment } from '@/types/domain';

const inputClass =
  'w-full min-h-11 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30';
const labelClass = 'mb-1.5 block text-sm font-medium text-zinc-700';

export function CheckoutForm({
  whatsappNumber,
  whatsappOrderingEnabled,
  orderingEnabled,
  deliveryEnabled,
  currency,
  brand,
}: {
  whatsappNumber: string;
  whatsappOrderingEnabled: boolean;
  orderingEnabled: boolean;
  deliveryEnabled: boolean;
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fallbackWaUrl, setFallbackWaUrl] = useState<string | null>(null);

  const deliveryAvailable = deliveryEnabled;
  const activeFulfilment: Fulfilment = deliveryAvailable ? fulfilment : 'pickup';
  const whatsAppAvailable = whatsappOrderingEnabled && whatsappNumber.trim().length > 0;
  const orderingAvailable = orderingEnabled && whatsAppAvailable;

  const errors = useMemo(() => {
    const nameResult = nameSchema.safeParse(name);
    const phoneResult = phoneSchema.safeParse(phone);
    const noteResult = noteSchema.safeParse(note);
    return {
      name: nameResult.success ? undefined : nameResult.error.issues[0]?.message,
      phone: phoneResult.success ? undefined : phoneResult.error.issues[0]?.message,
      address:
        activeFulfilment === 'delivery' && !address.trim()
          ? 'Delivery address is required.'
          : undefined,
      note: noteResult.success ? undefined : noteResult.error.issues[0]?.message,
    };
  }, [address, activeFulfilment, name, note, phone]);

  const isValid =
    items.length > 0 &&
    orderingAvailable &&
    !errors.name &&
    !errors.phone &&
    !errors.address &&
    !errors.note;

  const blur = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitted(true);
    setSubmitError(null);
    setFallbackWaUrl(null);

    const { waUrl } = buildOrderMessage({
      brand,
      whatsappNumber,
      name: name.trim(),
      phone: phone.trim(),
      fulfilment: activeFulfilment,
      address: address.trim(),
      note: note.trim(),
      items,
      summary,
      currency,
    });

    // The `noopener` window feature makes window.open() return null even on
    // success (spec), so it cannot be used to detect a blocked popup. Open the
    // URL directly in a new tab (still within the user gesture) and only treat
    // a null return as a genuine block, falling back to a manual link.
    let win: Window | null = null;
    try {
      win = window.open(waUrl, '_blank');
    } catch {
      win = null;
    }

    if (!win) {
      setSubmitted(false);
      setSubmitError('Your browser blocked WhatsApp from opening automatically.');
      setFallbackWaUrl(waUrl);
      return;
    }

    try {
      win.opener = null;
    } catch {
      // Cross-origin windows may refuse the setter; the tab is still open.
    }

    clear();
    toast('success', 'Order sent to WhatsApp');
    router.push('/order-success');
  };

  if (items.length === 0 && !submitted) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-zinc-300 bg-[#fbf7f0] px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
            <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
              <path d="M9 10a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-zinc-900">Your cart is empty</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Add a few treats before checking out — they&apos;ll be waiting right here.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  if (!orderingEnabled) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Checkout</span>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-zinc-900 sm:text-3xl">
            We&apos;re not taking orders right now
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Orders are currently paused. Your cart is safe and waiting — please check back a little
            later.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!whatsAppAvailable) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Checkout</span>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-zinc-900 sm:text-3xl">
            WhatsApp ordering unavailable
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            WhatsApp ordering is temporarily unavailable. Your cart is safe — please try again a
            little later or contact the store directly.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Secure checkout</span>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Complete your order
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
          Fill in your details below — your order will be confirmed over WhatsApp.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
        <form onSubmit={handleSubmit} noValidate className="space-y-6 lg:col-span-3">
          <CheckoutSection number={1} title="Your details" hint="How can we reach you about this order?">
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
                aria-invalid={touched.name && !!errors.name}
                aria-describedby={touched.name && errors.name ? 'checkout-name-error' : undefined}
                className={`${inputClass} ${touched.name && errors.name ? 'border-red-400' : ''}`}
              />
              {touched.name && errors.name && (
                <p id="checkout-name-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.name}
                </p>
              )}
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
                aria-invalid={touched.phone && !!errors.phone}
                aria-describedby={touched.phone && errors.phone ? 'checkout-phone-error' : undefined}
                className={`${inputClass} ${touched.phone && errors.phone ? 'border-red-400' : ''}`}
              />
              {touched.phone && errors.phone && (
                <p id="checkout-phone-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.phone}
                </p>
              )}
            </div>
          </CheckoutSection>

          <CheckoutSection number={2} title="Delivery method" hint="How would you like to receive your order?">
            <fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['pickup', 'delivery'] as Fulfilment[])
                  .filter((f) => (f === 'delivery' ? deliveryAvailable : true))
                  .map((f) => {
                    const selected = activeFulfilment === f;
                    return (
                      <label
                        key={f}
                        className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-amber-500 ${
                          selected
                            ? 'border-amber-500 bg-amber-50/70'
                            : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="fulfilment"
                          value={f}
                          checked={selected}
                          onChange={() => setFulfilment(f)}
                          className="sr-only"
                        />
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
                            selected ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-100 text-zinc-500'
                          }`}
                          aria-hidden="true"
                        >
                          {f === 'pickup' ? (
                            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M4 9 5.5 4h9L16 9" strokeLinejoin="round" />
                              <path d="M3 9h14v11H3z" strokeLinejoin="round" />
                              <path d="M8 20v-5h4v5" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M2.5 5.5h10v10h-10z" strokeLinejoin="round" />
                              <path d="M12.5 9h4l3 3v3.5h-7z" strokeLinejoin="round" />
                              <circle cx="6.5" cy="18.5" r="1.8" />
                              <circle cx="16" cy="18.5" r="1.8" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-zinc-900">
                            {f === 'pickup' ? 'Pickup' : 'Home Delivery'}
                          </span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {f === 'pickup' ? 'Collect at the store' : "We'll deliver to your door"}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                            selected ? 'border-amber-500 bg-amber-400 text-zinc-900' : 'border-zinc-300 text-transparent'
                          }`}
                        >
                          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </fieldset>

            {activeFulfilment === 'delivery' && (
              <div>
                <label htmlFor="checkout-address" className={labelClass}>
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="checkout-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => blur('address')}
                  rows={3}
                  placeholder="House, street, area, landmark, city"
                  aria-invalid={touched.address && !!errors.address}
                  aria-describedby={touched.address && errors.address ? 'checkout-address-error' : undefined}
                  className={`${inputClass} resize-none ${touched.address && errors.address ? 'border-red-400' : ''}`}
                />
                <p className="mt-1.5 text-xs text-zinc-400">Required for home delivery.</p>
                {touched.address && errors.address && (
                  <p id="checkout-address-error" className="mt-1.5 text-xs font-medium text-red-600">
                    {errors.address}
                  </p>
                )}
              </div>
            )}
          </CheckoutSection>

          <CheckoutSection number={3} title="Order notes" hint="Anything else we should know?">
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
                aria-invalid={touched.note && !!errors.note}
                aria-describedby={touched.note && errors.note ? 'checkout-note-error' : undefined}
                className={`${inputClass} resize-none ${touched.note && errors.note ? 'border-red-400' : ''}`}
              />
              {touched.note && errors.note && (
                <p id="checkout-note-error" className="mt-1.5 text-xs font-medium text-red-600">
                  {errors.note}
                </p>
              )}
            </div>
          </CheckoutSection>

          <div className="pt-1">
            <button
              type="submit"
              disabled={!isValid || submitted}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              {submitted ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Opening WhatsApp…
                </>
              ) : (
                <>
                  <svg className="size-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                  </svg>
                  Place Order on WhatsApp
                </>
              )}
            </button>

            {submitError && (
              <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700">{submitError}</p>
                {fallbackWaUrl && (
                  <a
                    href={fallbackWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    Open WhatsApp manually
                  </a>
                )}
                <p className="mt-2 text-xs text-zinc-500">Your cart is still here — nothing is lost.</p>
              </div>
            )}

            <div className="mt-4 flex items-start justify-center gap-2 text-xs leading-5 text-zinc-500">
              <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
              <p>
                You&apos;ll be redirected to WhatsApp to confirm your order. Your cart is only cleared
                once WhatsApp opens successfully.
              </p>
            </div>
          </div>
        </form>

        <aside className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="font-serif text-lg font-semibold text-zinc-900">Order Summary</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                {summary.itemCount} item{summary.itemCount === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="max-h-80 divide-y divide-zinc-100 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="56px"
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
                    <p className="truncate text-sm font-semibold text-zinc-900">{item.productName}</p>
                    {item.variantLabel && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{item.variantLabel}</p>
                    )}
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Qty {item.quantity} · {formatMoney(item.unitPrice, currency)} each
                    </p>
                  </div>
                  <span className="text-sm font-bold text-zinc-900">
                    {formatMoney(item.unitPrice * item.quantity, currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-zinc-100 bg-[#fbf7f0] px-5 py-4 text-sm">
              <div className="flex items-center justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">{formatMoney(summary.subtotal, currency)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Discount</span>
                  <span className="font-medium text-emerald-600">− {formatMoney(summary.discount, currency)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-zinc-200 pt-2.5">
                <span className="font-serif text-base font-semibold text-zinc-900">Grand Total</span>
                <span className="font-serif text-xl font-bold text-zinc-900">
                  {formatMoney(summary.total, currency)}
                </span>
              </div>
              {summary.discount > 0 && (
                <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-emerald-600">
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  You save {formatMoney(summary.discount, currency)} on this order
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CheckoutSection({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-amber-100 font-serif text-sm font-bold text-amber-700"
        >
          {number}
        </span>
        <div>
          <h2 className="font-serif text-base font-semibold text-zinc-900 sm:text-lg">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
