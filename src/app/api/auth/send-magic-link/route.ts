// Magic-link send — docs/AUTH.md §2.7.3, §3.1, §3.2.
// Public POST, rate-limited per IP + per email, no account enumeration: returns
// `{ data: { sent: true } }` whether or not the email exists. PKCE code-verifier
// cookie is set by @supabase/ssr and persisted via applyCookies.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { isSameOrigin } from '@/lib/auth/csrf';
import { take } from '@/lib/rate-limit';
import { APP_ORIGIN, AUTH_CALLBACK_PATH } from '@/lib/auth/constants';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  next: z.string().optional(),
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
  const email = parsed.data.email;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipOk = take(`auth:otp:ip:${ip}`, 5, 60 * 60 * 1000);
  const emailOk = take(`auth:otp:email:${email}`, 3, 60 * 60 * 1000);
  if (!ipOk || !emailOk) {
    return NextResponse.json(
      { error: { code: 'LIMIT_EXCEEDED', message: 'Too many requests. Try again later.' } },
      { status: 429 },
    );
  }

  const { supabase, applyCookies } = await createSessionServerClient();

  await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${APP_ORIGIN}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(safeRedirectPath(parsed.data.next))}`,
    },
  });

  const response = NextResponse.json({ data: { sent: true } });
  applyCookies(response);
  return response;
}
