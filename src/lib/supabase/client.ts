'use client';

// Browser client (anon key, RLS reads) — docs/SUPABASE.md §3.1.
// Used by client components only. Reads only; never used for writes.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient<Database>(url, anonKey);
}

export type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
