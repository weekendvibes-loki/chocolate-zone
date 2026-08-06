// GET|POST /api/admin/products — docs/BACKEND.md §7.2.
// GET supports filtering: ?category_id=<uuid>&is_active=true|false&q=<name substring>.

import { NextRequest } from 'next/server';
import { productInputSchema, parseWithSchema } from '@/lib/validation/schemas';
import { listProducts, createProduct, type ProductFilters } from '@/lib/services/adminProducts';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

function parseFilters(url: URL): ProductFilters {
  const filters: ProductFilters = {};
  const categoryId = url.searchParams.get('category_id');
  if (categoryId) filters.category_id = categoryId;
  const isActive = url.searchParams.get('is_active');
  if (isActive === 'true') filters.is_active = true;
  else if (isActive === 'false') filters.is_active = false;
  const q = url.searchParams.get('q');
  if (q) filters.q = q.trim();
  return filters;
}

export async function GET(request: NextRequest) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    const products = await listProducts(parseFilters(request.nextUrl));
    return jsonOk({ products });
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

  const parsed = parseWithSchema(productInputSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  try {
    const product = await createProduct(parsed.data);
    return jsonOk({ product }, { status: 201 });
  } catch (e) {
    return mapDbError(e);
  }
}
