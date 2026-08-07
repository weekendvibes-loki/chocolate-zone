import { EmptyState } from '@/components/admin/empty-state';
import { ProductCard } from '@/components/storefront/product-card';
import type { Catalog } from '@/types/domain';

const FEATURED_LIMIT = 8;

export function FeaturedProducts({ catalog }: { catalog: Catalog }) {
  const currency = catalog.shop.currency;
  const offersById = new Map(catalog.offers.map((o) => [o.id, o]));
  const featured = selectFeatured(catalog.products, FEATURED_LIMIT);

  return (
    <section id="featured" className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Featured products</h2>
          <p className="mt-1 text-sm text-zinc-500">Our most-loved chocolates, ready to order.</p>
        </div>

        {featured.length === 0 ? (
          <EmptyState title="No products yet" description="Fresh chocolates are being prepared." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => {
              const offer = p.bestOfferId ? (offersById.get(p.bestOfferId) ?? null) : null;
              return <ProductCard key={p.id} product={p} offer={offer} currency={currency} />;
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
