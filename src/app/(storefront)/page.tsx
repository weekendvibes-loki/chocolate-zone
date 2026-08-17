import { getCatalog } from '@/lib/services/catalog';
import { EmptyState } from '@/components/admin/empty-state';
import { HeroBanner } from '@/components/storefront/hero-banner';
import { CategorySection } from '@/components/storefront/category-section';
import { FeaturedProducts } from '@/components/storefront/featured-products';
import { FeaturedOfferSection } from '@/components/storefront/home-sections';
import { OrdersClosedBanner } from '@/components/storefront/orders-closed-banner';
import type { Catalog } from '@/types/domain';

export default async function HomePage() {
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
          title="We couldn't load the menu"
          description="Something went wrong while fetching the catalog. Please try again in a moment."
        />
      </div>
    );
  }

  return (
    <div>
      {!catalog.shop.ordering_enabled && <OrdersClosedBanner />}
      <HeroBanner catalog={catalog} />
      <FeaturedOfferSection catalog={catalog} />
      <CategorySection categories={catalog.categories} />
      <FeaturedProducts catalog={catalog} />
    </div>
  );
}
