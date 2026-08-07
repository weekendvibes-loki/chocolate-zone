// Sign-out — docs/AUTH.md §2.9, §3.1.
// Revokes the session at Supabase, clears the session cookies server-side
// (captured via setAll → applyCookies), and confirms to the browser.

import { NextRequest, NextResponse } from 'next/server';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { isSameOrigin } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Cross-site request blocked.' } },
      { status: 403 },
    );
  }

  const { supabase, applyCookies } = await createSessionServerClient();
  await supabase.auth.signOut().catch(() => {});

  const response = NextResponse.json({ data: { signedOut: true } });
  applyCookies(response);
  return response;
}
