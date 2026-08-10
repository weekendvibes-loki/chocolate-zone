// Homepage-only presentational sections (server components).
// Data-driven only: featured offer carousel, brand/experience, final CTA.

import Link from 'next/link';
import { OffersCarousel } from '@/components/storefront/offers-carousel';
import type { Catalog } from '@/types/domain';

export function FeaturedOfferSection({ catalog }: { catalog: Catalog }) {
  return <OffersCarousel offers={catalog.offers} currency={catalog.shop.currency} />;
}

const brandFeatures = [
  {
    title: 'Handcrafted daily',
    copy: 'Made fresh every day with care — from our kitchen to your table.',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3a5 5 0 0 0-5 5c0 1.8.9 3 2 4v6h6v-6c1.1-1 2-2.2 2-4a5 5 0 0 0-5-5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Premium cocoa',
    copy: 'Rich, real ingredients in every bar, truffle and box we make.',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 3c-1.5 4 1 6 2 9s0 6 4 9c4-3 5-6 4-9s-3-5-1.5-9" strokeLinecap="round" />
        <path d="M8 3c2 2 6 2 8 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Made to share',
    copy: 'Thoughtful portions and gifting-ready packs for every occasion.',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M12 7v13M12 7c-2.5-2.5-7-1-7 2h7ZM12 7c2.5-2.5 7-1 7 2h-7Z" strokeLinejoin="round" />
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
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">
          The {catalog.shop.brand} experience
        </span>
        <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Chocolates made to be savoured
        </h2>
        <p className="mt-4 text-base leading-7 text-zinc-600">{statement}</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {brandFeatures.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700">
              {f.icon}
            </span>
            <h3 className="mt-4 font-serif text-lg font-semibold text-zinc-900">{f.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{f.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-[#faf5ec]">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">
          Craving something sweet?
        </span>
        <h2 className="mx-auto mt-4 max-w-2xl font-serif text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          Ready for something delicious?
        </h2>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-zinc-600">
          Browse the full menu and add your favourites to the cart — we&apos;ll have them ready for you.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/products"
            className="rounded-xl bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-zinc-700 hover:shadow-md"
          >
            Shop Chocolates
          </Link>
          <Link
            href="#menu"
            className="rounded-xl border border-zinc-300 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900"
          >
            Browse the menu
          </Link>
        </div>
      </div>
    </section>
  );
}
