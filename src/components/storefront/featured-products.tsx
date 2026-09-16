import Link from 'next/link';
import { EmptyState } from '@/components/storefront/ui/empty-state';
import { SectionHeading } from '@/components/storefront/ui/section-heading';
import { ProductCard } from '@/components/storefront/product-card';
import type { Catalog } from '@/types/domain';

const FEATURED_LIMIT = 8;

export function FeaturedProducts({ catalog }: { catalog: Catalog }) {
  const currency = catalog.shop.currency;
  const offersById = new Map(catalog.offers.map((o) => [o.id, o]));
  const featured = selectFeatured(catalog.products, FEATURED_LIMIT);

  return (
    <section id="featured" className="border-y border-cream-300 bg-cream-200">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="Fresh favourites"
          title="Today's Top Picks"
          description="The ones our regulars keep coming back for, ready to order."
          className="mb-10"
          action={
            <Link
              href="/products"
              className="group inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-terracotta-700 transition-colors duration-[var(--dur-base)] ease-out-soft hover:text-cocoa-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-200 motion-reduce:transition-none"
            >
              View full menu
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-4 transition-transform duration-[var(--dur-base)] ease-out-soft group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          }
        />

        {featured.length === 0 ? (
          <EmptyState title="No products yet" description="Fresh chocolates are being prepared." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {featured.map((p) => {
              const offer = p.bestOfferId ? (offersById.get(p.bestOfferId) ?? null) : null;
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  offer={offer}
                  currency={currency}
                  hasVariants={(catalog.variantsByProduct[p.id]?.length ?? 0) > 0}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function selectFeatured(products: Catalog['products'], limit: number): Catalog['products'] {
  const featured = products.filter((p) => p.is_featured);
  const source =
    featured.length > 0
      ? featured
      : [...products].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return source.slice(0, limit);
}
