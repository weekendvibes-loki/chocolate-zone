// Admin categories service — docs/BACKEND.md §7.1, §8.
// All writes go through the service role; every mutation revalidates the catalog tag.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidateCatalog } from '@/lib/revalidate';
import { ApiErrorException } from '@/lib/http';
import { categoryInputSchema } from '@/lib/validation/schemas';
import { mapCategory } from './mappers';
import type { Category } from '@/types/domain';
import type { z } from 'zod';

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'category';
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const slug = input.slug ?? slugify(input.name);
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({
      name: input.name,
      slug,
      ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
      ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
      ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    })
    .select('*')
    .single();
  if (error) {
    // Unique slug violation → SLUG_TAKEN (field-level, not generic CONFLICT).
    if (error.code === '23505') {
      throw new ApiErrorException('SLUG_TAKEN', 'That slug is already in use. Choose another one.', 409, 'slug');
    }
    throw error;
  }
  revalidateCatalog();
  return mapCategory(data);
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
      ...(input.image_url !== undefined ? { image_url: input.image_url } : {}),
      ...(input.sort_order !== undefined ? { sort_order: input.sort_order } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    // Unique slug violation on update → SLUG_TAKEN (field-level, not generic CONFLICT).
    if (error.code === '23505') {
      throw new ApiErrorException('SLUG_TAKEN', 'That slug is already in use. Choose another one.', 409, 'slug');
    }
    throw error;
  }
  revalidateCatalog();
  return mapCategory(data);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
  if (error) throw error; // FK violation → 23503 → CATEGORY_IN_USE via mapDbError
  revalidateCatalog();
}
