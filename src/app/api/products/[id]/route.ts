// GET /api/products/[id] — product detail + variants + best offer — docs/BACKEND.md §6.2.

import { NextRequest } from 'next/server';
import { getProductDetail } from '@/lib/services/products';
import { jsonOk, jsonFail } from '@/lib/http';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonFail('NOT_FOUND', 404, 'Product not found.');
  try {
    const detail = await getProductDetail(id);
    if (!detail) return jsonFail('NOT_FOUND', 404, 'Product not found.');
    return jsonOk(detail);
  } catch (err) {
    console.error('[products/:id]', err);
    return jsonFail('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
  }
}
