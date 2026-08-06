// PUT|DELETE /api/admin/offers/[id] — docs/BACKEND.md §7.3.
// PUT replaces offer_products (delete-then-insert scoped to the offer).

import { NextRequest } from 'next/server';
import { offerInputSchema, parseWithSchema } from '@/lib/validation/schemas';
import { updateOffer, deleteOffer } from '@/lib/services/offers';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonFail('NOT_FOUND', 404, 'Offer not found.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail('VALIDATION_ERROR', 400, 'Request body must be valid JSON.');
  }

  const parsed = parseWithSchema(offerInputSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  try {
    const offer = await updateOffer(id, parsed.data);
    return jsonOk({ offer });
  } catch (e) {
    return mapDbError(e);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  const { id } = await params;
  if (!UUID_RE.test(id)) return jsonFail('NOT_FOUND', 404, 'Offer not found.');

  try {
    await deleteOffer(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return mapDbError(e);
  }
}
