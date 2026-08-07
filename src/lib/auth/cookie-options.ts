// Cookie hardening shared helper — docs/AUTH.md §2.1, §3.5.
// CookieOptions is defined locally: it is the plain-object shape Next.js
// response.cookies.set() accepts, avoiding an import coupling in edge middleware.

export type CookieOptions = {
  path?: string;
  maxAge?: number;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  expires?: Date;
};

export function hardenCookieOptions(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
