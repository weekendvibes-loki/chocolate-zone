import Link from 'next/link';
import Image from 'next/image';
import { BackButton } from '@/components/storefront/back-button';
import { discountLabel } from '@/components/storefront/offer-label';
import { formatMoney, toMinor } from '@/lib/pricing/money';
import type { Catalog, Offer } from '@/types/domain';
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function validityLabel(o: Offer): string | null {
  if (o.ends_at) {
    const until = formatDate(o.ends_at);
    if (until) return `Valid until ${until}`;
  }
  return null;
}

function offerCta(o: Offer): string {
  return `/products?offer=${encodeURIComponent(o.id)}`;
}

export function OffersPage({ catalog }: { catalog: Catalog }) {
  const currency = catalog.shop.currency;
  const offers = catalog.offers;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <BackButton />
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Special offers</span>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
          Something sweet, for less.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-500 sm:text-base">
          Grab a deal on your favourites while they last — discounts apply automatically at checkout.
        </p>
      </div>

      {offers.length === 0 ? (
        <EmptyOffers />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => {
            const validity = validityLabel(offer);
            const cta = offerCta(offer);
            return (
              <Link
                key={offer.id}
                href={cta}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#f5ede1]">
                  {offer.image_url ? (
                    <Image
                      src={offer.image_url}
                      alt={offer.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center p-6 text-center font-serif text-xl font-semibold text-amber-700/70">
                      {offer.title}
                    </span>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-900 shadow-sm">
                    {discountLabel(offer, currency)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h2 className="font-serif text-lg font-semibold text-zinc-900 sm:text-xl">{offer.title}</h2>
                  {offer.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">{offer.description}</p>
                  )}
                  <OfferComposition offer={offer} catalog={catalog} currency={currency} />
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                    {validity ? (
                      <span className="text-xs font-medium text-zinc-500">{validity}</span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600">Live now</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 transition-colors group-hover:text-amber-900">
                      Shop the offer
                      <svg
                        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OfferComposition({
  offer,
  catalog,
  currency,
}: {
  offer: Offer;
  catalog: Catalog;
  currency: string;
}) {
  if (offer.applies_to_all) return null;
  const members = catalog.products.filter((p) => offer.offerProductIds.includes(p.id));
  const isBundle = members.length > 1;
  if (!isBundle) return null;

  const normalMinor = members.reduce((sum, p) => sum + toMinor(p.base_price), 0);
  const showDeal = offer.discount_type === 'fixed';
  const dealMinor = showDeal ? normalMinor - toMinor(offer.discount_value) : null;

  return (
    <div className="mt-4 rounded-xl border border-[#E7D5C1]/70 bg-[#FFF7EA] px-4 py-3">
      <ul className="space-y-1.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-[#2A1710]">{m.name}</span>
            <span className="text-[#7A4E2D]">{formatMoney(toMinor(m.base_price), currency)}</span>
          </li>
        ))}
      </ul>
      {dealMinor !== null && (
        <p className="mt-2.5 border-t border-[#E7D5C1] pt-2.5 text-sm font-semibold text-[#2A1710]">
          Normal {formatMoney(normalMinor, currency)} · Deal {formatMoney(dealMinor, currency)}
        </p>
      )}
    </div>
  );
}

function EmptyOffers() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-[#fbf7f0] px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" strokeLinejoin="round" />
          <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
      </span>
      <h2 className="mt-5 font-serif text-2xl font-semibold text-zinc-900">No active offers</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        New deals are on the way. Check back soon or browse the full collection in the meantime.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Browse the collection
      </Link>
    </div>
  );
}
