// Sanitization — docs/BACKEND.md §3.3.
// Goal: prevent WhatsApp message injection — a newline or control character in
// name/note could inject fake line items, fake totals, or change meaning.

const CONTROL_RE = /[\u0000-\u001F\u007F\u0080-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g; // C0/C1 + bidi controls

export function stripControlChars(s: string): string {
  return s.replace(CONTROL_RE, ''); // removes CR, LF, TAB, NUL, bidi marks, etc.
}

export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Order matters: normalize → strip control chars → collapse whitespace → trim → escape. */
export function sanitizeText(raw: string): string {
  const noCtl = stripControlChars(raw)
    .replace(/\s+/g, ' ') // collapse internal runs (incl. any stray whitespace)
    .trim();
  return htmlEscape(noCtl);
}
