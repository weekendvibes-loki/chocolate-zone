# Chocolate Zone — Authentication Design & Implementation Specification
**Owner:** Authentication Specialist · **Status:** Draft v1 (implementation-ready) · **Audience:** Backend Developer, Frontend Developer, Supabase Expert, QA Engineer, DevOps Engineer
**Locked contract:** `docs/ARCHITECTURE.md` (v1). This document implements §7 (Auth Model) exactly and extends only the underspecified detail (auth routes, middleware, helpers) the locked model requires. It does not contradict the locked stack, folder structure, data model, or security model.
**References:** `docs/deliverables/04-backend-api.md` (§10.2, §11), `docs/deliverables/06-supabase.md` (§1.4, §3.2, §8, §9).

---

## 0. Scope, Lane Boundaries, and Reading Guide
SectionWhat it covers1Auth strategy: why magic link, who signs in, how public signups are disabled2Implementation (exact code): `middleware.ts`, server session client, `requireAdmin`, `getAdminUser`, `(admin)` layout guard, login flow, callback, sign-out, shared helpers3Security hardening: CSRF, rate limiting, session expiry + refresh rotation, open-redirect, cookie attributes4Enforcing "no customer auth": storefront rules, anonymous verification, import-boundary guard5Future-proofing (V2, not implemented): `admin_users` table, role-aware `requireAdmin`, invite flow6Testing the auth surface: unit, e2e scenarios, CI strategy7Supabase provider configuration required from the Supabase Expert8Auth security checklist9Inputs needed (from other agents)10Deferred

**Lane boundaries (what this doc does NOT own):**

- **No business API routes.** All CRUD (`/api/admin/categories|products|offers|shop|upload`) and public routes (`/api/catalog`, `/api/products`, `/api/checkout/whatsapp`) are Backend-owned. This doc provides the **final, implemented** `requireAdmin` contract Backend consumes (Backend §11) plus the auth-only endpoints Backend explicitly delegated (Backend §10.2: "magic-link / auth endpoints … Owned by the Authentication Specialist").
- **No `lib/supabase/server.ts` edits.** That file is locked read-side by the Supabase Expert (§3.2, `setAll` no-op). This doc's auth helpers *consume* it for page reads and add a separate cookie-mutating variant (`server-session.ts`) for handlers — exactly the "fork/extract the mutating cookie logic" the Supabase doc delegates to this lane.
- **No storage design.** Signed uploads, buckets, and WebP re-encode are owned by the Supabase Expert (§8). We only note that `POST /api/admin/upload` is session-guarded (it is, via the shared `requireAdmin`).
- **No pricing, WhatsApp, or database DDL.** Referenced only where auth touches them.

**Key files added by this doc (extensions to the locked folder structure):**

```
src/
├── middleware.ts                                  # NEW — guards /admin/* + /api/admin/*
├── app/
│   ├── (admin)/login/page.tsx                     # existing path (locked) — content specified here
│   ├── (admin)/layout.tsx                         # NEW — defense-in-depth page guard
│   ├── auth/callback/route.ts                     # NEW — magic-link code exchange
│   └── api/auth/
│       ├── send-magic-link/route.ts               # NEW — login form submit endpoint (auth-owned)
│       └── signout/route.ts                       # NEW — sign-out endpoint
├── components/admin/LoginForm.tsx                 # NEW — client login form
├── components/admin/SignOutButton.tsx             # NEW — client sign-out control
└── lib/
    ├── auth/
    │   ├── constants.ts                           # NEW — origins, admin email, paths
    │   ├── cookie-options.ts                      # NEW — HttpOnly/Secure/SameSite hardening
    │   ├── csrf.ts                                # NEW — same-origin verification helper
    │   ├── safe-redirect.ts                       # NEW — open-redirect guard
    │   ├── require-admin.ts                       # NEW — implements Backend §11 contract
    │   └── session.ts                             # NEW — getAdminUser for Server Components
    └── supabase/server-session.ts                 # NEW — cookie-mutating server client (handlers only)
```

---

## 1. Auth Strategy

### 1.1 Why magic link (passwordless)
The locked model is **Supabase Auth email magic link, admin-only** (`ARCHITECTURE.md` §7). This is the correct mechanism for a single-owner admin dashboard:

- **No password storage, ever.** No credential hashes, no password breach surface, nothing to rotate or reset.
- **No password reset flow.** Password resets are a classic attack and UX surface (enumeration, reset-token phishing). Passwordless removes them entirely.
- **The email link IS the credential.** Possession of the admin mailbox proves identity. With a single known admin identity, magic link has no scale downside.
- **No customer accounts.** The storefront is anonymous by design (no login, no order history, `ARCHITECTURE.md` §1). Auth exists only to protect the dashboard; magic link fits a low-frequency, human-operated flow and is deliberately wrong for consumer checkout.
- **Multi-device friendly.** The admin signs in from any browser; the link opens the session where it was clicked. No password to remember.

Flow-shape: **PKCE exchange**, not an implicit token in the URL fragment. supabase-js v2 uses PKCE for email OTP by default: `@supabase/ssr` holds the code verifier in a cookie, and the callback Route Handler exchanges the one-time `code` for a session server-side. No token ever lands in the address bar (nothing leaks via referrer/history), and the code is single-use.

