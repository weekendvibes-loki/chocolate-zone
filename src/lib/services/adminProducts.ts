// Admin products service — docs/BACKEND.md §7.2, §8.
// MVP does sequential writes with error handling (transaction RPCs deferred, §14).
// Admin API money fields are integer minor units; the DB stores numeric(10,2).

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidateCatalog } from '@/lib/revalidate';
import { ApiErrorException } from '@/lib/http';
import { productInputSchema } from '@/lib/validation/schemas';
import { toDbNumeric, toMinor, type Minor } from '@/lib/pricing/money';
import type { Database } from '@/types/supabase';
import type { z } from 'zod';

export type ProductInput = z.infer<typeof productInputSchema>;
type ProductRow = Database['public']['Tables']['products']['Row'];
type VariantRow = Database['public']['Tables']['product_variants']['Row'];

export interface AdminVariant {
  id: string;
  product_id: string;
  name: string;
  option: string;
  price_delta: Minor; // minor units
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminProduct {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: Minor; // minor units
  image_url: string | null;
  is_featured: boolean;
  is_veg: boolean | null;
  stock_qty: number | null; // null = unlimited
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variants: AdminVariant[];
}

export interface ProductFilters {
  category_id?: string;
  is_active?: boolean;
  q?: string;
}

function mapAdminVariant(row: VariantRow): AdminVariant {
  return {
    id: row.id,
    product_id: row.product_id,
    name: row.name,
    option: row.option,
    price_delta: toMinor(row.price_delta),
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapAdminProduct(row: ProductRow, variants: AdminVariant[]): AdminProduct {
  return {
    id: row.id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    base_price: toMinor(row.base_price),
    image_url: row.image_url,
    is_featured: row.is_featured,
    is_veg: row.is_veg,
    stock_qty: row.stock_qty,
    sort_order: row.sort_order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    variants,
  };
}

async function fetchVariants(productId: string): Promise<AdminVariant[]> {
  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapAdminVariant);
}

export async function listProducts(filters: ProductFilters): Promise<AdminProduct[]> {
  let query = supabaseAdmin.from('products').select('*').order('sort_order', { ascending: true });
  if (filters.category_id) query = query.eq('category_id', filters.category_id);
  if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active);
  if (filters.q) query = query.ilike('name', `%${filters.q}%`);

  const { data, error } = await query;
  if (error) throw error;

  const products = data ?? [];
  if (products.length === 0) return [];

  const ids = products.map((p) => p.id);
  const { data: variantRows, error: variantError } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .in('product_id', ids);
  if (variantError) throw variantError;

  const variantsByProduct = new Map<string, AdminVariant[]>();
  for (const row of variantRows ?? []) {
    const group = variantsByProduct.get(row.product_id);
    if (group) group.push(mapAdminVariant(row));
    else variantsByProduct.set(row.product_id, [mapAdminVariant(row)]);
  }

  return products.map((row) => mapAdminProduct(row, variantsByProduct.get(row.id) ?? []));
}

export async function createProduct(input: ProductInput): Promise<AdminProduct> {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      category_id: input.category_id,
      name: input.name,
      description: input.description ?? null,
      base_price: toDbNumeric(input.base_price),
      image_url: input.image_url ?? null,
      is_featured: input.is_featured ?? false,
      is_veg: input.is_veg ?? null,
      stock_qty: input.stock_qty ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;

  let variants: AdminVariant[] = [];
  if (input.variants && input.variants.length > 0) {
    const rows = input.variants.map((v) => ({
      product_id: product.id,
      name: v.name,
      option: v.option,
      price_delta: toDbNumeric(v.price_delta),
      is_active: v.is_active ?? true,
    }));
    const { data: variantRows, error: variantError } = await supabaseAdmin
      .from('product_variants')
      .insert(rows)
      .select('*');
    if (variantError) {
      // Duplicate (product_id, name, option) group → CONFLICT with the offending group.
      if (variantError.code === '23505') {
        throw new ApiErrorException('CONFLICT', 'A variant with the same name and option already exists.', 409);
      }
      throw variantError;
    }
    variants = (variantRows ?? []).map(mapAdminVariant);
  }

  revalidateCatalog();
  return mapAdminProduct(product, variants);
}

export async function updateProduct(id: string, input: ProductInput): Promise<AdminProduct> {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update({
      ...(input.category_id !== undefined ? { category_id: input.category_id } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.base_price !== undefined ? { base_price: toDbNumeric(input.base_price) } : {}),
      ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
      ...(input.is_featured !== undefined ? { is_featured: input.is_featured } : {}),
      ...(input.is_veg !== undefined ? { is_veg: input.is_veg } : {}),
      ...(input.stock_qty !== undefined ? { stock_qty: input.stock_qty } : {}),
      ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  // Variant sync: inputs with id → update; without id → insert; existing not in
  // payload → is_active=false (soft-deactivate, preserves FKs).
  if (input.variants !== undefined) {
    await syncVariants(id, input.variants);
  }

  revalidateCatalog();
  return mapAdminProduct(product, await fetchVariants(id));
}

async function syncVariants(
  productId: string,
  variants: NonNullable<ProductInput['variants']>,
): Promise<void> {
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', productId);
  if (existingError) throw existingError;

  const keepIds = new Set<string>();
  for (const v of variants) {
    if (v.id) {
      keepIds.add(v.id);
      const { error } = await supabaseAdmin
        .from('product_variants')
        .update({
          name: v.name,
          option: v.option,
          price_delta: toDbNumeric(v.price_delta),
          is_active: v.is_active ?? true,
        })
        .eq('id', v.id)
        .eq('product_id', productId);
      if (error) {
        if (error.code === '23505') {
          throw new ApiErrorException('CONFLICT', 'A variant with the same name and option already exists.', 409);
        }
        throw error;
      }
    } else {
      const { error } = await supabaseAdmin
        .from('product_variants')
        .insert({
          product_id: productId,
          name: v.name,
          option: v.option,
          price_delta: toDbNumeric(v.price_delta),
          is_active: v.is_active ?? true,
        });
      if (error) {
        if (error.code === '23505') {
          throw new ApiErrorException('CONFLICT', 'A variant with the same name and option already exists.', 409);
        }
        throw error;
      }
    }
  }

  for (const existing of existingRows ?? []) {
    if (!keepIds.has(existing.id)) {
      const { error } = await supabaseAdmin
        .from('product_variants')
        .update({ is_active: false })
        .eq('id', existing.id);
      if (error) throw error;
    }
  }
}

/** Soft delete: is_active=false. Hard delete is unsafe while offer_products reference the row. */
export async function deleteProduct(id: string): Promise<AdminProduct> {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .update({ is_active: false })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  revalidateCatalog();
  return mapAdminProduct(product, await fetchVariants(id));
}
