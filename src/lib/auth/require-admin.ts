// Auth guard for admin routes — docs/BACKEND.md §11.
// The handler (not middleware/proxy) is the security boundary. Implementation is
// finalized by the Authentication Specialist (docs/AUTH.md); this is the
// foundation wired on the read-side server client (docs/SUPABASE.md §3.2).

import 'server-only';

import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type RequireAdminResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: 'no_session' | 'invalid_session' | 'forbidden' };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- param kept for the locked BACKEND §11 contract signature
export async function requireAdmin(_request: NextRequest): Promise<RequireAdminResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) return { ok: false, reason: 'invalid_session' };
    if (!user) return { ok: false, reason: 'no_session' };

    // Admin flag model per BACKEND §11: `user_metadata.is_admin === true`.
    // The Authentication Specialist owns the final model (docs/BACKEND.md §13).
    if (user.user_metadata?.is_admin !== true) return { ok: false, reason: 'forbidden' };

    return { ok: true, user: { id: user.id, email: user.email ?? '' } };
  } catch {
    return { ok: false, reason: 'invalid_session' };
  }
}
