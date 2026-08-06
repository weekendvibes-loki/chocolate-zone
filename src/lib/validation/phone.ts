// Phone normalization — docs/BACKEND.md §3.2.

/** Deterministic, separators-agnostic normalization to a canonical E.164-ish form.
 *  Returns null when the result is not 7-15 digits. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s().\-]/g, ''); // strip spaces, dots, parens, dashes
  let digits = s;
  if (s.startsWith('+')) {
    digits = s.slice(1);
  } else if (s.startsWith('00')) {
    // international dialing prefix
    digits = s.slice(2);
  } else if (s.startsWith('0')) {
    // leading trunk zero for local numbers
    digits = s.slice(1);
  }
  if (!/^\d{7,15}$/.test(digits)) return null;
  return `+${digits}`;
}
