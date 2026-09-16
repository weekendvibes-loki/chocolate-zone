import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/storefront/ui/badge';
import { EmptyState } from '@/components/storefront/ui/empty-state';
import { buttonClass } from '@/components/storefront/ui/button';
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
      <BackButton />
      <div className="mb-8 max-w-2xl sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-terracotta-700">Special offers</span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-cocoa-900 sm:text-4xl">
          Something sweet, for less.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-cocoa-500 sm:text-base">
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
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 transition-[border-color,box-shadow] duration-[var(--dur-base)] hover:border-terracotta-600/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
                  {offer.image_url ? (
                    <Image
                      src={offer.image_url}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-[var(--dur-base)] group-hover:scale-105 motion-reduce:transform-none"
                    />
                  ) : (
                    <span aria-hidden="true" className="grid h-full w-full place-items-center text-terracotta-600">
                      <svg className="size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 3h8l10 10-8 8L3 11V3Z" strokeLinejoin="round" />
                        <circle cx="7.5" cy="7.5" r="1" />
                      </svg>
                    </span>
                  )}
                  <Badge variant="offer" className="absolute left-3 top-3">
                    {discountLabel(offer, currency)}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
                  <h2 className="font-display text-lg font-semibold text-cocoa-900 sm:text-xl">{offer.title}</h2>
                  {offer.description && (
                    <p className="line-clamp-3 text-sm leading-6 text-cocoa-500">{offer.description}</p>
                  )}
                  <OfferComposition offer={offer} catalog={catalog} currency={currency} />
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-cream-300/60 pt-4">
                    {validity ? (
                      <span className="text-xs font-medium text-cocoa-500">{validity}</span>
                    ) : (
                      <span className="text-xs font-medium text-success">Live now</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta-700 transition-colors group-hover:text-cocoa-900">
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
    <div className="mt-4 rounded-xl border border-cream-300/70 bg-ivory px-4 py-3">
      <ul className="space-y-1.5">
        {members.map((m) => (
          <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-cocoa-900">{m.name}</span>
            <span className="text-cocoa-400">{formatMoney(toMinor(m.base_price), currency)}</span>
          </li>
        ))}
      </ul>
      {dealMinor !== null && (
        <p className="mt-2.5 border-t border-cream-300 pt-2.5 text-sm font-semibold text-cocoa-900">
          Normal {formatMoney(normalMinor, currency)} · Deal {formatMoney(dealMinor, currency)}
        </p>
      )}
    </div>
  );
}

function EmptyOffers() {
  return (
    <EmptyState
      title="No active offers"
      description="Check back soon or browse the full collection in the meantime."
      action={
        <Link href="/products" className={buttonClass()}>
          Browse the collection
        </Link>
      }
    />
  );
}
