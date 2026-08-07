// Auth callback — docs/AUTH.md §2.8, §3.3, §3.4.
// Public (never in the proxy matcher). Exchanges the one-time PKCE `code` for a
// session, sets the session cookies via applyCookies, then redirects to the
// safe next path (open-redirect guarded).

import { NextRequest, NextResponse } from 'next/server';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid_link', request.url));
  }

  const { supabase, applyCookies } = await createSessionServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid_link', request.url));
  }

  const response = NextResponse.redirect(new URL(safeRedirectPath(next), request.url));
  applyCookies(response);
  return response;
}
