// Row → domain mappers — docs/BACKEND.md §2, §6, SUPABASE.md §7.4.
// Supabase returns `numeric` as a string at runtime even though the generated
// types narrow it to `number`; `String(...)` at this boundary keeps the domain
// types (numeric strings) honest regardless of runtime shape.

import type { Database } from '@/types/supabase';
import type { OfferRule } from '@/lib/pricing/discount';
import type { Category, Offer, Product, ProductVariant, ShopSettings, TimingRule } from '@/types/domain';

type ShopRow = Database['public']['Tables']['shop_settings']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type VariantRow = Database['public']['Tables']['product_variants']['Row'];
type OfferRow = Database['public']['Tables']['offers']['Row'];

export function mapTimings(json: unknown): TimingRule[] | null {
  if (json === null || json === undefined) return null;
  return Array.isArray(json) ? (json as TimingRule[]) : [];
}

export function mapTheme(json: unknown): Record<string, unknown> {
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as Record<string, unknown>;
}

export function mapShopSettings(row: ShopRow): ShopSettings {
  return {
    id: row.id,
    brand: row.brand,
    logo: row.logo,
    theme: mapTheme(row.theme),
    currency: row.currency,
    whatsapp_number: row.whatsapp_number,
    address: row.address,
    timings: mapTimings(row.timings),
    delivery_fee: String(row.delivery_fee),
    free_delivery_threshold: row.free_delivery_threshold === null ? null : String(row.free_delivery_threshold),
    delivery_enabled: row.delivery_enabled,
    pickup_enabled: row.pickup_enabled,
    is_open: row.is_open,
    ordering_enabled: row.ordering_enabled,
    announcement: row.announcement,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    emoji: row.emoji,
    image_url: row.image_url,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    base_price: String(row.base_price),
    image_url: row.image_url,
    is_featured: row.is_featured,
    is_veg: row.is_veg,
    stock_qty: row.stock_qty,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapProductVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    product_id: row.product_id,
    name: row.name,
    option: row.option,
    price_delta: String(row.price_delta),
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapOffer(row: OfferRow, offerProductIds: string[]): Offer {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    discount_type: row.discount_type as 'percentage' | 'fixed',
    discount_value: String(row.discount_value),
    applies_to_all: row.applies_to_all,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    offerProductIds,
  };
}

export function toOfferRule(offer: Offer): OfferRule {
  return {
    id: offer.id,
    title: offer.title,
    discount_type: offer.discount_type,
    discount_value: offer.discount_value,
    applies_to_all: offer.applies_to_all,
    productIds: offer.offerProductIds,
    starts_at: offer.starts_at,
    ends_at: offer.ends_at,
    is_active: offer.is_active,
  };
}
