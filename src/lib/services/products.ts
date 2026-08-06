// Product detail + variants + best offer — docs/BACKEND.md §6.2, §9.
// Cached per-id (tags: catalog, revalidate 60). Returns null for inactive/unknown.

import { unstable_cache } from 'next/cache';
import { createAnonDataClient } from '@/lib/supabase/server';
import { CATALOG_TAG } from '@/lib/revalidate';
import { bestOfferForProduct, isOfferActive } from '@/lib/pricing/discount';
import { mapOffer, mapProduct, mapProductVariant, toOfferRule } from './mappers';
import type { CatalogProduct, Offer, ProductDetail } from '@/types/domain';

export const getProductDetail = unstable_cache(
  async (id: string): Promise<ProductDetail | null> => {
    const supabase = createAnonDataClient();

    const { data: productRow, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!productRow) return null;

    const [categoryRes, variantsRes, offersRes, offerProductsRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, slug, name')
        .eq('id', productRow.category_id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase.from('product_variants').select('*').eq('product_id', id).eq('is_active', true),
      supabase.from('offers').select('*').eq('is_active', true),
      supabase.from('offer_products').select('*'),
    ]);

    if (categoryRes.error) throw categoryRes.error;
    if (variantsRes.error) throw variantsRes.error;
    if (offersRes.error) throw offersRes.error;
    if (offerProductsRes.error) throw offerProductsRes.error;

    const now = new Date();
    const productIdsByOffer = new Map<string, string[]>();
    for (const link of offerProductsRes.data) {
      const current = productIdsByOffer.get(link.offer_id) ?? [];
      current.push(link.product_id);
      productIdsByOffer.set(link.offer_id, current);
    }

    const offers: Offer[] = offersRes.data
      .map((row) => mapOffer(row, productIdsByOffer.get(row.id) ?? []))
      .filter((o) => isOfferActive(toOfferRule(o), now));
    const offerRules = offers.map(toOfferRule);

    const best = bestOfferForProduct(offerRules, id, now);
    const bestOffer = best ? (offers.find((o) => o.id === best.id) ?? null) : null;
    const product: CatalogProduct = { ...mapProduct(productRow), bestOfferId: best?.id ?? null };

    return {
      product,
      variants: variantsRes.data.map(mapProductVariant),
      category: categoryRes.data,
      bestOffer,
    };
  },
  ['product-detail'],
  { revalidate: 60, tags: [CATALOG_TAG] },
);
