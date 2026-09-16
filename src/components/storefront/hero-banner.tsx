import Link from 'next/link';
import { OffersCarousel } from '@/components/storefront/offers-carousel';
import type { Catalog } from '@/types/domain';

export function HeroBanner({ catalog }: { catalog: Catalog }) {
  return (
    <section className="relative overflow-hidden bg-[#faf5ec]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[#F2B84B]/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-[#B3703D]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-10 top-12 hidden size-16 rotate-12 rounded-2xl bg-[#2A1710]/85 shadow-lg lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-12 right-48 hidden size-8 rounded-full bg-[#F2B84B] lg:block"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E7D5C1] bg-white/80 px-3 py-1 text-xs font-semibold text-[#B3703D]">
            <span
              className="size-1.5 rounded-full bg-[#F2B84B]"
              aria-hidden="true"
            />
            Small-batch · Handcrafted · Daily fresh
          </span>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight text-[#2A1710] sm:text-5xl lg:text-6xl">
            Handcrafted <span className="text-[#B3703D]">chocolate</span>, made
            fresh daily.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#6B4A33] sm:text-lg">
            From rich dark bars to silky truffles — every piece is crafted with
            premium cocoa and a whole lot of love.
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
          <OffersCarousel offers={catalog.offers} />
        </div>
      </div>
    </section>
  );
}
