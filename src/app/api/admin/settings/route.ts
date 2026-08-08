// GET|PUT /api/admin/settings — admin Shop Settings.
// GET returns the single shop_settings row; PUT applies a partial update
// (the admin UI only edits whatsapp_number today).

import { NextRequest } from 'next/server';
import { shopSettingsUpdateSchema, parseWithSchema } from '@/lib/validation/schemas';
import { getShopSettings, updateShopSettings } from '@/lib/services/shopSettings';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

export async function GET(request: NextRequest) {
  const denied = await adminGuard(request);
  if (denied) return denied;
  try {
    return jsonOk({ settings: await getShopSettings() });
  } catch (e) {
    return mapDbError(e);
  }
}

export async function PUT(request: NextRequest) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail('VALIDATION_ERROR', 400, 'Request body must be valid JSON.');
  }

  const parsed = parseWithSchema(shopSettingsUpdateSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  try {
    const current = await getShopSettings();
    const settings = await updateShopSettings(current.id, parsed.data);
    return jsonOk({ settings });
  } catch (e) {
    return mapDbError(e);
  }
}