```
sequenceDiagram
    participant U as "Admin"
    participant F as "Login page"
    participant A as "api/auth/send-magic-link"
    participant S as "Supabase Auth"
    participant E as "Email"
    participant C as "auth/callback"
    participant M as "middleware"
    U->>F: "enter email"
    F->>A: "POST email + next"
    A->>A: "rate-limit + origin check"
    A->>S: "signInWithOtp(shouldCreateUser:false)"
    S->>E: "magic link email"
    A-->>F: "200 sent:true"
    U->>E: "open link"
    E->>S: "verify ConfirmationURL"
    S->>C: "redirect code=...&next=..."
    C->>S: "exchangeCodeForSession(code)"
    S-->>C: "session cookies"
    C->>U: "307 to /admin/dashboard"
    U->>M: "GET /admin/dashboard with cookie"
    M->>M: "getUser() refresh if near expiry"
    M->>U: "render dashboard"
```

### 1.2 Who can sign in — single admin identity
Exactly **one email address** may sign in. It is declared in the environment:

```ts
// lib/auth/constants.ts
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
export const APP_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const POST_LOGIN_PATH = '/admin/dashboard';
export const LOGIN_PATH = '/admin/login';
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const DASHBOARD_PATH = '/admin/dashboard';
```

- `ADMIN_EMAIL` (server env var; set in Vercel + local `.env`) is the single source of truth for "who is admin" in the **application** layer.
- The **Supabase layer** additionally marks the user `user_metadata.is_admin = true` when the admin is created. The app gates on *either* (`ADMIN_EMAIL` match **or** `is_admin === true`) so the check never silently fails if one source drifts; when `ADMIN_EMAIL` is set (required for MVP) it is authoritative and the metadata flag is belt-and-suspenders.
- No registration path exists. There is no "sign up" UI, no public invite, and no in-app way to create an account.

### 1.3 Disabling public signups (layered, defense-in-depth)
Four independent gates — any one of them failing blocks a non-admin:

1. **Provider-level:** `enable_signup = false` in `supabase/config.toml` **and** the dashboard toggle "Allow new users to sign up" OFF (Supabase Expert wires it — §7). With this, `signInWithOtp({ options: { shouldCreateUser: true } })` cannot create accounts.
2. **Call-site:** every `signInWithOtp` in this app passes `shouldCreateUser: false` — even if signups were re-enabled by accident, an OTP can only authenticate an **existing** user, never mint a new one.
3. **Allowlist:** `requireAdmin` / `getAdminUser` return `forbidden` for any authenticated user whose email is not the admin identity. A non-admin who somehow obtains a valid Supabase session is still blocked at every admin route.
4. **Creation path:** the single admin user is created once, out-of-band, by the Supabase Expert (dashboard → Authentication → Users → **Add user**, or a one-off service-role `auth.admin.createUser` script). After that, signups are disabled (§7). No in-app code can create users.

---

## 2. Implementation (exact code)

> Version note: all code targets `@supabase/ssr` (v0.6.x) + Next.js 15. `cookies()` is awaited (Next 15 API). Types use the generated `Database` type from `supabase gen types` (Supabase Expert §7).

### 2.1 Cookie hardening shared helper

```ts
// src/lib/auth/cookie-options.ts
// CookieOptions is defined locally: it is the plain-object shape Next.js
// response.cookies.set() accepts, avoiding an import coupling in edge middleware.
export type CookieOptions = {
  path?: string;
  maxAge?: number;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  expires?: Date;
};

export function hardenCookieOptions(options: CookieOptions): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}
```

### 2.2 `middleware.ts` — session refresh + guarding (edge)
`middleware.ts` is **convenience + session refresh**, never the security boundary (`ARCHITECTURE.md` §7: "middleware is convenience; the handler is the guard"). It refreshes an expiring session (`getUser()` → `@supabase/ssr` transparently exchanges a rotated refresh token and rewrites cookies through `setAll`) and blocks unauthenticated access before any page code renders.

```ts
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { hardenCookieOptions } from '@/lib/auth/cookie-options';
import { DASHBOARD_PATH, LOGIN_PATH } from '@/lib/auth/constants';

const ADMIN_PAGES = '/admin';
const ADMIN_API = '/api/admin';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-cz-pathname', pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, hardenCookieOptions(options)),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLoginPage = pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);

    if (pathname.startsWith(ADMIN_API) && !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please sign in to continue.' } },
        { status: 401 },
      );
    }

    if (pathname.startsWith(ADMIN_PAGES) && !isLoginPage && !user) {
      const login = new URL(LOGIN_PATH, request.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }

    if (isLoginPage && user) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
```

Notes:

- **Static assets:** because the matcher is limited to the two admin prefixes, `/_next/*`, `public/*`, and extensioned files are served directly by Next.js with zero middleware cost. If a future matcher broadens, re-add the standard negative lookahead — not needed today.
- `x-cz-pathname`**:** read by the `(admin)` layout (§2.6) to exempt the login page from the page-level guard. Fail-closed: if the header is ever absent, non-login admin pages are guarded anyway. A CI test asserts middleware always sets it (§6.2).
- **401 vs redirect:** `/api/admin/*` gets a JSON 401 (the admin UI redirects on receipt); pages get a 307 to `/admin/login?next=<path>`.
- **No customer surface:** storefront pages never enter middleware, so anonymous visitors are unaffected and storefront pages can be statically rendered / ISR-cached.

### 2.3 Server session client (cookie-mutating) — handlers only
`lib/supabase/server.ts` is the locked **read-side** client (Supabase Expert §3.2, `setAll` no-op). Route Handlers that must *set/clear* session cookies (login send, callback, sign-out) and `requireAdmin` use this mutating variant. It captures cookie writes and applies them to the outgoing `NextResponse` — the reliable pattern in Next 15 Route Handlers, including when returning `NextResponse.redirect`.

