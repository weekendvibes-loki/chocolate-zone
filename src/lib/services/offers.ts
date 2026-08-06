// Admin offers service — docs/BACKEND.md §7.3, §8.
// Writes the offer row and replaces its offer_products (delete-then-insert).
// discount_value: percentage offers store the percent (1..100); fixed offers store
// minor units (converted to numeric at the boundary).

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidateCatalog } from '@/lib/revalidate';
import { offerInputSchema } from '@/lib/validation/schemas';
import { toDbNumeric, toMinor } from '@/lib/pricing/money';
import type { Database } from '@/types/supabase';
import type { z } from 'zod';

export type OfferInput = z.infer<typeof offerInputSchema>;
type OfferRow = Database['public']['Tables']['offers']['Row'];

export interface AdminOffer {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number; // percentage → percent (1..100); fixed → minor units
  applies_to_all: boolean;
  product_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapAdminOffer(row: OfferRow, productIds: string[]): AdminOffer {
  const isPercentage = row.discount_type === 'percentage';
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    discount_type: row.discount_type as 'percentage' | 'fixed',
    discount_value: isPercentage ? Number(row.discount_value) : toMinor(row.discount_value),
    applies_to_all: row.applies_to_all,
    product_ids: productIds,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Numeric value for the DB: fixed offers store minor units converted to rupees. */
function dbDiscountValue(input: OfferInput): number {
  return input.discount_type === 'fixed' ? toDbNumeric(input.discount_value) : input.discount_value;
}

async function replaceOfferProducts(offerId: string, productIds: string[]): Promise<void> {
  const { error: delError } = await supabaseAdmin
    .from('offer_products')
    .delete()
    .eq('offer_id', offerId);
  if (delError) throw delError;

  if (productIds.length > 0) {
    const { error: insError } = await supabaseAdmin.from('offer_products').insert(
      productIds.map((product_id) => ({ offer_id: offerId, product_id })),
    );
    if (insError) throw insError;
  }
}

async function fetchProductIds(offerId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('offer_products')
    .select('product_id')
    .eq('offer_id', offerId);
  if (error) throw error;
  return (data ?? []).map((row) => row.product_id);
}

export async function listOffers(): Promise<AdminOffer[]> {
  const { data, error } = await supabaseAdmin.from('offers').select('*').order('sort_order', { ascending: true });
  if (error) throw error;

  const offers = data ?? [];
  if (offers.length === 0) return [];

  const ids = offers.map((o) => o.id);
  const { data: links, error: linkError } = await supabaseAdmin
    .from('offer_products')
    .select('offer_id, product_id')
    .in('offer_id', ids);
  if (linkError) throw linkError;

  const productIdsByOffer = new Map<string, string[]>();
  for (const link of links ?? []) {
    const group = productIdsByOffer.get(link.offer_id);
    if (group) group.push(link.product_id);
    else productIdsByOffer.set(link.offer_id, [link.product_id]);
  }

  return offers.map((row) => mapAdminOffer(row, productIdsByOffer.get(row.id) ?? []));
}

export async function createOffer(input: OfferInput): Promise<AdminOffer> {
  const { data: offer, error } = await supabaseAdmin
    .from('offers')
    .insert({
      title: input.title,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      discount_type: input.discount_type,
      discount_value: dbDiscountValue(input),
      applies_to_all: input.applies_to_all,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      is_active: input.is_active ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;

  await replaceOfferProducts(offer.id, input.applies_to_all ? [] : input.product_ids);

  revalidateCatalog();
  return mapAdminOffer(offer, await fetchProductIds(offer.id));
}

export async function updateOffer(id: string, input: OfferInput): Promise<AdminOffer> {
  const { data: offer, error } = await supabaseAdmin
    .from('offers')
    .update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
      ...(input.discount_type !== undefined ? { discount_type: input.discount_type } : {}),
      ...(input.discount_value !== undefined ? { discount_value: dbDiscountValue(input) } : {}),
      ...(input.applies_to_all !== undefined ? { applies_to_all: input.applies_to_all } : {}),
      ...(input.starts_at !== undefined ? { starts_at: input.starts_at } : {}),
      ...(input.ends_at !== undefined ? { ends_at: input.ends_at } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  await replaceOfferProducts(offer.id, input.applies_to_all ? [] : input.product_ids);

  revalidateCatalog();
  return mapAdminOffer(offer, await fetchProductIds(offer.id));
}

export async function deleteOffer(id: string): Promise<void> {
  // offer_products cascade on delete (DDL §2).
  const { error } = await supabaseAdmin.from('offers').delete().eq('id', id);
  if (error) throw error;
  revalidateCatalog();
}
