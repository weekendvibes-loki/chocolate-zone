// Same-origin verification for the two public POST auth endpoints — docs/AUTH.md §2.10, §3.1.

import type { NextRequest } from 'next/server';

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') {
      return false;
    }
    const candidates = [
      request.headers.get('x-forwarded-host'),
      request.headers.get('host'),
      new URL(request.url).host,
    ].filter((host): host is string => Boolean(host));
    return candidates.includes(originUrl.host);
  } catch {
    return false;
  }
}
