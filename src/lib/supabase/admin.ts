// Service-role client (all writes, upload signing) — docs/SUPABASE.md §3.3.
// Used exclusively inside Route Handlers (via lib/services/*) and server-only
// helper code. Every mutation in the app goes through this client.

import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Belt-and-suspenders guard on top of 'server-only': 'server-only' breaks the
// build if this module is imported client-side, and this runtime check catches
// accidental import into a client boundary even when bundler analysis misses it.
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/admin.ts is server-only. Never import it from a client component.');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server only).');
}

export const supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
