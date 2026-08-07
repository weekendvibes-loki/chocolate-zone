// Open-redirect guard — docs/AUTH.md §2.10, §3.4.
// Accepts only a same-origin `/admin/<section>` path; anything else (absolute
// URLs, scheme URLs, `//host`, the login/callback pages) falls back to the
// post-login dashboard path.

import { APP_ORIGIN, LOGIN_PATH, AUTH_CALLBACK_PATH, POST_LOGIN_PATH } from './constants';

const ADMIN_PATH = /^\/admin\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export function safeRedirectPath(
  raw: string | null | undefined,
  fallback = POST_LOGIN_PATH,
): string {
  if (!raw) return fallback;
  let pathname: string;
  try {
    pathname = new URL(raw, APP_ORIGIN).pathname;
  } catch {
    return fallback;
  }
  const candidate = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (
    candidate === LOGIN_PATH ||
    candidate.startsWith(`${LOGIN_PATH}/`) ||
    candidate === AUTH_CALLBACK_PATH ||
    candidate.startsWith(`${AUTH_CALLBACK_PATH}/`)
  ) {
    return fallback;
  }
  if (candidate === POST_LOGIN_PATH || ADMIN_PATH.test(candidate)) return candidate;
  return fallback;
}
