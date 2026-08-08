// Password sign-in — the primary admin login method (replaces magic link).
// Uses the same session client + hardened cookie path as sign-out/callback:
// signInWithPassword() sets the session server-side and applyCookies persists
// it with the standard attributes. The ADMIN_EMAIL allowlist is enforced here
// (single admin identity) and again by requireAdmin() after the redirect.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { isSameOrigin } from '@/lib/auth/csrf';
import { ADMIN_EMAIL } from '@/lib/auth/constants';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Cross-site request blocked.' } },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  if (ADMIN_EMAIL && email !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } },
      { status: 401 },
    );
  }

  const { supabase, applyCookies } = await createSessionServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ data: { signedIn: true } });
  applyCookies(response);
  return response;
}
