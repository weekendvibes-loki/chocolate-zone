// Envelope helpers — locked contract from docs/BACKEND.md §1.1.

import { NextResponse } from 'next/server';
import type { ApiEnvelope, ApiError, ErrorCode } from '@/types/domain';

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