```ts
// src/lib/supabase/server-session.ts
import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { hardenCookieOptions, type CookieOptions } from '@/lib/auth/cookie-options';

type CapturedCookie = { name: string; value: string; options: CookieOptions };

export async function createSessionServerClient() {
  const cookieStore = await cookies();
  const captured: CapturedCookie[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const c of cookiesToSet) captured.push(c);
      },
    },
  });

  return {
    supabase,
    applyCookies(response: NextResponse) {
      for (const { name, value, options } of captured) {
        response.cookies.set(name, value, hardenCookieOptions(options));
      }
    },
  };
}
```

> `import 'server-only'` guarantees this module never ships to a client bundle; it is imported by handlers and `requireAdmin` only.

### 2.4 `requireAdmin` — the exact pattern every admin handler calls
This implements Backend §11 verbatim (same type names, same import path). **Backend code does not change** — the `declare` contract becomes a real implementation.

```ts
// src/lib/auth/require-admin.ts
import 'server-only';

import type { NextRequest } from 'next/server';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { ADMIN_EMAIL } from './constants';

export type RequireAdminResult =
  | { ok: true; user: { id: string; email: string } }
  | { ok: false; reason: 'no_session' | 'invalid_session' | 'forbidden' };

export async function requireAdmin(_request: NextRequest): Promise<RequireAdminResult> {
  const { supabase } = await createSessionServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    const missingSession = !error || error.message?.toLowerCase().includes('session');
    return { ok: false, reason: missingSession ? 'no_session' : 'invalid_session' };
  }

  const email = data.user.email?.toLowerCase() ?? '';
  const isMetadataAdmin = data.user.user_metadata?.is_admin === true;
  const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL.toLowerCase() : isMetadataAdmin;

  if (!isAdmin) return { ok: false, reason: 'forbidden' };

  return { ok: true, user: { id: data.user.id, email } };
}
```

Canonical handler usage (Backend-owned code, unchanged from §11 — reproduced so the contract is unambiguous):

```
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session.ok) {
    return jsonFail(
      session.reason === 'forbidden' ? 'FORBIDDEN' : 'UNAUTHORIZED',
      session.reason === 'forbidden' ? 403 : 401,
      session.reason === 'forbidden' ? "You don't have permission to do that." : 'Please sign in to continue.',
    );
  }
  // session.user.id / session.user.email are available for audit logging.
}
```

Behavior contract:

- **401** (`no_session` / `invalid_session`) — no cookie, unparseable cookie, JWT expired beyond refresh, or refresh failed. "Please sign in to continue."
- **403** (`forbidden`) — a *valid* Supabase session whose identity is not the admin. Nearly unreachable (signups disabled) but enforced so a misconfigured provider can never grant dashboard access.
- **Refresh persistence:** middleware already refreshes cookies on every `/api/admin/*` request, so the handler's `getUser()` almost never needs to refresh. If it does, the refreshed user is returned and the *next* middleware pass persists the new cookies.
- **No body read, no side effects** — call it first, before parsing the body or touching the DB (Backend §11).

### 2.5 `getAdminUser` — the helper Server Components use
Server Components (admin pages, the `(admin)` layout) cannot call `requireAdmin` (it needs a `NextRequest`). They use this read-only helper built on the locked read-side `server.ts` client. Reading cookies makes any page that calls it dynamic (never statically cached) — exactly what we want for admin pages.

```ts
// src/lib/auth/session.ts
import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ADMIN_EMAIL } from './constants';

export type AdminUser = { id: string; email: string };

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const email = data.user.email?.toLowerCase() ?? '';
  const isMetadataAdmin = data.user.user_metadata?.is_admin === true;
  const isAdmin = ADMIN_EMAIL ? email === ADMIN_EMAIL.toLowerCase() : isMetadataAdmin;
  if (!isAdmin) return null;

  return { id: data.user.id, email };
}
```

### 2.6 `(admin)` layout — defense-in-depth page guard
The locked structure places the login page *inside* `(admin)` (`src/app/(admin)/login/page.tsx`), so a blanket layout redirect would loop on the login page. The layout reads the `x-cz-pathname` header (set by middleware §2.2) to exempt `/admin/login`.

```tsx
// src/app/(admin)/layout.tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth/session';
import { LOGIN_PATH } from '@/lib/auth/constants';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get('x-cz-pathname') ?? '';
  const isLoginPage = pathname.startsWith(LOGIN_PATH);

  const user = await getAdminUser();

  if (!isLoginPage && !user) {
    redirect(LOGIN_PATH);
  }

  return <>{children}</>;
}
```

- Middleware remains the **primary** page guard (it owns the pathname); the layout is the second layer.
- The layout also renders the admin chrome (sidebar/topbar showing the signed-in email + `SignOutButton`, §2.9).
- Fail-closed default: if `x-cz-pathname` is absent, the page is treated as non-login and guarded.

### 2.7 Login page flow
**2.7.1 Page (RSC wrapper):**

```tsx
// src/app/(admin)/login/page.tsx
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata = { title: 'Admin sign in · Chocolate Zone' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Chocolate Zone</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Sign in to the admin dashboard with your shop email.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
```

**2.7.2 Client form (email input → magic link sent):**

