import Link from 'next/link';
import { EmptyState } from '@/components/admin/empty-state';
import { ProductCard } from '@/components/storefront/product-card';
import type { Catalog } from '@/types/domain';

const FEATURED_LIMIT = 8;

export function FeaturedProducts({ catalog }: { catalog: Catalog }) {
  const currency = catalog.shop.currency;
  const offersById = new Map(catalog.offers.map((o) => [o.id, o]));
  const featured = selectFeatured(catalog.products, FEATURED_LIMIT);

  return (
    <section id="featured" className="border-y border-zinc-200 bg-[#faf5ec]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">
              Handpicked
            </span>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              Featured chocolates
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-600">
              Our most-loved chocolates, ready to order.
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-900"
          >
            Shop all →
          </Link>
        </div>

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
