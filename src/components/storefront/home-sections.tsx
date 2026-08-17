// Homepage-only presentational sections (server components).
// Data-driven only: featured offer carousel.

import { OffersCarousel } from '@/components/storefront/offers-carousel';
import type { Catalog } from '@/types/domain';

export function FeaturedOfferSection({ catalog }: { catalog: Catalog }) {
  return (
    <OffersCarousel offers={catalog.offers} products={catalog.products} currency={catalog.shop.currency} />
  );
}
