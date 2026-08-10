// Admin shop settings service — single-row shop_settings read/update.
// Checkout reads the same row through getCatalog(); writing here revalidates
// the catalog cache so the storefront picks up changes (docs/BACKEND.md §9).

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidateCatalog } from '@/lib/revalidate';
import { mapShopSettings } from './mappers';
import { shopSettingsInputSchema } from '@/lib/validation/schemas';
import { toDbNumeric } from '@/lib/pricing/money';
import type { ShopSettings } from '@/types/domain';
import type { Json } from '@/types/supabase';
import type { z } from 'zod';

export type ShopSettingsInput = z.infer<typeof shopSettingsInputSchema>;

export async function getShopSettings(): Promise<ShopSettings> {
  const { data, error } = await supabaseAdmin
    .from('shop_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Shop settings not found.');
  return mapShopSettings(data);
}

export async function updateShopSettings(
  id: string,
  input: Partial<ShopSettingsInput>,
): Promise<ShopSettings> {
  const { data, error } = await supabaseAdmin
    .from('shop_settings')
    .update({
      ...(input.brand !== undefined ? { brand: input.brand } : {}),
      ...(input.logo !== undefined ? { logo: input.logo } : {}),
      ...(input.theme !== undefined ? { theme: input.theme as unknown as Json } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.whatsapp_number !== undefined ? { whatsapp_number: input.whatsapp_number } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.timings !== undefined
        ? { timings: input.timings === null ? null : (input.timings as unknown as Json) }
        : {}),
      ...(input.delivery_fee !== undefined ? { delivery_fee: toDbNumeric(input.delivery_fee) } : {}),
      ...(input.free_delivery_threshold !== undefined
        ? { free_delivery_threshold: input.free_delivery_threshold === null ? null : toDbNumeric(input.free_delivery_threshold) }
        : {}),
      ...(input.delivery_enabled !== undefined ? { delivery_enabled: input.delivery_enabled } : {}),
      ...(input.pickup_enabled !== undefined ? { pickup_enabled: input.pickup_enabled } : {}),
      ...(input.is_open !== undefined ? { is_open: input.is_open } : {}),
      ...(input.ordering_enabled !== undefined ? { ordering_enabled: input.ordering_enabled } : {}),
      ...(input.whatsapp_ordering_enabled !== undefined
        ? { whatsapp_ordering_enabled: input.whatsapp_ordering_enabled }
        : {}),
      ...(input.announcement !== undefined ? { announcement: input.announcement } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  revalidateCatalog();
  return mapShopSettings(data);
}
