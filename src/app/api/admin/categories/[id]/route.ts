// PUT|DELETE /api/admin/categories/[id] — docs/BACKEND.md §7.1.

import { NextRequest } from 'next/server';
import { categoryInputSchema, parseWithSchema } from '@/lib/validation/schemas';
import { updateCategory, deleteCategory } from '@/lib/services/categories';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonFail('NOT_FOUND', 404, 'Category not found.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail('VALIDATION_ERROR', 400, 'Request body must be valid JSON.');
  }

  const parsed = parseWithSchema(categoryInputSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  try {
    const category = await updateCategory(id, parsed.data);
    return jsonOk({ category });
  } catch (e) {
    return mapDbError(e);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonFail('NOT_FOUND', 404, 'Category not found.');

  try {
    await deleteCategory(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return mapDbError(e);
  }
}
