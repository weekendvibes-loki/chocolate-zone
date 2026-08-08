// Password reset request — sends a Supabase recovery email whose link resolves
// to the admin reset route. Anti-enumeration: always returns 200 when the
// request is valid; the reset page reports whether the link was usable.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { isSameOrigin } from '@/lib/auth/csrf';
import { APP_ORIGIN } from '@/lib/auth/constants';

const RESET_PASSWORD_PATH = '/admin/reset-password';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
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

  const { supabase, applyCookies } = await createSessionServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_ORIGIN}${RESET_PASSWORD_PATH}`,
  });

  if (error) {
    console.error('forgot-password: resetPasswordForEmail failed', error.message);
  }

  const response = NextResponse.json({ data: { sent: true } });
  applyCookies(response);
  return response;
}
