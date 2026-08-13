// Homepage-only presentational sections (server components).
// Data-driven only: featured offer carousel, brand/experience, final CTA.

import Link from 'next/link';
import { OffersCarousel } from '@/components/storefront/offers-carousel';
import type { Catalog } from '@/types/domain';

export function FeaturedOfferSection({ catalog }: { catalog: Catalog }) {
  return (
    <OffersCarousel offers={catalog.offers} products={catalog.products} currency={catalog.shop.currency} />
  );
}

const brandFeatures = [
  {
    title: 'Handcrafted',
    copy: 'Small-batch chocolate, made with care.',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3a5 5 0 0 0-5 5c0 1.8.9 3 2 4v6h6v-6c1.1-1 2-2.2 2-4a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Fresh daily',
    copy: 'Made fresh every day, from our kitchen to your table.',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M17 18a5 5 0 0 0-10 0M12 2v3M4.22 10.22l2.12 2.12M1.5 18h2M20.5 18h2M17.66 12.34l2.12-2.12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Premium cocoa',
    copy: 'Rich, real ingredients in every bar, truffle and box.',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 3c-1.5 4 1 6 2 9s0 6 4 9c4-3 5-6 4-9s-3-5-1.5-9" strokeLinecap="round" />
        <path d="M8 3c2 2 6 2 8 0" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BrandSection({ catalog }: { catalog: Catalog }) {
  const announcement = catalog.shop.announcement?.trim();
  const statement =
    announcement ??
    'From rich dark bars to silky truffles, every piece is crafted with premium cocoa and a whole lot of love.';

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#B3703D]">
          The {catalog.shop.brand} experience
        </span>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[#2A1710] sm:text-4xl">
          Chocolates made to be savoured
        </h2>
        <p className="mt-4 text-base leading-7 text-[#6B4A33]">{statement}</p>
      </div>

      <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {brandFeatures.map((f, i) => (
          <div key={f.title} className="relative border-t border-[#E7D5C1] pt-6">
            <span
              aria-hidden="true"
              className="absolute right-0 top-4 font-serif text-5xl font-semibold text-[#E7D5C1]"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="grid size-10 place-items-center rounded-full bg-[#F2B84B]/15 text-[#B3703D]">
              {f.icon}
            </span>
            <h3 className="mt-4 font-serif text-lg font-semibold text-[#2A1710]">{f.title}</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-[#6B4A33]">{f.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-[#2A1710]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(179,112,61,0.22),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#F2B84B]">
          Craving something sweet?
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl font-semibold tracking-tight text-[#FFF7EA] sm:text-5xl">
          Ready for something delicious?
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#E7D5C1]">
          Browse our chocolates, waffles and brownies — add your favourites and we&apos;ll have them ready for you.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/products"
            className="rounded-xl bg-[#F2B84B] px-8 py-3.5 text-sm font-bold text-[#1E100B] shadow-lg shadow-black/25 transition-all hover:-translate-y-0.5 hover:brightness-105 motion-reduce:transition-none"
          >
            Shop Chocolates
          </Link>
          <Link
            href="/offers"
            className="rounded-xl border border-[#B3703D]/70 bg-white/5 px-8 py-3.5 text-sm font-semibold text-[#FFF7EA] transition-all hover:-translate-y-0.5 hover:border-[#F2B84B] hover:text-[#F2B84B] motion-reduce:transition-none"
          >
            Explore Offers
          </Link>
        </div>
        <a
          href="https://instagram.com/chocolatezone_02"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-[#E7D5C1]/70 transition-colors hover:text-[#F2B84B]"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
          </svg>
          Follow @chocolatezone_02
        </a>
      </div>
    </section>
  );
}