```tsx
// src/components/admin/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const searchParams = useSearchParams();

  const next = searchParams.get('next') ?? '/admin/dashboard';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, next }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="mt-6 rounded-xl border border-neutral-800 p-4 text-sm">
        <p className="font-medium text-emerald-400">Check your inbox.</p>
        <p className="mt-1 text-neutral-400">
          If <span className="font-semibold">{email}</span> is the admin address, a
          magic sign-in link is on its way. It expires in 30 minutes.
        </p>
        <button
          className="mt-3 text-neutral-300 underline"
          onClick={() => setStatus('idle')}
          type="button"
        >
          Send another link
        </button>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={onSubmit}>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@shop.com"
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-red-400">
          Something went wrong. Please try again in a minute.
        </p>
      )}
    </form>
  );
}
```

**2.7.3 Send endpoint (server-side `signInWithOtp`, rate-limited, no account enumeration):**

```ts
// src/app/api/auth/send-magic-link/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { isSameOrigin } from '@/lib/auth/csrf';
import { take } from '@/lib/rate-limit'; // Backend-owned primitive (Backend §10)
import { APP_ORIGIN, AUTH_CALLBACK_PATH } from '@/lib/auth/constants';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  next: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Cross-site request blocked.' } },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }
  const email = parsed.data.email;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipOk = await take(`auth:otp:ip:${ip}`, 5, 60 * 60 * 1000);
  const emailOk = await take(`auth:otp:email:${email}`, 3, 60 * 60 * 1000);
  if (!ipOk || !emailOk) {
    return NextResponse.json(
      { error: { code: 'LIMIT_EXCEEDED', message: 'Too many requests. Try again later.' } },
      { status: 429 },
    );
  }

  const { supabase, applyCookies } = await createSessionServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${APP_ORIGIN}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(safeRedirectPath(parsed.data.next))}`,
    },
  });

  const response = NextResponse.json({ data: { sent: true } });
  applyCookies(response);
  return response;
}
```

### 2.8 Callback route — code exchange → session → redirect
`/auth/callback` is **public** (never in the middleware matcher). It exchanges the one-time PKCE `code` for a session and sets the session cookies via `applyCookies` before the redirect.

```ts
// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { APP_ORIGIN, safeRedirectPath } from '@/lib/auth/safe-redirect';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid_link', request.url));
  }

  const { supabase, applyCookies } = await createSessionServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/admin/login?error=invalid_link', request.url));
  }

  const target = new URL(safeRedirectPath(next), APP_ORIGIN);
  const response = NextResponse.redirect(target);
  applyCookies(response);
  return response;
}
```

### 2.9 Sign-out
Sign-out clears the session cookies server-side (revokes the refresh token at Supabase) and sends the browser to the login page.

```ts
// src/app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSessionServerClient } from '@/lib/supabase/server-session';
import { isSameOrigin } from '@/lib/auth/csrf';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Cross-site request blocked.' } },
      { status: 403 },
    );
  }

  const { supabase, applyCookies } = await createSessionServerClient();
  await supabase.auth.signOut().catch(() => {});

  const response = NextResponse.json({ data: { signedOut: true } });
  applyCookies(response);
  return response;
}
```

```tsx
// src/components/admin/SignOutButton.tsx
'use client';

export function SignOutButton() {
  async function onSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <button type="button" onClick={onSignOut} className="text-sm text-neutral-400 hover:text-white">
      Sign out
    </button>
  );
}
```

### 2.10 Shared helpers
**Open-redirect guard — `lib/auth/safe-redirect.ts`:**

```ts
// src/lib/auth/safe-redirect.ts
import { APP_ORIGIN, POST_LOGIN_PATH } from './constants';

const ADMIN_PATH = /^\/admin\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

