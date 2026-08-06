// POST /api/admin/upload — signed upload URL — docs/BACKEND.md §7.5, SUPABASE.md §5.3.
// Returns a short-lived PUT URL plus the predictable public URL; the browser
// uploads the (client-side WebP-re-encoded) file directly to storage.

import { NextRequest } from 'next/server';
import { uploadRequestSchema, parseWithSchema } from '@/lib/validation/schemas';
import { createSignedUpload, type AllowedBucket } from '@/lib/services/uploads';
import { adminGuard, jsonOk, jsonFail, validationFail, mapDbError } from '@/lib/http';

const MAX_BYTES = 2 * 1024 * 1024;
const BUCKET_EXT: Record<AllowedBucket, readonly string[]> = {
  'product-images': ['webp', 'jpeg', 'jpg', 'png'],
  'offer-images': ['webp', 'jpeg', 'jpg', 'png'],
};

export async function POST(request: NextRequest) {
  const denied = await adminGuard(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail('VALIDATION_ERROR', 400, 'Request body must be valid JSON.');
  }

  const parsed = parseWithSchema(uploadRequestSchema, body);
  if (!parsed.ok) return validationFail(parsed.errors);

  const { bucket, fileName, sizeBytes } = parsed.data;
  if (sizeBytes > MAX_BYTES) return jsonFail('INVALID_FILE', 400, 'Image must be under 2 MB.');

  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!BUCKET_EXT[bucket].includes(ext)) return jsonFail('INVALID_FILE', 400, 'Unsupported file type.');

  try {
    const signed = await createSignedUpload(bucket, ext);
    return jsonOk(signed);
  } catch (e) {
    return mapDbError(e);
  }
}
