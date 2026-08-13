import { getCatalog } from '@/lib/services/catalog';
import { StorefrontErrorState } from '@/components/storefront/error-state';
import { OffersPage } from '@/components/storefront/offers-page';
import { OrdersClosedBanner } from '@/components/storefront/orders-closed-banner';
import type { Catalog } from '@/types/domain';

export default async function OffersRoute() {
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
          title="The offers couldn't be loaded"
          description="Something went wrong while fetching the store. Please try again in a moment."
          backLabel="Back to menu"
        />
      </div>
    );
  }

  return (
    <>
      {!catalog.shop.ordering_enabled && <OrdersClosedBanner />}
      <OffersPage catalog={catalog} />
    </>
  );
}
