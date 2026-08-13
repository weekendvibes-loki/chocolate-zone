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
      <div className="rounded-2xl border border-[#E7D5C1] bg-[#FFF7EA] px-6 py-12 text-center sm:px-12 sm:py-14">
        <span
          className="mx-auto grid size-14 place-items-center rounded-full bg-[#F2B84B]/25 text-[#B3703D] animate-[success-pop_0.45s_ease-out] motion-reduce:animate-none"
          aria-hidden="true"
        >
          <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight text-[#2A1710] sm:text-4xl">
          Your order has been sent
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#6B4A33] sm:text-base">
          Your order details have been sent through WhatsApp.
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-xl border border-[#E7D5C1] bg-white p-5 text-left">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[#25D366]/15 text-[#1E100B]"
              aria-hidden="true"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.94L2 22l5.2-1.5A9.9 9.9 0 1 0 12.04 2Zm5.8 14.06c-.24.68-1.4 1.3-1.94 1.35-.5.05-1.13.24-3.8-.8-3.22-1.25-5.26-4.5-5.42-4.71-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.11-2.66.3-.32.64-.4.85-.4h.62c.2 0 .47-.07.73.56.27.64.92 2.24 1 2.4.08.16.13.35.03.56-.1.21-.16.34-.31.53-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.19.32.83 1.37 1.79 2.22 1.23 1.1 2.27 1.44 2.59 1.6.32.16.51.13.7-.08.18-.21.8-.94 1.02-1.26.21-.32.42-.27.71-.16.29.1 1.85.87 2.17 1.03.32.16.53.24.6.37.09.13.09.79-.16 1.5Z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-[#2A1710]">Your order is ready in WhatsApp</p>
              <p className="mt-1 text-sm leading-relaxed text-[#7A4E2D]">
                Please review the order there and continue the conversation with {brand}.
              </p>
            </div>
          </div>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-[#B3703D] transition-colors hover:text-[#2A1710] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              WhatsApp didn&apos;t open? Open it again
            </a>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/products"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#2A1710] px-6 text-sm font-semibold text-[#F5E6D5] transition-colors hover:bg-[#1E100B] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:w-auto"
          >
            Continue Shopping
          </Link>
          <Link
            href="/offers"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#B3703D]/40 bg-white px-6 text-sm font-semibold text-[#B3703D] transition-colors hover:border-[#B3703D] hover:bg-[#FFF7EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:w-auto"
          >
            Explore Offers
          </Link>
        </div>
      </div>
    </div>
  );
}
