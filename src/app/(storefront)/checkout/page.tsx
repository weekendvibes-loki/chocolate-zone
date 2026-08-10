import { getCatalog } from '@/lib/services/catalog';
import { EmptyState } from '@/components/admin/empty-state';
import { CheckoutForm } from '@/components/storefront/checkout-form';
import type { Catalog } from '@/types/domain';

export default async function CheckoutPage() {
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
          title="We couldn't load the store"
          description="Something went wrong while fetching store details. Please try again in a moment."
        />
      </div>
    );
  }

  return (
    <CheckoutForm
      whatsappNumber={catalog.shop.whatsapp_number}
      whatsappOrderingEnabled={catalog.shop.whatsapp_ordering_enabled}
      deliveryEnabled={catalog.shop.delivery_enabled}
      currency={catalog.shop.currency}
      brand={catalog.shop.brand}
    />
  );
}
