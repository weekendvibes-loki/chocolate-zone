import Link from 'next/link';
import { getProductDetail } from '@/lib/services/products';
import { getCatalog } from '@/lib/services/catalog';
import { EmptyState } from '@/components/admin/empty-state';
import { ProductDetails } from '@/components/storefront/product-details';
import type { Catalog, ProductDetail } from '@/types/domain';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let catalog: Catalog | null = null;
  try {
    catalog = await getCatalog();
  } catch {
    catalog = null;
  }

  let detail: ProductDetail | null = null;
  try {
    detail = await getProductDetail(id);
  } catch {
    detail = null;
  }

  if (!catalog || !detail) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <EmptyState
          variant="search"
          title="Product not available"
          description="We couldn't find this product. It may have been removed or is no longer active."
        />
        <div className="mt-6 text-center">
          <Link
            href="/products"
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            Back to products
          </Link>
        </div>
      </div>
    );
  }

  const related = catalog.products
    .filter((p) => p.category_id === detail.product.category_id && p.id !== detail.product.id)
    .slice(0, 4);

  return <ProductDetails detail={detail} catalog={catalog} related={related} />;
}
