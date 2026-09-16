'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { nameSchema, phoneSchema, noteSchema } from '@/lib/validation/schemas';
import { formatMoney } from '@/lib/pricing/money';
import { buildOrderMessage } from '@/lib/orders/message';
import { isBundleOffer } from '@/components/storefront/offer-label';
import { useCart } from '@/components/storefront/cart-context';
import { useToast } from '@/components/admin/toast';
import type { Fulfilment, Offer } from '@/types/domain';

const inputClass =
  'w-full min-h-11 rounded-xl border border-cream-300 bg-cream-100 px-3.5 py-2.5 text-base sm:text-sm text-cocoa-900 placeholder:text-cocoa-500/80 transition-colors focus:border-terracotta-700 focus:outline-none focus:ring-2 focus:ring-terracotta-700/20';
const labelClass = 'mb-1.5 block text-sm font-semibold text-cocoa-900';

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

  const bundleOffers = useMemo(() => {
    const seen = new Map<string, Offer>();
    for (const item of items) {
      if (item.offer && isBundleOffer(item.offer)) seen.set(item.offer.id, item.offer);
    }
    return [...seen.values()];
  }, [items]);
  const bundleLabel = bundleOffers.length === 1 ? bundleOffers[0].title : null;

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
    toast('success', 'Order ready in WhatsApp');
    router.push('/order-success');
  };

  if (items.length === 0 && !submitted) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-cream-300 bg-ivory px-6 py-16 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-400/25 text-terracotta-700">
            <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
              <path d="M9 10a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold text-cocoa-900">Your cart is empty</h1>
          <p className="mt-2 text-sm leading-relaxed text-cocoa-400">
            Add something delicious before checking out.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-cocoa-900 px-6 text-sm font-semibold text-ivory transition-colors hover:bg-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
          >
            Browse Chocolates
          </Link>
        </div>
      </div>
    );
  }

  if (!orderingEnabled) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-cream-300 bg-ivory p-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-terracotta-700">Checkout</span>
          <h1 className="mt-2 font-display text-2xl font-semibold text-cocoa-900 sm:text-3xl">
            We&apos;re not taking orders right now
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-cocoa-400">
            Orders are currently paused. Your cart is safe and waiting — please check back a little
            later.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cocoa-900 px-5 text-sm font-semibold text-ivory transition-colors hover:bg-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cream-300 bg-cream-100 px-5 text-sm font-semibold text-cocoa-900 transition-colors hover:border-terracotta-700 hover:text-terracotta-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
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
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-cream-300 bg-ivory p-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-terracotta-700">Checkout</span>
          <h1 className="mt-2 font-display text-2xl font-semibold text-cocoa-900 sm:text-3xl">
            WhatsApp ordering unavailable
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-cocoa-400">
            WhatsApp ordering is temporarily unavailable. Your cart is safe — please try again a
            little later or contact the store directly.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cocoa-900 px-5 text-sm font-semibold text-ivory transition-colors hover:bg-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cream-300 bg-cream-100 px-5 text-sm font-semibold text-cocoa-900 transition-colors hover:border-terracotta-700 hover:text-terracotta-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-terracotta-700">Checkout</span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-cocoa-900 sm:text-4xl">
          Complete your order
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-cocoa-500 sm:text-base">
          Fill in your details below — your order will be confirmed over WhatsApp.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-5 lg:gap-10">
        <form onSubmit={handleSubmit} noValidate className="order-2 space-y-6 lg:order-1 lg:col-span-3">
          <CheckoutSection number={2} title="Your details" hint="How can we reach you about this order?">
            <div>
              <label htmlFor="checkout-name" className={labelClass}>
                Customer Name <span className="text-danger">*</span>
              </label>
              <input
                id="checkout-name"
                autoComplete="name"
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => blur('name')}
                placeholder="Your name"
                aria-invalid={touched.name && !!errors.name}
                aria-describedby={touched.name && errors.name ? 'checkout-name-error' : undefined}
                className={`${inputClass} ${touched.name && errors.name ? 'border-danger' : ''}`}
              />
              {touched.name && errors.name && (
                <p id="checkout-name-error" className="mt-1.5 text-xs font-medium text-danger">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="checkout-phone" className={labelClass}>
                Mobile Number <span className="text-danger">*</span>
              </label>
              <input
                id="checkout-phone"
                autoComplete="tel"
                required
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => blur('phone')}
                placeholder="e.g. 98765 43210"
                aria-invalid={touched.phone && !!errors.phone}
                aria-describedby={touched.phone && errors.phone ? 'checkout-phone-error' : undefined}
                className={`${inputClass} ${touched.phone && errors.phone ? 'border-danger' : ''}`}
              />
              {touched.phone && errors.phone && (
                <p id="checkout-phone-error" className="mt-1.5 text-xs font-medium text-danger">
                  {errors.phone}
                </p>
              )}
            </div>
          </CheckoutSection>

          <CheckoutSection number={3} title="Delivery method" hint="How would you like to receive your order?">
            <fieldset>
              <legend className="sr-only">Delivery method</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['pickup', 'delivery'] as Fulfilment[])
                  .filter((f) => (f === 'delivery' ? deliveryAvailable : true))
                  .map((f) => {
                    const selected = activeFulfilment === f;
                    return (
                      <label
                        key={f}
                        className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-cocoa-900 ${
                          selected
                            ? 'border-terracotta-700 bg-ivory'
                            : 'border-cream-300 bg-cream-100 hover:border-terracotta-700/50'
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
                            selected ? 'bg-gold-400 text-cocoa-950' : 'bg-cream-300/40 text-cocoa-400'
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
                          <span className={`block text-sm font-semibold ${selected ? 'text-cocoa-900' : 'text-cocoa-600'}`}>
                            {f === 'pickup' ? 'Pickup' : 'Home Delivery'}
                          </span>
                          <span className="mt-0.5 block text-xs text-cocoa-400">
                            {f === 'pickup' ? 'Collect at the store' : "We'll deliver to your door"}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                            selected ? 'border-terracotta-700 bg-gold-400 text-cocoa-950' : 'border-cream-300 text-transparent'
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
                  Delivery Address <span className="text-danger">*</span>
                </label>
                <textarea
                  id="checkout-address"
                  autoComplete="street-address"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => blur('address')}
                  rows={3}
                  placeholder="House, street, area, landmark, city"
                  aria-invalid={touched.address && !!errors.address}
                  aria-describedby={touched.address && errors.address ? 'checkout-address-error' : undefined}
                  className={`${inputClass} resize-none ${touched.address && errors.address ? 'border-danger' : ''}`}
                />
                <p className="mt-1.5 text-xs text-cocoa-500">Required for home delivery.</p>
                {touched.address && errors.address && (
                  <p id="checkout-address-error" className="mt-1.5 text-xs font-medium text-danger">
                    {errors.address}
                  </p>
                )}
              </div>
            )}
          </CheckoutSection>

          <CheckoutSection number={4} title="Order notes" hint="Anything else we should know?">
            <div>
              <label htmlFor="checkout-note" className={labelClass}>
                Order Notes <span className="text-cocoa-500">(optional)</span>
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
                className={`${inputClass} resize-none ${touched.note && errors.note ? 'border-danger' : ''}`}
              />
              {touched.note && errors.note && (
                <p id="checkout-note-error" className="mt-1.5 text-xs font-medium text-danger">
                  {errors.note}
                </p>
              )}
            </div>
          </CheckoutSection>

          <div className="pt-1">
            <button
              type="submit"
              disabled={!isValid || submitted}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-cocoa-900 px-6 py-3.5 text-sm font-bold text-ivory shadow-md shadow-cocoa-900/20 transition-all hover:-translate-y-0.5 hover:bg-cocoa-950 hover:shadow-lg hover:shadow-cocoa-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              {submitted ? (
                <>
                  <svg className="size-4 animate-spin text-gold-400 motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                  </svg>
                  Opening WhatsApp…
                </>
              ) : (
                <>
                  <svg className="size-4 fill-current text-gold-400" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                  </svg>
                  Place Order on WhatsApp
                </>
              )}
            </button>

            {submitError && (
              <div role="alert" className="mt-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3">
                <p className="text-sm font-medium text-red-700">{submitError}</p>
                {fallbackWaUrl && (
                  <a
                    href={fallbackWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-danger/25 bg-cream-100 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                  >
                    Open WhatsApp manually
                  </a>
                )}
                <p className="mt-2 text-xs text-cocoa-500">Your cart is still here — nothing is lost.</p>
              </div>
            )}

            <div className="mt-4 flex flex-col items-center gap-1 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs leading-5 text-cocoa-500">
                <svg className="size-4 shrink-0 text-terracotta-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Your order will open in WhatsApp for you to review and confirm.
              </p>
              <p className="text-xs leading-5 text-cocoa-500">
                Your cart is only cleared once WhatsApp opens successfully.
              </p>
            </div>
          </div>
        </form>

        <aside className="order-1 lg:order-2 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 lg:sticky lg:top-24">
            <div className="flex items-center gap-3 border-b border-cream-300 px-5 py-4">
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-400/20 font-display text-sm font-bold text-terracotta-700"
              >
                1
              </span>
              <div className="flex flex-1 items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-cocoa-900 sm:text-lg">Your Order</h2>
                <span className="rounded-full border border-cream-300 bg-ivory px-2.5 py-0.5 text-xs font-semibold text-cocoa-400">
                  {summary.itemCount} item{summary.itemCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <ul className="divide-y divide-cream-300/70 px-4 sm:px-5">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-ivory">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-terracotta-700">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-cocoa-900">{item.productName}</p>
                    {item.variantLabel && (
                      <p className="mt-0.5 break-words text-xs text-cocoa-400">{item.variantLabel}</p>
                    )}
                    <p className="mt-0.5 text-xs text-cocoa-400">
                      Qty {item.quantity} · {formatMoney(item.unitPrice, currency)} each
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-cocoa-900">
                    {formatMoney(item.unitPrice * item.quantity, currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-cream-300 bg-ivory px-5 py-4 text-sm">
              <div className="flex items-center justify-between text-cocoa-400">
                <span>Subtotal</span>
                <span className="font-medium text-cocoa-900">{formatMoney(summary.subtotal, currency)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex items-center justify-between gap-3 text-cocoa-400">
                  <span className="min-w-0 truncate">{bundleLabel ?? 'Discount'}</span>
                  <span className="shrink-0 font-semibold text-success">
                    − {formatMoney(summary.discount, currency)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-cream-300 pt-2.5">
                <span className="font-display text-base font-semibold text-cocoa-900">Grand Total</span>
                <span className="font-display text-2xl font-bold text-cocoa-900">
                  {formatMoney(summary.total, currency)}
                </span>
              </div>
              {summary.discount > 0 && (
                <p className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-success">
                  <svg className="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
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
    <section className="rounded-2xl border border-cream-300 bg-cream-100 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-gold-400/20 font-display text-sm font-bold text-terracotta-700"
        >
          {number}
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-cocoa-900 sm:text-lg">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-cocoa-400">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
