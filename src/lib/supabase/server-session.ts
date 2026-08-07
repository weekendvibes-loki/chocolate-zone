// Cookie-mutating server session client — docs/AUTH.md §2.3, §3.5.
// `lib/supabase/server.ts` is the locked READ-side client (setAll no-op); Route
// Handlers that must SET/CLEAR session cookies (send-magic-link, callback,
// sign-out) and `requireAdmin` use this variant. It captures every cookie write
// through `setAll` and replays it onto the outgoing NextResponse with hardened
// attributes — the reliable pattern in Next.js Route Handlers, including when
// returning a redirect.

import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { hardenCookieOptions, type CookieOptions } from '@/lib/auth/cookie-options';

type CapturedCookie = { name: string; value: string; options?: CookieOptions };

export async function createSessionServerClient() {
  const cookieStore = await cookies();
  const captured: CapturedCookie[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const c of cookiesToSet) {
          captured.push({ name: c.name, value: c.value, options: c.options });
        }
      },
    },
  });

  return {
    supabase,
    applyCookies(response: NextResponse) {
      for (const { name, value, options } of captured) {
        response.cookies.set(name, value, hardenCookieOptions(options));
      }
    },
  };
}
