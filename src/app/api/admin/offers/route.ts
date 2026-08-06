// GET|POST /api/admin/offers — docs/BACKEND.md §7.3.

import { NextRequest } from 'next/server';
import { offerInputSchema, parseWithSchema } from '@/lib/validation/schemas';
import { listOffers, createOffer } from '@/lib/services/offers';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

export async function GET(request: NextRequest) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    return jsonOk({ offers: await listOffers() });
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

  const parsed = parseWithSchema(offerInputSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  try {
    const offer = await createOffer(parsed.data);
    return jsonOk({ offer }, { status: 201 });
  } catch (e) {
    return mapDbError(e);
  }
}
