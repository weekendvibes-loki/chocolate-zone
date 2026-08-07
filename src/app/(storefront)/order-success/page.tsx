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
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-5 text-2xl font-bold text-zinc-900">Thank you for your order!</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Your order details have been sent to us on WhatsApp. We'll confirm availability and
          get back to you shortly. You can also reach us directly at any time.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Continue Shopping
          </Link>
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-900 hover:bg-zinc-50"
            >
              Contact {brand}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
