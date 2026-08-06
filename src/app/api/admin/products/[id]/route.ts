// PUT|DELETE /api/admin/products/[id] — docs/BACKEND.md §7.2.
// PUT: full-body update incl. nested variant upsert (id → update, no id → insert,
// DB variants not in payload → is_active=false). DELETE: soft delete.

import { NextRequest } from 'next/server';
import { productInputSchema, parseWithSchema } from '@/lib/validation/schemas';
import { updateProduct, deleteProduct } from '@/lib/services/adminProducts';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonFail('NOT_FOUND', 404, 'Product not found.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail('VALIDATION_ERROR', 400, 'Request body must be valid JSON.');
  }

  const parsed = parseWithSchema(productInputSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  try {
    const product = await updateProduct(id, parsed.data);
    return jsonOk({ product });
  } catch (e) {
    return mapDbError(e);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonFail('NOT_FOUND', 404, 'Product not found.');

  try {
    const product = await deleteProduct(id);
    return jsonOk({ product });
  } catch (e) {
    return mapDbError(e);
  }
}
