// Caching & revalidation — docs/BACKEND.md §9.

import { revalidateTag } from 'next/cache';

export const CATALOG_TAG = 'catalog' as const;

// Next.js 16 requires a cacheLife profile as the second argument
// (see node_modules/next/dist/docs revalidateTag). `max` gives the
// stale-while-revalidate semantics docs/BACKEND.md §9 describes.
export function revalidateCatalog(): void {
  revalidateTag(CATALOG_TAG, 'max');
}
