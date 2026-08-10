// Open-redirect guard — docs/AUTH.md §2.10, §3.4.
// Accepts only a same-origin `/admin/<section>` path; anything else (absolute
// URLs, scheme URLs, `//host`, the login/callback pages) falls back to the
// post-login dashboard path.
//
// The raw string is allow-listed BEFORE any URL parsing. `new URL()` would
// normalize protocol-relative/scheme strings (e.g. `//evil.com/admin/products`)
// into a pathname that passes a path-only allowlist, so parsing is never used
// on untrusted input.

import { LOGIN_PATH, AUTH_CALLBACK_PATH, POST_LOGIN_PATH } from './constants';

const ADMIN_PATH = /^\/admin(?:\/[a-z0-9-]+)*\/?$/;

export function safeRedirectPath(
  raw: string | null | undefined,
  fallback = POST_LOGIN_PATH,
): string {
  if (!raw) return fallback;
  if (!ADMIN_PATH.test(raw)) return fallback;
  if (
    raw === LOGIN_PATH ||
    raw.startsWith(`${LOGIN_PATH}/`) ||
    raw === AUTH_CALLBACK_PATH ||
    raw.startsWith(`${AUTH_CALLBACK_PATH}/`)
  ) {
    return fallback;
  }
  return raw;
}
