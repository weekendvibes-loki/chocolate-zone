import { getProductDetail } from '@/lib/services/products';
import { getCatalog } from '@/lib/services/catalog';
import { StorefrontErrorState } from '@/components/storefront/error-state';
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
        <StorefrontErrorState
          title="Product not available"
          description="We couldn't find this product. It may have been removed or is no longer active."
          backHref="/products"
          backLabel="Back to products"
        />
      </div>
    );
  }

  const related = catalog.products
    .filter((p) => p.category_id === detail.product.category_id && p.id !== detail.product.id)
    .slice(0, 4);

  return <ProductDetails detail={detail} catalog={catalog} related={related} />;
}
