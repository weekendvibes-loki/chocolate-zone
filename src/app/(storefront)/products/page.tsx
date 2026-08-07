import { getCatalog } from '@/lib/services/catalog';
import { EmptyState } from '@/components/admin/empty-state';
import { ProductCatalog } from '@/components/storefront/product-catalog';
import type { Catalog } from '@/types/domain';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
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
        <EmptyState
          title="We couldn't load the products"
          description="Something went wrong while fetching the catalog. Please try again in a moment."
        />
      </div>
    );
  }

  const { category } = await searchParams;

  return <ProductCatalog catalog={catalog} initialCategory={category} />;
}
