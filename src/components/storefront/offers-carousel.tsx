'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { discountLabel } from '@/components/storefront/offer-label';
import type { Offer } from '@/types/domain';

const AUTOPLAY_MS = 4500;

export function OffersCarousel({
  offers,
  currency,
}: {
  offers: Offer[];
  currency: string;
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
                <CarouselSlide offer={offer} currency={currency} />
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

function CarouselSlide({ offer, currency }: { offer: Offer; currency: string }) {
  return (
    <div className="grid w-full min-w-0 items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <div className="order-2 min-w-0 lg:order-1">
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
        <Link
          href={`/products?offer=${encodeURIComponent(offer.id)}`}
          className="mt-8 inline-flex max-w-full items-center justify-center rounded-xl bg-[#B3703D] px-7 py-3 text-sm font-semibold text-[#FFF7EA] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#B3703D]/90 hover:shadow-[0_12px_28px_-10px_rgba(179,112,61,0.6)]"
        >
          Shop the offer
        </Link>
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="relative aspect-[4/3] w-full max-w-full overflow-hidden rounded-3xl ring-1 ring-[#F2B84B]/15 shadow-2xl">
          {offer.image_url ? (
            <Image
              src={offer.image_url}
              alt={offer.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#B3703D]/15">
              <span className="max-w-full break-words px-6 text-center font-serif text-xl font-semibold text-[#E7D5C1]">
                {offer.title}
              </span>
            </div>
          )}
        </div>
      </div>
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
