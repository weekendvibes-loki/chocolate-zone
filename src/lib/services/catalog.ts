// Catalog aggregate — docs/BACKEND.md §6.1, §9.
// Cached with unstable_cache (tags: catalog, revalidate 60). Reads run inside a
// cache scope, so they use the cookie-free anon client; RLS exposes active rows only.

import { unstable_cache } from 'next/cache';
import { createAnonDataClient } from '@/lib/supabase/server';
import { CATALOG_TAG } from '@/lib/revalidate';
import { bestOfferForProduct, isOfferActive } from '@/lib/pricing/discount';
import {
  mapCategory,
  mapOffer,
  mapProduct,
  mapProductVariant,
  mapShopSettings,
  toOfferRule,
} from './mappers';
import type { Catalog, CatalogProduct, Offer, ProductVariant } from '@/types/domain';

function requireData<T>(data: T | null, label: string): T {
  if (data === null || data === undefined) throw new Error(`Catalog read failed: ${label} is empty.`);
  return data;
}

export const getCatalog = unstable_cache(
  async (): Promise<Catalog> => {
    const supabase = createAnonDataClient();

    const [shopRes, categoriesRes, productsRes, variantsRes, offersRes, offerProductsRes] =
      await Promise.all([
        supabase.from('shop_settings').select('*').limit(1).maybeSingle(),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('products').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('product_variants').select('*').eq('is_active', true),
        supabase.from('offers').select('*').eq('is_active', true),
        supabase.from('offer_products').select('*'),
      ]);

    if (shopRes.error) throw shopRes.error;
    if (categoriesRes.error) throw categoriesRes.error;
    if (productsRes.error) throw productsRes.error;
    if (variantsRes.error) throw variantsRes.error;
    if (offersRes.error) throw offersRes.error;
    if (offerProductsRes.error) throw offerProductsRes.error;

    const now = new Date();

    // Resolve offer_products into offerProductIds.
    const productIdsByOffer = new Map<string, string[]>();
    for (const link of offerProductsRes.data) {
      const current = productIdsByOffer.get(link.offer_id) ?? [];
      current.push(link.product_id);
      productIdsByOffer.set(link.offer_id, current);
    }

    // Offers: active AND inside the start/end window (now() evaluated per request).
    const offers: Offer[] = offersRes.data
      .map((row) => mapOffer(row, productIdsByOffer.get(row.id) ?? []))
      .filter((o) => isOfferActive(toOfferRule(o), now));
    const offerRules = offers.map(toOfferRule);

    const shop = mapShopSettings(requireData(shopRes.data, 'shop_settings'));
    const categories = categoriesRes.data.map(mapCategory);
    const products: CatalogProduct[] = productsRes.data.map((row) => {
      const product = mapProduct(row);
      const best = bestOfferForProduct(offerRules, product.id, now);
      return { ...product, bestOfferId: best?.id ?? null };
    });

    const variantsByProduct: Record<string, ProductVariant[]> = {};
    for (const row of variantsRes.data) {
      const variant = mapProductVariant(row);
      const group = variantsByProduct[variant.product_id];
      if (group) group.push(variant);
      else variantsByProduct[variant.product_id] = [variant];
    }

    return {
      shop,
      categories,
      products,
      variantsByProduct,
      offers,
      generatedAt: now.toISOString(),
    };
  },
  ['catalog-aggregate'],
  { revalidate: 60, tags: [CATALOG_TAG] },
);
