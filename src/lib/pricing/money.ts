// Money utilities (pure) — docs/BACKEND.md §5.1.
// All monetary values in API payloads are integer minor units of shop_settings.currency.
// The only place DB numeric strings are converted (toMinor) is the data boundary.

import type { Currency } from '@/types/domain';

export type Minor = number; // integer minor units

/** DB numeric string → minor units. "1299.50" → 129950. Rounds half-up at >2 decimals. */
export function toMinor(value: string | number): Minor {
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid money value: ${String(value)}`);
  return Math.round(n * 100);
}

/** minor units → DB numeric string. 129950 → "1299.50". */
export function fromMinor(minor: Minor): string {
  return (minor / 100).toFixed(2);
}

/** Human display. Uses Intl with the given currency; falls back to "<code> <amount>" if locale data is unavailable. */
export function formatMoney(minor: Minor, currency: Currency): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'symbol' })
      .format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`;
  }
}

export const roundHalfUp = (n: number): Minor => Math.round(n);

/** percentage discount on a line: single rounding at the LINE level to avoid drift. */
export function percentOf(minor: Minor, percent: number): Minor {
  return roundHalfUp((minor * percent) / 100);
}

export const add = (a: Minor, b: Minor): Minor => a + b;
export const subtract = (a: Minor, b: Minor): Minor => a - b;
