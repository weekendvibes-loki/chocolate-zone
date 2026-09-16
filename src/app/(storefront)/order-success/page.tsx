import Link from 'next/link';
import { getCatalog } from '@/lib/services/catalog';

export default async function OrderSuccessPage() {
  let brand = 'our store';
  let whatsappNumber: string | null = null;
  try {
    const catalog = await getCatalog();
    brand = catalog.shop.brand;
    whatsappNumber = catalog.shop.whatsapp_number;
  } catch {
    // Fall back to generic copy if the catalog is unavailable.
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-cream-300 bg-ivory px-6 py-12 text-center sm:px-12 sm:py-14">
        <span
          className="mx-auto grid size-14 place-items-center rounded-full bg-gold-400/25 text-terracotta-700 animate-[success-pop_0.45s_ease-out] motion-reduce:animate-none"
          aria-hidden="true"
        >
          <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-cocoa-900 sm:text-4xl">
          Your order is ready in WhatsApp
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cocoa-500 sm:text-base">
          Review your order in WhatsApp and send the message to confirm it with the store.
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-xl border border-cream-300 bg-cream-100 p-5 text-left">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-whatsapp/15 text-cocoa-950"
              aria-hidden="true"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.94L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm5.8 14.06c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.24-3.8-.8-3.22-1.25-5.26-4.5-5.42-4.71-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.11-2.66.3-.32.64-.4.85-.4h.62c.2 0 .47-.07.73.56.27.64.92 2.24 1 2.4.08.16.13.35.03.56-.1.21-.16.34-.31.53-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.19.32.83 1.37 1.79 2.22 1.23 1.1 2.27 1.44 2.59 1.6.32.16.51.13.7-.08.18-.21.8-.94 1.02-1.26.21-.32.42-.27.71-.16.29.1 1.85.87 2.17 1.03.32.16.53.24.6.37.09.13.09.79-.16 1.5Z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-cocoa-900">Your order is ready in WhatsApp</p>
              <p className="mt-1 text-sm leading-relaxed text-cocoa-400">
                Please review the order there and continue the conversation with {brand}.
              </p>
            </div>
          </div>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-terracotta-700 transition-colors hover:text-cocoa-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
            >
              WhatsApp didn&apos;t open? Open it again
            </a>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-cocoa-900 px-6 text-sm font-semibold text-ivory transition-colors hover:bg-cocoa-950 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900 sm:w-auto"
          >
            Continue Shopping
          </Link>
          <Link
            href="/offers"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-terracotta-700/40 bg-cream-100 px-6 text-sm font-semibold text-terracotta-700 transition-colors hover:border-terracotta-700 hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900 sm:w-auto"
          >
            Explore Offers
          </Link>
        </div>
      </div>
    </div>
  );
}
