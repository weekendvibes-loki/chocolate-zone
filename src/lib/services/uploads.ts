// Admin image upload — docs/BACKEND.md §7.5, SUPABASE.md §5.3.
// Service role signs a short-lived upload URL; the browser PUTs bytes directly to
// storage, so the server never receives the binary. Paths are UUID-prefixed and
// unpredictable; the bucket is allowlisted by the handler before calling in.

import { supabaseAdmin } from '@/lib/supabase/admin';

export type AllowedBucket = 'product-images' | 'offer-images';

export interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  bucket: AllowedBucket;
}

export async function createSignedUpload(bucket: AllowedBucket, ext: string): Promise<SignedUpload> {
  const path = `${bucket}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error) throw error;

  const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { uploadUrl: data.signedUrl, publicUrl, path, bucket };
}
