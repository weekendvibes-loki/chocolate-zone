import { getCatalog } from '@/lib/services/catalog';
import { StorefrontErrorState } from '@/components/storefront/error-state';
import { ProductCatalog } from '@/components/storefront/product-catalog';
import { OrdersClosedBanner } from '@/components/storefront/orders-closed-banner';
import type { Catalog } from '@/types/domain';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string | string[]; offer?: string | string[] }>;
}) {
  let catalog: Catalog | null = null;
  try {
    catalog = await getCatalog();
  } catch {
    catalog = null;
  }

  if (!catalog) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <StorefrontErrorState
          title="The treats couldn't be loaded"
          description="Something went wrong while fetching the collection. Please try again in a moment."
          backLabel="Back to menu"
        />
      </div>
    );
  }

  const { category, search, offer } = await searchParams;
  const initialQuery = typeof search === 'string' ? search : undefined;
  const initialOfferId = typeof offer === 'string' ? offer : undefined;

  return (
    <>
      {!catalog.shop.ordering_enabled && <OrdersClosedBanner />}
      <ProductCatalog
        catalog={catalog}
        initialCategory={category}
        initialQuery={initialQuery}
        initialOfferId={initialOfferId}
      />
    </>
  );
}
