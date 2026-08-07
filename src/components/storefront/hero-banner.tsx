import Link from 'next/link';
import Image from 'next/image';
import type { Catalog } from '@/types/domain';
import { discountLabel } from '@/components/storefront/offer-label';

export function HeroBanner({ catalog }: { catalog: Catalog }) {
  const currency = catalog.shop.currency;
  const offer = catalog.offers.find((o) => o.image_url) ?? catalog.offers[0] ?? null;

  return (
    <section className="border-b border-zinc-200 bg-gradient-to-br from-amber-50 via-white to-zinc-50">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
        <div>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Small-batch · Handcrafted · Daily fresh
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Handcrafted <span className="text-amber-600">chocolate</span>, made fresh daily.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-zinc-600 sm:text-lg">
            From rich dark bars to silky truffles — every piece is crafted with premium cocoa and a whole lot of love.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Order Now
            </Link>
            <Link
              href="#featured"
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900"
            >
              Browse products
            </Link>
          </div>
        </div>

        {offer ? (
          <Link
            href="#featured"
            className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm transition-shadow hover:shadow-lg"
          >
            {offer.image_url ? (
              <Image
                src={offer.image_url}
                alt={offer.title}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-200 to-amber-400">
                <span className="px-6 text-center text-lg font-bold text-amber-900">{offer.title}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="inline-flex rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-zinc-900">
                {discountLabel(offer, currency)}
              </span>
              <h2 className="mt-2 text-lg font-bold text-white">{offer.title}</h2>
              {offer.description && (
                <p className="mt-1 line-clamp-2 text-sm text-white/80">{offer.description}</p>
              )}
            </div>
          </Link>
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <div>
              <span className="grid size-12 place-items-center rounded-full bg-zinc-100">
                <svg className="size-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M12 3v18M3 12h18" strokeLinecap="round" />
                  <path d="m5 5 14 14M19 5 5 19" strokeLinecap="round" />
                </svg>
              </span>
              <p className="mt-3 text-sm text-zinc-500">Featured offers will appear here soon.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
