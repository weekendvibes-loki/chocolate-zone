// Proxy (formerly middleware) — docs/AUTH.md §2.2, §3.5. Next 16 renamed the
// file convention to `proxy.ts` (Node runtime by default).
//
// Convenience + session refresh, NEVER the security boundary (BACKEND §7: the
// handler is the guard). Refreshes an expiring session via getUser() →
// @supabase/ssr transparently rotates the refresh token and rewrites cookies
// through setAll; blocks unauthenticated admin page/API access before any page
// code renders; redirects signed-in users away from the login page. Also stamps
// `x-cz-pathname` so the admin layout can exempt `/admin/login` (§2.6).

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hardenCookieOptions } from '@/lib/auth/cookie-options';
import { DASHBOARD_PATH, LOGIN_PATH } from '@/lib/auth/constants';

const ADMIN_PAGES = '/admin';
const ADMIN_API = '/api/admin';
const PUBLIC_AUTH_PATHS = ['/admin/forgot-password', '/admin/reset-password'];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-cz-pathname', pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, hardenCookieOptions(options)),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLoginPage = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
    const isPublicAdminPath = isLoginPage || PUBLIC_AUTH_PATHS.includes(pathname);

    if (pathname.startsWith(ADMIN_API) && !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please sign in to continue.' } },
        { status: 401 },
      );
    }

    if (pathname.startsWith(ADMIN_PAGES) && !isPublicAdminPath && !user) {
      const login = new URL(LOGIN_PATH, request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }

    if (isLoginPage && user) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
