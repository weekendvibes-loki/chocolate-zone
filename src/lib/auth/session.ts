// Read-only session helper for Server Components — docs/AUTH.md §2.5.
// Admin pages and the admin layout cannot call requireAdmin (it needs a
// NextRequest). This uses the locked read-side server client. Reading cookies
// makes any page that calls it dynamic — exactly what we want for admin pages.

import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ADMIN_EMAIL } from './constants';

export type AdminUser = { id: string; email: string };

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const email = data.user.email?.toLowerCase() ?? '';
  const isMetadataAdmin = data.user.user_metadata?.is_admin === true;
  const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL.toLowerCase() : isMetadataAdmin;
  if (!isAdmin) return null;

  return { id: data.user.id, email };
}
