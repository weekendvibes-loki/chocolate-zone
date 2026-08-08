import Link from 'next/link';
import Image from 'next/image';
import type { Catalog } from '@/types/domain';
import { discountLabel } from '@/components/storefront/offer-label';

export function HeroBanner({ catalog }: { catalog: Catalog }) {
  const currency = catalog.shop.currency;
  const offer = catalog.offers.find((o) => o.image_url) ?? catalog.offers[0] ?? null;

  return (
    <section className="relative overflow-hidden bg-[#faf5ec]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-amber-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-[#3a2418]/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-10 top-12 hidden size-16 rotate-12 rounded-2xl bg-[#3a2418]/80 shadow-lg lg:block" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-12 right-48 hidden size-8 rounded-full bg-amber-400/80 lg:block" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700">
            <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            Small-batch · Handcrafted · Daily fresh
          </span>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
            Handcrafted <span className="text-amber-700">chocolate</span>, made fresh daily.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-zinc-600 sm:text-lg">
            From rich dark bars to silky truffles — every piece is crafted with premium cocoa and a whole lot of love.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="rounded-xl bg-zinc-900 px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-zinc-700 hover:shadow-md"
            >
              Shop Chocolates
            </Link>
            <Link
              href="#featured"
              className="rounded-xl border border-zinc-300 bg-white px-7 py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-amber-400 hover:text-amber-700"
            >
              Explore Offers
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
          {offer ? (
            <Link
              href="#featured"
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-zinc-900/10 transition-shadow hover:shadow-2xl lg:aspect-[5/6]"
            >
              {offer.image_url ? (
                <Image
                  src={offer.image_url}
                  alt={offer.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-300 to-amber-500">
                  <span className="px-6 text-center font-serif text-xl font-semibold text-amber-950">
                    {offer.title}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#2a1d17]/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="inline-flex rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-zinc-900">
                  {discountLabel(offer, currency)}
                </span>
                <h2 className="mt-2 font-serif text-xl font-semibold text-white">{offer.title}</h2>
                {offer.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-white/80">{offer.description}</p>
                )}
              </div>
            </Link>
          ) : (
            <div className="grid aspect-[4/5] w-full place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <div>
                <span className="grid size-14 place-items-center rounded-full bg-amber-50">
                  <svg className="size-7 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M12 3v18M3 12h18" strokeLinecap="round" />
                    <path d="m5 5 14 14M19 5 5 19" strokeLinecap="round" />
                  </svg>
                </span>
                <p className="mt-4 text-sm text-zinc-500">Featured offers will appear here soon.</p>
              </div>
            </div>
          )}

          {offer?.image_url && (
            <span
              aria-hidden="true"
              className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-lg sm:block"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Today&apos;s pick
              </span>
              <span className="mt-0.5 block font-serif text-base font-semibold text-zinc-900">
                Small-batch &amp; fresh
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