export function safeRedirectPath(raw: string | null | undefined, fallback = POST_LOGIN_PATH): string {
  if (!raw) return fallback;
  let pathname: string;
  try {
    pathname = new URL(raw, APP_ORIGIN).pathname;
  } catch {
    return fallback;
  }
  const candidate = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (candidate === POST_LOGIN_PATH || ADMIN_PATH.test(candidate)) return candidate;
  return fallback;
}
```

**Same-origin verification — `lib/auth/csrf.ts`:**

```ts
// src/lib/auth/csrf.ts
import type { NextRequest } from 'next/server';

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
```

---

## 3. Security Hardening

### 3.1 CSRF protection for the session-cookie flow
The session is carried in an **HttpOnly, SameSite=Lax** cookie. That combination is the primary CSRF defense:

- **SameSite=Lax:** browsers attach the cookie to same-site requests and top-level GET navigations only. Cross-site POST/PUT/DELETE (the shape of every admin mutation) arrive **without** the cookie, so a forged cross-site form/fetch cannot authenticate. Admin mutations are all POST/PUT/DELETE on `/api/admin/*` — exactly the requests Lax blocks.
- **HttpOnly:** JavaScript cannot read the cookie, so an XSS can't exfiltrate it to mint requests off-origin.
- **No CORS on the admin API:** the app is same-origin on Vercel; there is no `Access-Control-Allow-Origin` for admin routes, so a foreign origin cannot even read responses. (Backend owns headers; this doc asserts the rule: never set `Access-Control-Allow-Origin: *` on admin routes.)
- **Origin check on the two public POST auth endpoints** (`send-magic-link`, `signout`): `isSameOrigin()` rejects mismatched `Origin` (browsers send it on cross-site POSTs). This is defense-in-depth; `signout` is harmless without a cookie anyway, and a forged magic-link send is limited by rate limiting (§3.2) and reveals nothing (§2.7.3).
- **Optional Backend hardening:** admin Route Handlers may also call `isSameOrigin(request)` first and return 403 on mismatch. Not required for the `requireAdmin` contract (Lax already covers it), but cheap to add. Flagged for Backend, not imposed.
- **Server actions** are avoided for auth precisely because their automatic CSRF handling is framework-specific; the explicit pattern above is uniform with the handler-based BFF.

Do NOT weaken: no `sameSite: 'none'`, no CORS on `/api/admin/*`, no POST-to-GET downgrades. If a future admin SPA needs cross-origin calls, that is a V2 design decision with explicit CORS + Origin verification.

### 3.2 Rate limiting magic-link sends
Two independent layers:

1. **Supabase built-in limits (config only, §7):** GoTrue applies its own rate limits to `/auth/v1/otp` (e.g., per-IP/email OTP throttling, abuse prevention). These are the backstop and cannot be tuned per-app; the Supabase Expert sets conservative values where the dashboard exposes them and leaves abuse protection ON.
2. **App-level guard (owned by this doc):** every `/api/auth/send-magic-link` request consumes the shared `take()` primitive (Backend §10.2, `lib/rate-limit.ts`) with two independent buckets:

- `auth:otp:ip:<ip>` — 5 requests per hour per IP (prevents inbox-bombing via rotation of emails; only one email is valid anyway).
- `auth:otp:email:<email>` — 3 requests per hour per email (prevents hammering the one admin inbox).

On exhaustion, return the typed `429 LIMIT_EXCEEDED` envelope. Because only one identity exists, the email bucket is the true protection; the IP bucket stops trivial rotation and shares the same primitive used by checkout (consistent behavior, one Redis/Upstash store).

### 3.3 Session expiry and refresh-token rotation

- **Access token:** `jwt_expiry = 3600` (1 hour, Supabase Expert §7). Short-lived, verified locally by `getUser()` in middleware and every admin handler.
- **Refresh token:** Supabase enables **refresh-token rotation** by default: every successful refresh mints a new refresh token and invalidates the previous one. A stolen, already-rotated refresh token is dead on the next use. Middleware performs this rotation transparently on admin navigation/API calls (via `getUser()` → `setAll`), so the admin is never logged out mid-session; they are only signed out if idle past the refresh-token expiry.
- **Single-use magic-link code:** the PKCE `code` is redeemed once by `exchangeCodeForSession`; replay fails (§2.8 → `invalid_link`). The code verifier lives in an HttpOnly cookie, so it is not exposed to page scripts.
- **Why the mobile-first storefront has zero session surface:** customers never sign in, so the storefront carries **no** auth cookie, no session state, and no per-request auth read. That means: (a) middleware never runs for storefront routes, (b) storefront pages stay static/ISR: a `getUser()` call would force dynamic rendering, (c) there is nothing on customer devices to steal or replay, and (d) checkout data stays anonymous.

### 3.4 Protecting against open redirect
Every redirect that uses a caller-influenced value goes through `safeRedirectPath()` (§2.10):

- Accepts **only** a same-origin `/admin/<section>` path; anything else falls back to `/admin/dashboard`.
- Absolute URLs (`https://evil.com`, `//evil.com`), scheme URLs (`javascript:`), and the login/callback pages themselves are rejected.
- `emailRedirectTo` is built from `APP_ORIGIN` (a locked env constant) plus `safeRedirectPath`, never from raw input.
- The middleware login redirect (`?next=`) and the callback's `next` param both pass through this guard.

### 3.5 Cookie attributes (final state)

CookieSet byAttributes`sb-<ref>-auth-token` (session: access + refresh)`middleware.ts`, `/auth/callback`, `/api/auth/signout``HttpOnly` · `Secure` (prod) · `SameSite=Lax` · `Path=/` · `Max-Age` from Supabase`sb-<ref>-auth-code-verifier` (PKCE)`/api/auth/send-magic-link`, `/auth/callback``HttpOnly` · `Secure` (prod) · `SameSite=Lax` · `Path=/` · `Max-Age` = OTP window

- Cookie names are managed entirely by `@supabase/ssr`; nothing in the app hardcodes them. We only harden the attributes on write.
- No customer cookie is ever set by this system (the cart lives in `localStorage` — Frontend owns, unrelated to auth).

### 3.6 Account enumeration
The send endpoint returns `200 { data: { sent: true } }` regardless of whether the email exists (§2.7.3). The only distinguishers (HTTP 400 for malformed email, 429 for rate-limit) are non-sensitive. Combined with signups-disabled, there is no public oracle for "is this the admin address."

---

## 4. Enforcing "No Customer Auth"
This is a hard product constraint (`ARCHITECTURE.md` §1: no customer login, no customer accounts). It is enforced structurally, not by discipline.

### 4.1 Rules for the `(storefront)` route group

1. **Never read the session.** No `getAdminUser()`, no `requireAdmin()`, no `supabase.auth.getUser()` anywhere under `src/app/(storefront)/`. This is also a performance rule: a session read would make the whole storefront dynamic and kill ISR.
2. **Never redirect to login.** Storefront routes must not `redirect(LOGIN_PATH)`. Anonymous visitors must always get 200 + content.
3. **Never call admin endpoints.** Storefront code must not fetch `/api/admin/*` (they 401 without a session anyway — this is the Backend's backstop).
4. All storefront data flows through Backend's public service layer (`getCatalog()` etc.) using the anon read client; no auth import is needed.

### 4.2 Verifying public routes work for anonymous users

- The middleware matcher (`/admin/:path*`, `/api/admin/:path*`) means storefront pages, `/api/catalog`, `/api/products`, `/api/checkout/whatsapp`, and `/auth/callback` never touch middleware — anonymous access is guaranteed by construction, not by a check.
- CI/e2e asserts this: §6.2 includes an anonymous-walk test (`/`, `/category/*`, `/product/*`, `/api/catalog`, `/api/checkout/whatsapp`) with **no cookies** expecting 200.
- Storefront RSC pages must stay static/ISR: a review/CI rule (ESLint, below) rejects any auth import that would force dynamism.

### 4.3 Guard the guard — import boundaries

1. `server-only` on every auth module (`server-session.ts`, `require-admin.ts`, `session.ts`) and on `lib/supabase/admin.ts` (Supabase Expert). Any accidental import from a client component or the storefront fails the build.
2. **ESLint boundary rule** — enforce in `eslint.config.mjs` (dev + CI):

```js
// eslint.config.mjs (fragment)
export default [
  {
    files: ['src/app/(storefront)/**/*', 'src/components/storefront/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/auth/require-admin', message: 'Storefront is anonymous — never guard or read sessions here.' },
            { name: '@/lib/auth/session', message: 'Storefront is anonymous — never read sessions here.' },
            { name: '@/lib/supabase/server-session', message: 'Storefront must not touch session cookies.' },
            { name: '@/lib/supabase/admin', message: 'Service-role client is admin-only.' },
          ],
          patterns: [
            { group: ['@/components/admin/*'], message: 'Storefront must not import admin components.' },
          ],
        },
      ],
    },
  },
];
```

3. **CI guard test** (`tests/guard-storefront.test.ts`): statically scan `src/app/(storefront)/**` and `src/components/storefront/**` for imports matching `@/lib/auth|@/lib/supabase/server-session|@/lib/supabase/admin|@/components/admin` and fail if any are found.
4. **Negative-authz e2e** (QA §6.2): an anonymous `POST /api/admin/categories` returns the typed 401 envelope — the API itself refuses, regardless of any page-level mistake.

---

## 5. Future-proofing (V2 — designed, NOT implemented in MVP)

### 5.1 Optional `admin_users` table (note, not a migration here)
If the shop ever needs more than one operator, model admins explicitly. This is a **Database Engineer / Database+Auth** joint design; this doc fixes the shape and the auth contract it feeds. Reference-only for MVP:

```
-- V2 design note — NOT created in MVP. Placed in supabase/migrations/ only
-- when the multi-admin story is accepted.
create table admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null default 'editor'
    check (role in ('owner', 'admin', 'editor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  invited_by uuid references admin_users (id)
);
```

- **Roles:** `owner` (everything + invite), `admin` (everything except invite management), `editor` (catalog only). `ADMIN_EMAIL` allowlist gives way to this table.
- **RLS:** zero policies for `anon`/`authenticated`; the table is only reachable through the service-role client, gated by `requireAdmin`.
- **Invite flow (V2):** owner POSTs an invite → service-role creates the row + calls `auth.admin.generateLink({ type: 'magiclink', email })` (or a dashboard invite) → email magic link lands them in a session → first-visit `requireAdmin` sees a new `admin_users` row and grants `editor` by default. Supabase signups stay disabled; account creation happens exclusively via the service-role admin API.

### 5.2 Extending `requireAdmin` to check roles (V2, additive)

```ts
// V2 — same import path, extended signature. MVP callers are unaffected
// (no options arg → same behavior as today).
import type { NextRequest } from 'next/server';
import { createSessionServerClient } from '@/lib/supabase/server-session';

export type AdminRole = 'owner' | 'admin' | 'editor';

export type RequireAdminResult =
  | { ok: true; user: { id: string; email: string; role: AdminRole } }
  | { ok: false; reason: 'no_session' | 'invalid_session' | 'forbidden' };

export async function requireAdmin(
  _request: NextRequest,
  opts?: { roles?: AdminRole[] },
): Promise<RequireAdminResult> {
  const { supabase } = await createSessionServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false, reason: error?.message?.toLowerCase().includes('session') ? 'no_session' : 'invalid_session' };
  }
  const { data: row } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single();
  if (!row || !row.is_active) return { ok: false, reason: 'forbidden' };
  if (opts?.roles && !opts.roles.includes(row.role as AdminRole)) {
    return { ok: false, reason: 'forbidden' };
  }
  return { ok: true, user: { id: data.user.id, email: data.user.email ?? '', role: row.role as AdminRole } };
}
```

Route usage stays one line: `requireAdmin(request, { roles: ['admin', 'owner'] })`. The Backend contract type is a strict superset, so MVP code compiles unchanged when the union grows.

### 5.3 What stays identical in V2
Cookie semantics, middleware, PKCE callback, rate limiting, CSRF, `no customer auth` boundary. Only the identity check source (env allowlist → `admin_users` table) and the optional roles filter change.

---

## 6. Testing the Auth Surface

### 6.1 Unit tests (Vitest, mock `@supabase/ssr` and the rate-limiter)
FileCasesMock strategy`lib/auth/safe-redirect.test.ts`null/absent → fallback; `/admin/products` kept; `https://evil.com/x` → fallback; `//evil.com` → fallback; `javascript:alert(1)` → fallback; `/admin/login` → fallback; `/auth/callback` → fallback; `/admin/settings/offers` keptpure function, no mocks`lib/auth/require-admin.test.ts`valid admin email → `{ok:true}`; valid session, non-admin email → `forbidden`; no cookie → `no_session`; invalid JWT error message → `invalid_session`; `is_admin` metadata fallback when `ADMIN_EMAIL` unset`vi.mock('@/lib/supabase/server-session')` → fake `supabase.auth.getUser` returning each shape`lib/auth/session.test.ts` (getAdminUser)same matrix minus request param; null on non-adminmock the read-side `@/lib/supabase/server` client`middleware.test.ts`anonymous `/admin/dashboard` → 307 to `/admin/login?next=…`; anonymous `/api/admin/categories` POST → 401 JSON envelope; logged-in `/admin/login` → 307 to dashboard; logged-in `/admin/dashboard` → 200; always sets `x-cz-pathname`; `setAll` writes hardened cookies onto the response`vi.mock('@supabase/ssr')` → `createServerClient` returns a fake whose `getUser()` resolves user/null; invoke `middleware(new NextRequest('http://localhost/admin/dashboard'))``app/api/auth/send-magic-link/route.test.ts`valid → `{data:{sent:true}}` and `signInWithOtp` called with `shouldCreateUser:false`; malformed email → 400; rate-limited → 429; cross-origin `Origin` header → 403; unknown email still `sent:true` (no enumeration)mock `server-session` (fake `signInWithOtp`), mock `lib/rate-limit.take``app/auth/callback/route.test.ts`code present + exchange ok → 307 to `/admin/dashboard` + session cookie applied; exchange error (expired/consumed) → redirect `/admin/login?error=invalid_link`; no code → invalid_link; `next=//evil.com` → dashboardmock `server-session` (fake `exchangeCodeForSession`)`app/api/auth/signout/route.test.ts`200 `signedOut`; cross-origin → 403; clearing cookies applied to responsemock `server-session` (fake `signOut`)The `@supabase/ssr` mock is a tiny seam (`vi.mock` returning `createServerClient` → object with `auth: { getUser, signInWithOtp, exchangeCodeForSession, signOut }`), so unit tests run without network or a Supabase instance.

### 6.2 E2E scenarios (Playwright, QA runs — definitions for the QA matrix)
Run against the **Supabase local stack** (`supabase start`: Postgres + GoTrue + Inbucket at `http://localhost:54324` for captured magic-link emails). Seed the admin before the suite: service-role `auth.admin.createUser({ email: ADMIN_EMAIL, user_metadata: { is_admin: true } })`, then set `enable_signup = false`.

#ScenarioStepsExpected1Happy path: login → dashboardopen `/admin/login` → submit admin email → "Check your inbox" → fetch magic link from Inbucket → open itlands on `/admin/dashboard`; dashboard shows the admin email2Bad email (unknown)submit `nobody@example.com`200 + "Check your inbox" (no enumeration); no email appears in Inbucket3Malformed emailsubmit `not-an-email`inline 400 error, no request to Supabase4Expired linkobtain a link, wait past `otp_expiry` (or shorten it in local config)`/admin/login?error=invalid_link`5Replay of consumed linkopen the same magic link twicefirst lands on dashboard; second → `invalid_link` (single-use code)6Direct `/admin` URL without session`page.goto('/admin/dashboard')` with clean storageredirected to `/admin/login?next=/admin/dashboard`7Direct admin API without session`POST /api/admin/categories` with clean storage401 `{ error: { code: 'UNAUTHORIZED' } }`8Sign-outfrom dashboard, click Sign outcookies cleared; `/admin/dashboard` now redirects to login9Anonymous storefront walkno cookies: `/`, `/category/<slug>`, `/product/<slug>`, `GET /api/catalog`, `POST /api/checkout/whatsapp`all 200; no redirect to `/admin/login`10Anonymous admin write blockedno cookies: `POST /api/admin/categories`401 (also covered by #7)11Same-origin redirect safetycallback with `next=https://evil.com`lands on `/admin/dashboard`, never evil.com12Refresh rotationafter login, replay the old refresh token from a saved cookierejected (rotated)Helper for the local email fetch (dev/CI tooling, not shipped):

```ts
// scripts/get-magic-link.ts (dev/CI only)
async function getMagicLink(email: string): Promise<string> {
  const inbox = await fetch(`http://localhost:54324/api/v1/mailbox/${email}`).then((r) => r.json());
  const last = inbox[inbox.length - 1];
  const match = last?.html?.match(/href="([^"]+confirm[^"]*)/i) ?? last?.text?.match(/https?:\/\/\S+/);
  if (!match) throw new Error('No magic link found in Inbucket');
  return match[1];
}
```

### 6.3 How to test auth in CI

- **Recommended: real stack + seeded session.** CI boots `supabase start` (a job step; ~1–2 min), applies migrations + the admin seed, then runs the Playwright suite against `http://localhost:3000` with the magic-link flow through Inbucket (scenarios 1–12 above). This exercises the real PKCE exchange, real cookie attributes, and real rotation — the parts mocking cannot validate.
- **Faster alternative for auth-only e2e:** seed a session directly. After creating the admin user with the service-role key, mint a session cookie via `supabase.auth.admin` APIs and inject it into the browser context with `context.addCookies([{ name: 'sb-<ref>-auth-token', value: sessionCookie, url: 'http://localhost:3000' }])`. This skips email round-trips for scenarios 6–8, 10, 12; keep the real magic-link flow for scenario 1.
- **Unit tier** (each PR, no stack): the Vitest suites above with mocked `@supabase/ssr` + mocked `take()` — milliseconds, catches logic regressions early.
- **CI env:** `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`/`ADMIN_EMAIL` pointed at the local stack; `SUPABASE_SERVICE_ROLE_KEY` from `supabase status` for seeding. Guard tests (§4.3) run as a lint/unit step. Full matrix: unit → guard-import scan → e2e → deploy preview (DevOps).

---

## 7. Supabase Provider Configuration Required (input to Supabase Expert)
The Supabase Expert wires the provider (they own `config.toml` + dashboard, `06-supabase.md` §1.4). This doc specifies what must be configured for the locked auth model — **none of this is app code**:

SettingValueWhy (auth contract)Email provider**ON**only auth mechanismAll other providers (phone, social, SAML)**OFF**single magic-link identityConfirm email / mail confirmation**ON**required for the OTP/magic-link flow"Allow new users to sign up" + `[auth] enable_signup`**OFF**§1.3 gate 1 — no public registration`otp_expiry`**1800** (30 min)short phishing/replay window (§3.2, §3.3)`jwt_expiry`**3600** (1 h)access token lifetime (§3.3)Refresh token expiry60 d default; tighten to **30 d**admin-only app can afford short idle sessions`site_url``NEXT_PUBLIC_SITE_URL` (Vercel app origin)ConfirmationURL resolves to our `/auth/callback``additional_redirect_urls`emptyno third-party redirect origins (§3.4)Magic-link email templatebranded subject/body, one-time "Sign in to Chocolate Zone admin", expiry note; keep `{{ .ConfirmationURL }}` defaultadmin UX + phishing clarityAuth rate limits / abuse protectiondefaults ON; conservative OTP capsbackstop to §3.2 app-level guardAdmin user creationonce: `auth.admin.createUser` (service role) or dashboard **Add user**, with `user_metadata.is_admin = true`; then disable signups§1.3 gate 4Also confirm PKCE is active (`flow_type` default) so `signInWithOtp` → `/auth/callback` → `exchangeCodeForSession` works server-side; no app change needed if it is.

---

## 8. Auth Security Checklist

- Signups disabled at provider AND `shouldCreateUser: false` at every call site.
- Exactly one admin user; `ADMIN_EMAIL` set in Vercel + local env.
- `middleware.ts` matcher covers only `/admin/*` and `/api/admin/*`; static assets untouched.
- Every admin Route Handler calls `requireAdmin(request)` before reading the body or touching the DB (Backend).
- `(admin)` layout guard + middleware both redirect anonymous page visits; login page exempt (no loop).
- Cookies: HttpOnly, SameSite=Lax, Secure in prod, Path=/ (via `hardenCookieOptions`).
- No `Access-Control-Allow-Origin: *` on admin routes (Backend).
- Magic-link send rate-limited (IP + email buckets) + origin-checked; no account enumeration.
- Post-login redirects go through `safeRedirectPath` only.
- Storefront has zero auth imports (ESLint + CI guard test); anonymous walk returns 200.
- `server-only` on `server-session.ts`, `require-admin.ts`, `session.ts`, `admin.ts`.
- Magic-link template mentions one-time use + expiry; `otp_expiry = 1800`.
- CI runs unit (mocked), guard-import scan, and e2e (local stack + Inbucket or seeded session).

---

## 9. Inputs Needed (from other agents)
FromNeededConsumed byBackend DeveloperFinal `lib/rate-limit.ts` `take(key, limit, windowMs)` signature + store (their §10)`send-magic-link` endpoint §2.7.3Backend DeveloperConfirm they keep `requireAdmin` import path `@/lib/auth/require-admin` and the §11 result type (this doc implements it)§2.4Supabase ExpertProvider settings per §7 (especially `enable_signup=false`, `otp_expiry=1800`, `site_url`, admin user with `is_admin` metadata)§1.3, §2.4, §7Supabase ExpertConfirmed cookie `sb-<ref>-auth-token` behavior + PKCE/`flow_type` default on their configured project§2.2, §2.8Supabase ExpertKeep `lib/supabase/server.ts` read-side as locked; do not import `server-session.ts` in public paths§2.3Frontend DeveloperLogin page visual (shadcn/themed) wrapping the `LoginForm` contract; admin chrome wiring `SignOutButton`§2.7, §2.9QA EngineerRuns §6.2 matrix; owns Playwright config + CI e2e job§6DevOps EngineerEnv vars `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`; CI Supabase-local-stack job; Inbucket port exposure in CI§6.3, §7

---

## 10. Deferred

- **Multi-admin / roles (`admin_users`)** — designed in §5, deliberately NOT implemented in MVP (single owner is a locked product constraint).
- **Invite flow, role-scoped admin UI, audit log of admin actions** — V2 with `admin_users`.
- **Cross-origin admin SPA / `sameSite='none'`** — explicitly rejected for MVP; would require a full CSRF + CORS design.
- **Custom redirect UX on `/admin/login?error=invalid_link`** — Frontend owns the visual state; contract is fixed (`error=invalid_link` query param).
- **Session revocation / "sign out everywhere"** — Supabase provides refresh-token revocation on sign-out; bulk revocation is a V2 operational concern (Supabase Auth dashboard).
- **Passwordless fallback for locked-out admin** — none needed: magic link works from any device with mailbox access; no password to lose.
- **RSA/HS256 key rotation for JWT signing** — provider-managed by Supabase (Supabase Expert), not an app concern.

---

*End of Authentication Specialist deliverable. No contradiction with `ARCHITECTURE.md` §7; extensions (auth routes, middleware, helpers, `x-cz-pathname` header, `ADMIN_EMAIL`) are flagged inline rather than silently assumed.*
