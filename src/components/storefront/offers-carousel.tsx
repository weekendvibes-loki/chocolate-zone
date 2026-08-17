'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatMoney, toMinor } from '@/lib/pricing/money';
import { discountLabel } from '@/components/storefront/offer-label';
import type { CatalogProduct, Offer } from '@/types/domain';

const AUTOPLAY_MS = 4500;

export function OffersCarousel({
  offers,
  currency,
  products = [],
}: {
  offers: Offer[];
  currency: string;
  products?: CatalogProduct[];
}) {
  const count = offers.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [autoplayKey, setAutoplayKey] = useState(0);
  const regionRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActive(((index % count) + count) % count);
      setAutoplayKey((k) => k + 1);
    },
    [count],
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion || count <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, reduceMotion, count, autoplayKey]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(active - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(active + 1);
      }
    };
    region.addEventListener('keydown', onKey);
    return () => region.removeEventListener('keydown', onKey);
  }, [go, active]);

  if (count === 0) return null;

  const pauseHandlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };

  return (
    <section className="relative overflow-hidden bg-[#1E100B]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(179,112,61,0.16),transparent_70%)]"
      />
      <div
        ref={regionRef}
        className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6"
        aria-roledescription="carousel"
        aria-label="Featured offers"
        {...pauseHandlers}
      >
        {count > 1 && (
          <div className="mb-8 flex items-center justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-[#B3703D]/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#F2B84B]">
                Limited offers
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CarouselButton
                label="Previous offer"
                direction="prev"
                onClick={() => go(active - 1)}
              />
              <CarouselButton
                label="Next offer"
                direction="next"
                onClick={() => go(active + 1)}
              />
            </div>
          </div>
        )}

        <div className="relative w-full overflow-hidden" aria-live="polite">
          <div className="grid w-full grid-cols-1">
            {offers.map((offer, i) => (
              <div
                key={offer.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Offer ${i + 1} of ${count}`}
                aria-hidden={i !== active}
                className="col-start-1 row-start-1 transition-transform duration-700 ease-out"
                style={{
                  transform: `translateX(${(i - active) * 100}%)`,
                  transitionDuration: reduceMotion ? '0ms' : undefined,
                }}
              >
                <CarouselSlide offer={offer} currency={currency} products={products} priority={i === active} />
              </div>
            ))}
          </div>
        </div>

        {count > 1 && (
          <div className="mt-8 flex justify-center gap-2.5">
            {offers.map((offer, i) => (
              <button
                key={offer.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to offer ${i + 1}: ${offer.title}`}
                aria-current={i === active}
                className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/60 ${
                  i === active ? 'w-8 bg-[#F2B84B]' : 'w-2.5 bg-[#E7D5C1]/25 hover:bg-[#E7D5C1]/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CarouselSlide({
  offer,
  currency,
  products,
  priority,
}: {
  offer: Offer;
  currency: string;
  products: CatalogProduct[];
  priority: boolean;
}) {
  return (
    <div className="grid w-full min-w-0 gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="order-2 min-w-0 min-h-[340px] lg:order-1 lg:flex lg:h-[500px] lg:min-h-0 lg:flex-col lg:justify-center">
        <span className="inline-flex items-center rounded-full border border-[#B3703D]/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#F2B84B]">
          Limited offer
        </span>
        <h2 className="mt-4 max-w-full break-words font-serif text-3xl font-semibold leading-tight tracking-tight text-[#FFF7EA] sm:text-4xl">
          {offer.title}
        </h2>
        <div className="mt-4 inline-flex max-w-full rounded-xl bg-[#F2B84B] px-3.5 py-1.5 text-sm font-bold text-[#1E100B]">
          {discountLabel(offer, currency)}
        </div>
        {offer.description && (
          <p className="mt-5 max-w-md text-sm leading-7 text-[#E7D5C1]">{offer.description}</p>
        )}
        <OfferBundle offer={offer} products={products} currency={currency} />
        <Link
          href={`/products?offer=${encodeURIComponent(offer.id)}`}
          className="mt-8 inline-flex max-w-full items-center justify-center rounded-xl bg-[#B3703D] px-7 py-3 text-sm font-semibold text-[#FFF7EA] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#B3703D]/90 hover:shadow-[0_12px_28px_-10px_rgba(179,112,61,0.6)]"
        >
          View offer
        </Link>
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="relative aspect-[4/3] w-full max-w-full overflow-hidden rounded-3xl ring-1 ring-[#F2B84B]/15 shadow-2xl lg:aspect-auto lg:h-[500px]">
          {offer.image_url ? (
            <>
              <Image
                src={offer.image_url}
                alt={offer.title}
                fill
                priority={priority}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1E100B]/35 via-transparent to-transparent"
              />
            </>
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#311A10] via-[#2A1710] to-[#1E100B] px-8 text-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_80%_at_50%_0%,rgba(179,112,61,0.28),transparent_70%)]"
              />
              <svg
                aria-hidden="true"
                className="relative size-14 text-[#F2B84B]"
                viewBox="0 0 800 600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <ellipse cx={400} cy={275} rx={225} ry={210} />
                <ellipse cx={400} cy={275} rx={225} ry={210} transform="rotate(60 400 275)" opacity={0.6} />
                <ellipse cx={400} cy={275} rx={225} ry={210} transform="rotate(120 400 275)" opacity={0.35} />
              </svg>
              <span className="relative max-w-full break-words font-serif text-2xl font-semibold leading-snug text-[#FFF7EA] sm:text-3xl">
                {offer.title}
              </span>
              <span
                aria-hidden="true"
                className="relative h-px w-12 bg-gradient-to-r from-transparent via-[#F2B84B]/70 to-transparent"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Bundle composition for multi-product fixed offers (e.g. Duo), shown on the
 * promo slide. Everything here is derived from existing offer/product data —
 * member prices come from `base_price`, and the deal/savings use the offer's
 * own `discount_value`. Presentation only: the real discount is applied by the
 * cart engine via `cartDiscount`. Mirrors offers-page `OfferComposition`.
 */
function OfferBundle({
  offer,
  products,
  currency,
}: {
  offer: Offer;
  products: CatalogProduct[];
  currency: string;
}) {
  if (offer.applies_to_all) return null;
  const members = products.filter((p) => offer.offerProductIds.includes(p.id));
  if (members.length <= 1) return null;

  const normalMinor = members.reduce((sum, p) => sum + toMinor(p.base_price), 0);
  const showDeal = offer.discount_type === 'fixed';
  const dealMinor = showDeal ? normalMinor - toMinor(offer.discount_value) : null;
  const savingsMinor = showDeal ? toMinor(offer.discount_value) : null;

  return (
    <div className="mt-6 max-w-md rounded-2xl border border-[#B3703D]/40 bg-[#1E100B]/60 p-4">
      <ul className="space-y-1.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-[#FFF7EA]">{m.name}</span>
            <span className="text-[#E7D5C1]/80">{formatMoney(toMinor(m.base_price), currency)}</span>
          </li>
        ))}
      </ul>
      {dealMinor !== null && savingsMinor !== null && (
        <p className="mt-3 border-t border-[#B3703D]/40 pt-3 text-sm font-semibold text-[#FFF7EA]">
          Normal {formatMoney(normalMinor, currency)} · Deal {formatMoney(dealMinor, currency)}
        </p>
      )}
      {savingsMinor !== null && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#F2B84B]">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Save {formatMoney(savingsMinor, currency)}
        </p>
      )}
    </div>
  );
}

function CarouselButton({
  label,
  direction,
  onClick,
}: {
  label: string;
  direction: 'prev' | 'next';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full border border-[#B3703D]/40 bg-white/[0.04] text-[#E7D5C1] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F2B84B]/60 hover:bg-[#B3703D] hover:text-[#FFF7EA] hover:shadow-[0_0_16px_rgba(242,184,75,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/60"
    >
      <svg
        className={`size-5 ${direction === 'prev' ? '' : 'rotate-180'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="m15 5-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
