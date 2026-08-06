// GET|POST /api/admin/categories — docs/BACKEND.md §7.1.

import { NextRequest } from 'next/server';
import { categoryInputSchema, parseWithSchema } from '@/lib/validation/schemas';
import { listCategories, createCategory } from '@/lib/services/categories';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

export async function GET(request: NextRequest) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    return jsonOk({ categories: await listCategories() });
  } catch (e) {
    return mapDbError(e);
  }
}

export async function POST(request: NextRequest) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail('VALIDATION_ERROR', 400, 'Request body must be valid JSON.');
  }

  const parsed = parseWithSchema(categoryInputSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  try {
    const category = await createCategory(parsed.data);
    return jsonOk({ category }, { status: 201 });
  } catch (e) {
    return mapDbError(e);
  }
}
