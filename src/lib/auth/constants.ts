// Auth route/identity constants — docs/AUTH.md §2 (locked by the Authentication Specialist).
// APP_ORIGIN is the canonical origin used to build the magic-link callback URL.
// ADMIN_EMAIL is the single allowed admin identity; when unset the guard falls
// back to `user_metadata.is_admin === true` (docs/AUTH.md §1.2, §2.4).

export const LOGIN_PATH = '/admin/login';
export const DASHBOARD_PATH = '/admin';
export const POST_LOGIN_PATH = '/admin';
export const AUTH_CALLBACK_PATH = '/auth/callback';

export const APP_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
