// RSC / Route Handler client (anon + session cookie read) — docs/SUPABASE.md §3.2.
// Public reads and session verification. Read-only in effect because RLS grants
// anon SELECT only. Never writes.
//
// NOTE: the cookie-MUTATING variant (middleware/proxy + login handlers) is owned
// by the Authentication Specialist; this file stays the read-side canonical import.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // Read-only in this file: RSC cannot set cookies and public reads never need to.
      setAll: () => {},
    },
  });
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
