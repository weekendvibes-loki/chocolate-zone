// Auth guard for admin routes — docs/BACKEND.md §11, docs/AUTH.md §2.4.
// The handler (not middleware/proxy) is the security boundary. Finalized by the
// Authentication Specialist: uses the cookie-mutating session client so refresh
// writes are captured (middleware persists them on the next pass), and enforces
// the ADMIN_EMAIL allowlist with `user_metadata.is_admin` as the fallback model.

import 'server-only';

import type { NextRequest } from 'next/server';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { ADMIN_EMAIL } from './constants';

export type RequireAdminResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: 'no_session' | 'invalid_session' | 'forbidden' };

export async function requireAdmin(_request: NextRequest): Promise<RequireAdminResult> {
  void _request;
  try {
    const { supabase } = await createSessionServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      const missingSession = !error || error.message?.toLowerCase().includes('session');
      return { ok: false, reason: missingSession ? 'no_session' : 'invalid_session' };
    }

    const email = user.email?.toLowerCase() ?? '';
    const isMetadataAdmin = user.user_metadata?.is_admin === true;
    const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL.toLowerCase() : isMetadataAdmin;

    if (!isAdmin) return { ok: false, reason: 'forbidden' };

    return { ok: true, user: { id: user.id, email } };
  } catch {
    return { ok: false, reason: 'invalid_session' };
  }
}
