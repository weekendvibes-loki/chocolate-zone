// Envelope helpers — locked contract from docs/BACKEND.md §1.1.

import { NextResponse, type NextRequest } from 'next/server';
import type { ZodError } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { ApiEnvelope, ApiError, ErrorCode } from '@/types/domain';

/** Typed error thrown by services for domain failures; mapDbError converts it to a response. */
export class ApiErrorException extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly field?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    status = 400,
    field?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiErrorException';
    this.code = code;
    this.status = status;
    this.field = field;
    this.details = details;
  }
}

export function ok<T>(data: T): ApiEnvelope<T> {
  return { data };
}

export function fail(
  code: ErrorCode,
  message: string,
  field?: string,
  details?: Record<string, unknown>,
): ApiEnvelope<never> {
  return {
    error: {
      code,
      message,
      ...(field ? { field } : {}),
      ...(details ? { details } : {}),
    } satisfies ApiError,
  };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(ok(data) as ApiEnvelope<T>, init);
}

export function jsonFail(
  code: ErrorCode,
  status: number,
  message: string,
  field?: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(fail(code, message, field, details), { status });
}

export const STATUS_FOR: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400, INVALID_PHONE: 400, EMPTY_CART: 400, INVALID_FILE: 400,
  UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  CONFLICT: 409, SLUG_TAKEN: 409, CATEGORY_IN_USE: 409, PRODUCT_IN_USE: 409,
  STORE_CLOSED: 409, ORDERING_DISABLED: 409, DELIVERY_UNAVAILABLE: 409, PICKUP_UNAVAILABLE: 409,
  PRODUCT_UNAVAILABLE: 409, VARIANT_UNAVAILABLE: 409, INSUFFICIENT_STOCK: 409,
  LIMIT_EXCEEDED: 429, INTERNAL_ERROR: 500,
};

/** 400 with the flattened Zod issues under `details.fields` (BACKEND.md §12.2). */
export function validationFail(errors: ZodError) {
  return jsonFail(
    'VALIDATION_ERROR',
    400,
    'Check the highlighted fields and try again.',
    undefined,
    { fields: errors.flatten() },
  );
}

/** 500 with server-side logging. Never leaks internals to the client. */
export function handleInternal(e: unknown) {
  console.error('[api]', e);
  return jsonFail('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
}

/**
 * Session guard for admin routes — docs/BACKEND.md §7, §11.
 * Returns null when authorized, else the UNAUTHORIZED/FORBIDDEN response.
 */
export async function adminGuard(request: NextRequest) {
  const session = await requireAdmin(request);
  if (session.ok) return null;
  const forbidden = session.reason === 'forbidden';
  return jsonFail(
    forbidden ? 'FORBIDDEN' : 'UNAUTHORIZED',
    forbidden ? 403 : 401,
    forbidden ? "You don't have permission to do that." : 'Please sign in to continue.',
  );
}

/**
 * Maps service/DB failures to envelope responses (BACKEND.md §7).
 * Domain failures thrown as ApiErrorException pass through verbatim; Supabase
 * PostgREST errors are mapped by their code (23505 unique, 23503 FK, PGRST116 no row).
 */
export function mapDbError(e: unknown) {
  if (e instanceof ApiErrorException) {
    return jsonFail(e.code, e.status, e.message, e.field, e.details);
  }
  const err = (e ?? {}) as { code?: string; message?: string };
  if (err.code === '23505') {
    return jsonFail('CONFLICT', 409, 'A record with that value already exists.');
  }
  if (err.code === '23503') {
    return jsonFail('CATEGORY_IN_USE', 409, 'This category still has products. Deactivate it instead.');
  }
  if (err.code === 'PGRST116') {
    return jsonFail('NOT_FOUND', 404, 'Not found.');
  }
  return handleInternal(e);
}
