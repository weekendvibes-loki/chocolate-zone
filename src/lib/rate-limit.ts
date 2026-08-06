// Rate limiting & abuse protection — docs/BACKEND.md §10.
// MVP backing store: in-memory Map in the same serverless instance (best-effort,
// per warm instance). Backend §10.1 documents this limitation and the Upstash
// Redis upgrade path, which would swap the `take()` implementation only.

import type { NextRequest } from 'next/server';
import { normalizePhone } from '@/lib/validation/phone';

const WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 15; // per IP per minute
const PHONE_MAX_PER_WINDOW = 3; // per normalized phone + IP per minute

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Stable non-crypto hash so we never keep a raw phone number in memory keys.
function hashPhone(phone: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < phone.length; i += 1) {
    h ^= phone.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function key(k: string): string {
  return `checkout:${k}`;
}

/** Increment-or-reject for a sliding window bucket. */
function take(bucketKey: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(bucketKey);
  if (!b || now >= b.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export async function checkCheckoutRateLimit(request: NextRequest): Promise<boolean> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ok = take(key(`ip:${ip}`), IP_MAX_PER_WINDOW, WINDOW_MS);
  if (!ok) return false;

  const body = await request.clone().json().catch(() => null);
  const phone = body?.phone ? normalizePhone(String(body.phone)) : null;
  if (phone) {
    const okPhone = take(key(`phone:${hashPhone(phone)}:${ip}`), PHONE_MAX_PER_WINDOW, WINDOW_MS);
    if (!okPhone) return false;
  }
  return true;
}
