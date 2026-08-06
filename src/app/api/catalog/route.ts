// GET /api/catalog — one-shot storefront aggregate — docs/BACKEND.md §6.1.

import { getCatalog } from '@/lib/services/catalog';
import { jsonOk, jsonFail } from '@/lib/http';

export async function GET() {
  try {
    const catalog = await getCatalog();
    return jsonOk(catalog);
  } catch (err) {
    console.error('[catalog]', err);
    return jsonFail('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
  }
}
