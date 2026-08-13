import Link from 'next/link';
import Image from 'next/image';
import type { Catalog } from '@/types/domain';
import { discountLabel } from '@/components/storefront/offer-label';

export function HeroBanner({ catalog }: { catalog: Catalog }) {
  const currency = catalog.shop.currency;
  const offer = catalog.offers.find((o) => o.image_url) ?? catalog.offers[0] ?? null;

  return (
    <section className="relative overflow-hidden bg-[#faf5ec]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#F2B84B]/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-[#B3703D]/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-10 top-12 hidden size-16 rotate-12 rounded-2xl bg-[#2A1710]/85 shadow-lg lg:block" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-12 right-48 hidden size-8 rounded-full bg-[#F2B84B] lg:block" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7D5C1] bg-white/80 px-3 py-1 text-xs font-semibold text-[#B3703D]">
            <span className="size-1.5 rounded-full bg-[#F2B84B]" aria-hidden="true" />
            Small-batch · Handcrafted · Daily fresh
          </span>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight text-[#2A1710] sm:text-5xl lg:text-6xl">
            Handcrafted <span className="text-[#B3703D]">chocolate</span>, made fresh daily.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#6B4A33] sm:text-lg">
            From rich dark bars to silky truffles — every piece is crafted with premium cocoa and a whole lot of love.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="rounded-xl bg-[#2A1710] px-7 py-3.5 text-sm font-semibold text-[#FFF7EA] shadow-md shadow-[#2A1710]/20 ring-1 ring-[#F2B84B]/50 transition-all hover:-translate-y-0.5 hover:bg-[#1E100B] hover:shadow-lg hover:shadow-[#2A1710]/30 motion-reduce:transition-none"
            >
              Shop Chocolates
            </Link>
            <Link
              href="/offers"
              className="rounded-xl border border-[#B3703D]/60 bg-white/80 px-7 py-3.5 text-sm font-semibold text-[#7A4E2D] transition-all hover:-translate-y-0.5 hover:border-[#B3703D] hover:bg-[#F2B84B]/10 hover:text-[#2A1710] motion-reduce:transition-none"
            >
              Explore Offers
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
          {offer ? (
            <Link
              href={`/products?offer=${encodeURIComponent(offer.id)}`}
              className="group relative block aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-zinc-900/10 transition-shadow hover:shadow-2xl lg:aspect-[5/6]"
            >
              {offer.image_url ? (
                <Image
                  src={offer.image_url}
                  alt={offer.title}
                  fill
                  priority
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#B3703D] to-[#1E100B]">
                  <span className="px-6 text-center font-serif text-xl font-semibold text-[#FFF7EA]">
                    {offer.title}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1E100B]/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className="inline-flex rounded-full bg-[#F2B84B] px-2.5 py-1 text-xs font-bold text-[#1E100B]">
                  {discountLabel(offer, currency)}
                </span>
                <h2 className="mt-2 font-serif text-xl font-semibold text-[#FFF7EA]">{offer.title}</h2>
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
              className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-[#E7D5C1] bg-white px-4 py-3 shadow-lg sm:block"
            >
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#B3703D]">
                Today&apos;s pick
              </span>
              <span className="mt-0.5 block font-serif text-base font-semibold text-[#2A1710]">
                Small-batch &amp; fresh
              </span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
