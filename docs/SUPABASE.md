# Chocolate Zone — Supabase Integration Specification
**Owner:** Supabase Expert · **Status:** Draft v1 (implementation-ready) · **Audience:** Backend Developer, Frontend Developer, Database Engineer, Authentication Specialist, DevOps Engineer, QA
**Locked contract:** `docs/ARCHITECTURE.md` (v1). This document implements §3, §4 (lib/supabase/*), §5 (RLS reads), §8 (Storage), §10 (CLI/env) exactly. It does not rename or contradict the locked stack, data model, auth model, storage, or security model.

---

## 0. Scope, Lane Boundaries, and How to Read This Doc
SectionWhat it covers1Project setup: creating the project, region choice, CLI connect, `supabase/config.toml`, Auth magic-link provider settings2Environment variables (locked set) — what lives where, what is safe client-side3The three-client pattern: exact code for `lib/supabase/client.ts`, `server.ts`, `admin.ts` and WHY4RLS verification workflow: SQL checks + checklist that consume the Database Engineer's policies5Storage: buckets, storage policy contract, signed-URL upload flow, WebP re-encode contract, `next/image`6Realtime (V2 roadmap only — NOT in MVP)7CLI workflow: local dev, migrations, seeding, type generation and how generated types are used8Security hardening checklist9Supabase-focused risk list and mitigations10Inputs needed (from other agents)11Deferred

**Lane boundaries (what this doc does NOT own):**

- **No application DDL.** All `CREATE TABLE`, indexes, and RLS policies on `public` tables are owned by the Database Engineer. This doc references those tables (`docs/ARCHITECTURE.md` §5) and *verifies* their RLS behavior (§4), it never authors the policies.
- **No auth flow design.** Magic-link session handling, `middleware.ts`, `requireAdmin()`, CSRF, and auth rate-limit parameters are owned by the Authentication Specialist. This doc configures the Supabase *provider* (signups, expiry, templates) and wires the clients they build on; the session-cookie mutation variant of the server client is theirs.
- **No pricing, WhatsApp, or checkout logic.** Owned by Backend/WhatsApp agents; this doc only guarantees the Supabase plumbing those features read/write through.

---

## 1. Project Setup

### 1.1 Creating the Supabase project and choosing a region

1. Create an account at supabase.com and create a project via **New project**.
2. Choose a **region as close as possible to the Vercel functions region** — every RSC read, every checkout freshness read, and every admin write is a Postgres round trip. The dominant cost is network latency between the Vercel edge/function and the Supabase Postgres instance, not query time at this scale.
3. Record the project ref (the `abcdefg` in `https://abcdefg.supabase.co`) — it appears in the API URL and every CLI command.

**Region matching (Vercel function region ⇄ Supabase region):**

Supabase regionTypical Vercel function region to useEast US (N. Virginia)`iad1`West US (North California)`sfo1`Central US (Iowa)`pdx1` / `iad1`South America (São Paulo)`gru1`West Europe (Frankfurt)`fra1`North Europe (Ireland)`dub1`South Asia (Mumbai)`bom1`Southeast Asia (Singapore)`sin1`North Asia (Tokyo)`hnd1`Oceania (Sydney)`syd1`

Notes:

- **Free tier is usually pinned to East US (N. Virginia)** on the self-serve path; on a paid plan you can select any listed region. If free-tier (N. Virginia) is used, pin Vercel functions to `iad1`.
- Vercel function region is set per route via `export const config = { region: 'iad1' }` in App Router route segments, or globally via `vercel.json` `functions` mapping — the DevOps Engineer owns the final wiring; the Supabase Expert only fixes the matching rule. Mismatched regions show up as +100–300 ms per request; it is a silent cost, not a failure.
- Do not pick a region based on the customer base's country; pick one based on where the Next.js app executes. The shop and its customers are served through Vercel, so Supabase must sit next to Vercel.

**One-time settings after creation:**

- Password: store it in the team secret store (DevOps owns); it is needed by the CLI for `supabase db push` and by CI. Never in the repo.
- Note the **anon key** and the **service_role key** from Settings → API. Both are shown once / at any time from the dashboard. The service_role key must go straight into the secret store and never into a browser-bundle env var (§2).

### 1.2 Connecting via the Supabase CLI

```
# Install (if not already present)
npm install -g supabase

# Login once (browser flow, writes an access token for the CLI)
supabase login

# Generate supabase/config.toml + supabase/ skeleton in the repo root
supabase init

# Link this repo to the remote project (asks for the DB password or reads SUPABASE_DB_PASSWORD)
supabase link --project-ref <project-ref>
```

- `supabase init` creates `supabase/config.toml` plus empty `supabase/migrations/` and `supabase/templates/` directories. Everything under `supabase/` is committed to the repo (it is the single source of truth for project configuration and migrations). `config.toml` **contains no secrets** — keys/passwords stay in the environment.
- `supabase link` stores the linkage in `.temp/` (gitignored by default); the project ref also lives in `config.toml` as `project_id` for tooling that needs it.
- All CLI commands in §7 assume a linked project.

### 1.3 Repo structure (extensions inside the locked contract)

```
supabase/
├── config.toml                       # project config: auth, storage, realtime toggles (committed)
├── migrations/                       # Database Engineer owns: 1+ SQL files per change, CLI-managed timestamps
├── seed.sql                          # Database Engineer owns: idempotent dev seed (runs on db reset)
├── templates/
│   └── magic-link.html               # optional: checked-in email template for local dev parity
└── verify-rls.sql                    # THIS doc (§4): read-only verification script, NOT a migration
```

### 1.4 `supabase/config.toml` — Auth (magic link) provider settings
The locked Auth model is: **one admin, email magic link, signups disabled after that single user exists** (`docs/ARCHITECTURE.md` §7). The provider is configured in `config.toml` (committed, environment-agnostic) and in the dashboard for anything not in the TOML.

```
project_id = "chocolate-zone"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]

[db]
port = 54322
major_version = 15

[auth]
enabled = true
site_url = "https://<vercel-app>.vercel.app"
additional_redirect_urls = ["https://<custom-domain>"]
jwt_expiry = 3600
# Signups disabled: the only user is created once by an admin (see below).
# "Allow new users to sign up" in the dashboard must ALSO be OFF in production.
enable_signup = false

[auth.email]
enable_signup = false
# One admin user; the magic link itself proves possession of the mailbox,
# so no extra confirmation step is needed.
enable_confirmations = false
# Magic-link / OTP expiry. Default is 3600 s (60 min); 30 min is a good
# balance between convenience and stale-link risk for a single admin.
otp_expiry = 1800

[auth.email.template.magic_link]
subject = "Chocolate Zone — admin sign-in link"
content_path = "./supabase/templates/magic-link.html"

[realtime]
enabled = true
```

**Provider decisions and rationale:**

- **Disable signups beyond the one admin.** Production has exactly one user. Two mechanisms, both on:

1. `enable_signup = false` in `config.toml` (and the dashboard "Allow new users to sign up" toggle OFF). This makes `signInWithOtp({ options: { shouldCreateUser: true } })` fail to create accounts.
2. **Create the admin before disabling signups.** Either in the dashboard (Authentication → Users → **Add user** → sends a magic-link-style invite email), or via a one-off service-role `auth.admin.createUser` script (Auth Specialist owns that helper if we prefer the scripted route). After the first user exists, signups are disabled — there is no registration path ever exposed.
- `shouldCreateUser: false` on the actual sign-in call (Auth Specialist owns the call site) as defense-in-depth: even if signups get re-enabled by accident, `signInWithOtp` will only log in an *existing* user, never create one.
- **Email templates.** Customize subject/body in the dashboard (Settings → Authentication → Emails → Magic Link) and mirror the HTML in `supabase/templates/magic-link.html` so local dev matches prod. Keep it neutral: brand the sender, give a clear one-time "Sign in to Chocolate Zone admin" call-to-action, and include an expiry note. The template exposes `{{ .ConfirmationURL }}` etc. — the Auth Specialist decides exact redirect/`redirect_to` handling.
- **Links expiry.** `otp_expiry = 1800` (30 min) for the magic-link OTP; `jwt_expiry = 3600` for the resulting session. Short OTP lifetime shrinks the phishing/replay window; a stale link simply fails sign-in and the admin requests a fresh one.
- **Realtime toggle** lives in the dashboard (Database → Realtime → public) per-table; it is OFF for all tables in MVP (§6).

---

## 2. Environment Variables (locked)
VariableRuntime scopeWhere it livesPublic?Notes`NEXT_PUBLIC_SUPABASE_URL`client + serverVercel env UI; `.env.local` for local devYes, public by designFormat `https://<project-ref>.supabase.co`; leaking it only reveals the project ref`NEXT_PUBLIC_SUPABASE_ANON_KEY`client + serverVercel env UI; `.env.local`Yes, public by designSafe because RLS is the actual security boundary (§3, §4). Never used for writes`SUPABASE_SERVICE_ROLE_KEY`**server only**Vercel env UI (non-public); secret store; CI secret**Never**Bypasses RLS. Any `NEXT_PUBLIC_` prefix on it = critical incident (§8, §9)`SUPABASE_PROJECT_REF`CLI / CI / scriptsCI secret; `.env` (gitignored)NoUsed by `supabase link`, `supabase db push`, type generation`SUPABASE_DB_PASSWORD`CLI / CICI secret; secret storeNoFor `supabase db push` / connection; DevOps owns`NEXT_PUBLIC_SITE_URL` (reference)client + serverVercel envYesAdmin login redirect origin; Auth Specialist owns its usage

**Hygiene rules (non-negotiable):**

- The `NEXT_PUBLIC_` prefix means "inlined into every client bundle at build time." Therefore **no non-public secret may ever use that prefix** — in particular `SUPABASE_SERVICE_ROLE_KEY` is the one that must never be prefixed.
- `.env.local`, `.env`, `.env.production` are gitignored (`docs/` already `.gitignore`d via root `.gitignore`). Prefer the Vercel env UI over committing env files; the only committed env artifact is `.env.example` with placeholders.
- The anon key is *expected* in the browser bundle. It grants read-only access *bounded by RLS*. Anyone who copies it gets exactly what any storefront visitor gets: active catalog rows and public images. That is the accepted threat model; the risk registers as "RLS regression", not "anon key stolen" (§4, §9).

---

## 3. The Three-Client Pattern (locked `lib/supabase/*`)
The architecture locks exactly three files (`docs/ARCHITECTURE.md` §4). The rule: **one browser client, one RSC/handler client, one server-only admin client — nothing else touches Supabase.**

### 3.1 `lib/supabase/client.ts` — browser client (anon key, RLS reads)
Used by client components only (storefront interactive bits, admin TanStack Query that hits the public API — note the frontend contract R5: client fetch of the API, not direct DB reads, is the default). This client is only ever used for *reads* in the app.

```ts
// src/lib/supabase/client.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient<Database>(url, anonKey);
}

export type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;
```

- `'use client'` marks the module as browser-only; `createBrowserClient` from `@supabase/ssr` manages the session cookie client-side (used only to read session state in admin UI; Auth Specialist owns cookie semantics).
- The factory (not a module-level singleton) keeps it testable and avoids bundling a client before it is needed.

### 3.2 `lib/supabase/server.ts` — RSC / Route Handler client (anon + session cookie)
Used by Server Components and Route Handlers for **public reads and session verification**. Storefront RSC pages prefer `getCatalog()` (Backend's service) but any direct read — admin session check, checkout freshness reads — goes through this file. This client is anon; **it is read-only in effect because RLS grants anon SELECT only** (§4). It never writes.

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      // Read-only in this file: RSC cannot set cookies and public reads never need to.
      // The Authentication Specialist owns the cookie-MUTATING variant (middleware + handlers).
      setAll: () => {},
    },
  });
}
```

- Next.js 15 requires `await cookies()`; `getAll`/`setAll` is the `@supabase/ssr` contract.
- `setAll` is a no-op here deliberately: this client only *reads* the session cookie for `auth.getUser()` in admin guards, and public reads need no session at all. The Auth Specialist forks/extracts the mutating cookie logic for `middleware.ts` and admin login; this file stays the read-side canonical import so Backend/Frontend never import a second server client.
- Reads are cached at the service layer (`unstable_cache`, tag `catalog`) except checkout freshness reads (Backend §9) — caching policy is Backend's, the *client* is this one.

### 3.3 `lib/supabase/admin.ts` — service-role client (all writes, upload signing)
Used exclusively inside Route Handlers (via Backend's `lib/services/*`) and server-only helper code. **Every mutation in the app goes through this client**: admin CRUD, admin full-data reads (including inactive rows the anon policy filters out), and storage signed-URL creation.

```ts
// src/lib/supabase/admin.ts
import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Belt-and-suspenders guard on top of 'server-only':
// 'server-only' breaks the build if this module is imported client-side, and
// this runtime check catches accidental import into a client boundary even
// when bundler analysis misses it.
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/admin.ts is server-only. Never import it from a client component.');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server only).');
}

export const supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

- `import 'server-only'` is the primary guard (build-time, throws if the module ends up in a client bundle); the `typeof window !== 'undefined'` throw is defense-in-depth. Import name `supabaseAdmin` matches Backend's route usage (`supabaseAdmin.storage…`, `supabaseAdmin.from('products')…`).
- `autoRefreshToken: false` + `persistSession: false` because the service-role key does not represent a user session; the client is stateless and long-lived per serverless instance.
- `serviceRoleKey` is read from a **non-public** env var — if this module ever needed to be inlined into a client bundle it would crash the build with `server-only`, which is exactly the safety we want (§8).

### 3.4 Why this exact split (RLS for reads, service role for trusted writes)
ClientKeyBypasses RLS?Used forWhy`client.ts` (browser)anonNoPublic storefront reads (and session read in admin UI)Anon + RLS = every visitor can read exactly the active catalog and nothing else; zero server cost per visitor, works from any client`server.ts` (RSC/handlers)anonNoPublic reads, freshness reads, session verificationSame RLS boundary, but executed server-side so it can be cached (`revalidateTag`) and is immune to client tampering`admin.ts` (server-only)service roleYes**All writes**, admin full-data reads, signed-upload URLsThe server is the trusted party: it validates input (Zod), re-checks auth (`requireAdmin`), applies business rules (pricing, availability) before mutating

1. **RLS for reads.** The storefront is fully public; the correct way to serve it is an anon-key read gated by row-level security (`is_active` filters, no customer data exists to leak). No secret needed on the client, ever.
2. **Service role for trusted writes.** Writes must never be authorized by "the client asked nicely". Every write flows: browser → Route Handler → `requireAdmin(request)` (Auth Specialist) → Zod validation → service role write. The service-role key is the one credential that can write, and it lives only server-side.
3. **Service role never shipped to browser.** Because `NEXT_PUBLIC_` inlining + the anon key's public-by-design nature make client bundles hostile environments, the service-role key is (a) in a non-public env var, (b) behind `server-only`, (c) guarded by an explicit runtime throw. If it ever ships to a browser, RLS provides zero protection (service role bypasses it) — this is the single highest-impact misconfiguration and §8/§9 treat it as such.

**Client-to-route map (how the app wires to Supabase):**

Route / featureSupabase clientNote`GET /api/catalog`, `GET /api/products/[id]``server.ts` (anon)via Backend services, cached`POST /api/checkout/whatsapp``server.ts` (anon, fresh)live availability reads`(admin)` layout guard, `requireAdmin``server.ts` (anon + session)Auth Specialist owns helper`POST /api/admin/categories` (+ products, offers, shop)`admin.ts` (service role)all writes + full-data reads`POST /api/admin/upload``admin.ts` (service role)signed upload URLStorefront client components`client.ts` (anon)reads only; never writes

---

## 4. RLS Verification Workflow (consumes Database Engineer's policies)
This section **verifies** the Database Engineer's RLS policies; it does not author them. The expected policy contract (from `docs/ARCHITECTURE.md` §5): anon gets **SELECT only, filtered to active/appropriate rows** on all six tables (`shop_settings`, `categories`, `products`, `product_variants`, `offers`, `offer_products`); no anon INSERT/UPDATE/DELETE; service role writes via API. Run these before merge and again after any policy change.

### 4.1 Script location
Commit `supabase/verify-rls.sql` (read-only; **not** under `migrations/` so it never executes against prod). Run it in the dashboard SQL editor, or locally with:

```
# Local verification against the local stack
supabase start
supabase db reset

# Then paste the verify-rls.sql contents into the local SQL editor
```

### 4.2 RLS is enforced on every table

```
-- Expect relrowsecurity = true (RLS enforced) for all six tables.
select c.relname as table_name,
       c.relrowsecurity as rls_enforced,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('shop_settings','categories','products','product_variants','offers','offer_products')
order by c.relname;
```

### 4.3 Anon policies exist and are SELECT-only

```
-- Expect only cmd = 'SELECT' rows whose roles include 'anon' (or 'public').
-- Any INSERT/UPDATE/DELETE row with anon/public roles is a FAIL.
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

### 4.4 Anon can read active rows only

```
-- Impersonate the anonymous role and confirm filtering. In the SQL editor:
set local role anon;
set local request.jwt.claims = '{"role":"anon","sub":"00000000-0000-0000-0000-000000000000"}';

-- Should return ONLY is_active = true rows:
select id, name, is_active from products order by name;

-- Should return 0 rows (the policy filters inactive rows out of the result set):
select count(*) as hidden_inactive from products where is_active = false;

-- shop_settings is a single public row; expect exactly 1 row (policy USING(true)):
select id, brand from shop_settings;

reset role;
```

### 4.5 Anon cannot write (negative test — must FAIL)

```
set local role anon;
set local request.jwt.claims = '{"role":"anon","sub":"00000000-0000-0000-0000-000000000000"}';

-- Both statements MUST raise an error (RLS blocks the write):
insert into categories (name, slug) values ('Fake', 'fake');
update products set base_price = 0 where true;
delete from offers where true;

reset role;
```

Expected outcome: the editor reports `ERROR: new row violates row-level security policy` / `permission denied`. If either statement succeeds, **do not merge** — escalate to Database Engineer.

### 4.6 Service role can write (round-trip via API, not SQL)
The service role is a `bypassrls` role, so it cannot be meaningfully impersonated in the SQL editor. Verify with the actual app path:

```
# One-off node script (server context only) — or via an admin route in a staging deploy.
node -e '
const { createClient } = require("@supabase/supabase-js");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await s.from("categories")
    .insert({ name: "__verify__", slug: "__verify__", sort_order: 9999 })
    .select("id").single();
  if (error) { console.error("SERVICE ROLE WRITE FAILED:", error.message); process.exit(1); }
  await s.from("categories").delete().eq("id", data.id);   // cleanup
  console.log("SERVICE ROLE WRITE OK");
})();
'
```

Also assert the **same write via the anon key** fails:

```
node -e '
const { createClient } = require("@supabase/supabase-js");
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
a.from("categories").insert({ name: "x", slug: "x" }).then(r => {
  if (r.error) { console.log("ANON WRITE BLOCKED (expected) OK"); process.exit(0); }
  console.error("FAIL: anon write succeeded!"); process.exit(1);
});
'
```

### 4.7 Checklist (gate before merge / before each release)

- RLS enforced on all six tables (`relrowsecurity = true`).
- `pg_policies` shows anon SELECT policies only; zero anon INSERT/UPDATE/DELETE.
- Anon SELECT on `products`/`offers`/`categories` returns active rows only; inactive hidden.
- Anon negative writes (insert/update/delete) all error.
- Service-role write round-trip succeeds (and cleans up after itself).
- Anon-key write attempt is blocked (proves RLS is the boundary, not the SDK).
- Checkout freshness reads (anon, uncached) see a just-committed admin change immediately.
- Storage policies (§5.2) pass their own checks.
- QA e2e includes at least one negative authz test (anon write attempt → 403/RLS error surfaced as typed error, not silent success).

The Database Engineer owns authoring these policies; this checklist is the Supabase Expert's acceptance gate and should also be wired into the QA test plan.

---

## 5. Storage
Locked storage (`docs/ARCHITECTURE.md` §8): buckets `product-images` and `offer-images`, **public read**, **no public write**; uploads happen via a server-signed URL; browser re-encodes to WebP before upload.

### 5.1 Bucket creation
Buckets are configuration, not app DDL, so this doc owns them. Two equivalent routes — **CLI/migration SQL** (preferred, reproducible) or dashboard:

```
-- supabase/migrations/<timestamp>_storage_buckets.sql  (storage configuration)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true),
       ('offer-images',   'offer-images',   true)
on conflict (id) do nothing;
```

`public = true` means "object URLs are readable by anyone with the public URL" — required for `next/image` and storefront `<img>`. Push it with the normal migration workflow (§7.2). Dashboard equivalent: Storage → New bucket → name + "Public bucket".

### 5.2 Storage policy contract (owned by Database Engineer)
Storage RLS policy SQL lives in `storage.objects` and is the Database Engineer's to author. The **contract this doc fixes** (what the policies must guarantee):

RoleActionRequired outcome`anon` / `authenticated`SELECT on `storage.objects`Allow when `bucket_id in ('product-images','offer-images')` — public read`anon` / `authenticated`INSERT / UPDATE / DELETE on `storage.objects`**No policy exists** → writes denied to anon. Uploads never go through the anon API; they go through signed URLs (§5.3)service role (API)anyBypasses RLS; used only for `createSignedUploadUrl` and `getPublicUrl`

Verification (mirrors §4.3, on the `storage` schema):

```
-- Expect SELECT-only rows for anon/public on storage.objects; no write rows.
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd;
```

And a behavioral check: an anon `storage.from('product-images').upload(...)` from a browser must fail; a GET on a known public object URL must return 200.

### 5.3 Signed-URL upload flow (exact code)
Flow: admin selects image → client re-encodes to WebP → `POST /api/admin/upload` → server (service role) signs an upload URL → browser `PUT`s bytes directly to storage → server persists the public URL on the entity → `revalidateCatalog()`.

**Correction vs Backend §7.5 (integration detail):** `createSignedUploadUrl` and `getPublicUrl` expect a **bucket-relative object key**. The Backend draft builds `path = ${bucket}/${…}.${ext}` and then calls `getPublicUrl(path)`, which double-prefixes the bucket (`…/public/product-images/product-images/…`). The contract below uses a bucket-relative `objectKey`; the full object lives at `product-images/<objectKey>`. Backend to adopt `objectKey` in its `POST /api/admin/upload` (flagged in §10).

**Server side — **`POST /api/admin/upload`** (service role signs the URL):**

```ts
// src/app/api/admin/upload/route.ts  (backing contract for Backend §7.5)
import { supabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_BUCKETS = ['product-images', 'offer-images'] as const;
const ALLOWED_EXTS = ['webp', 'jpg', 'jpeg', 'png'] as const;
const MAX_BYTES = 2 * 1024 * 1024;                       // matches Backend validation
const SIGNED_URL_TTL_SECONDS = 300;                      // 5 min, short-lived (supabase-js default ~120 s)

export async function POST(request: Request) {
  // 1. Guard (Auth Specialist) + validate body (Backend) happen FIRST, before any storage call.
  const { bucket, ext, sizeBytes } = { /* parsed by Backend's schema */ } as {
    bucket: (typeof ALLOWED_BUCKETS)[number]; ext: (typeof ALLOWED_EXTS)[number]; sizeBytes: number;
  };

  if (!ALLOWED_BUCKETS.includes(bucket)) throw new Error('bucket not allowed');
  if (!ALLOWED_EXTS.includes(ext)) throw new Error('extension not allowed');
  if (sizeBytes > MAX_BYTES) throw new Error('file too large');

  // 2. Unpredictable, bucket-relative key. No user-controlled segments.
  const objectKey = `${crypto.randomUUID()}.${ext}`;

  // 3. Service role signs a short-lived UPLOAD URL (browser will PUT raw bytes to it).
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(objectKey, SIGNED_URL_TTL_SECONDS);
  if (error) return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'Could not prepare upload.' } }, { status: 500 });

  // 4. The public URL is derivable and predictable (public bucket), so return it now.
  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectKey);

  // 5. Browser uploads straight to storage; server never sees the binary.
  return Response.json({
    data: { uploadUrl: data.signedUrl, publicUrl: pub.publicUrl, objectKey, bucket },
  });
}
```

**Client side — browser PUTs the re-encoded WebP file:**

```ts
// src/lib/uploads.ts (client) — contract for Frontend's ImageUpload component
export async function uploadViaSignedUrl(
  file: File,
  signed: { uploadUrl: string; publicUrl: string; objectKey: string; bucket: string },
) {
  const res = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'image/webp' },       // must match what was signed/re-encoded
    body: file,                                      // raw bytes; server never receives them
  });
  if (!res.ok) throw new Error('upload failed');
  return { publicUrl: signed.publicUrl, objectKey: signed.objectKey };
}
```

**WebP re-encode (client-side, before signing/upload):**

```ts
// Client re-encodes to WebP (lossy, ~0.82) so the public image is small and consistent.
// Runs in the browser via canvas.toBlob BEFORE POST /api/admin/upload is called,
// so the server always sees a WebP file of known provenance and size.
async function reencodeToWebP(file: File, maxBytes = 2 * 1024 * 1024): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('webp encode failed'))), 'image/webp', 0.82),
  );
  const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
  return new File([blob], name, { type: 'image/webp' });
}
```

Notes:

- The browser `PUT` is authorized by the **signed token in the URL**, not by the anon key — which is exactly why no public-write storage policy is needed (§5.2).
- **Size/type double-check:** the server re-checks `sizeBytes` and `ext` at signing time; the client re-encodes to a known type. Supabase storage additionally enforces its own file-size cap per plan (free ~50 MB) — 2 MB stays well under it.
- The entity save (Backend service) persists `publicUrl`; only then does `revalidateCatalog()` fire. Upload-then-save always completes through an entity mutation (Backend §9).
- Exact signed-upload TTL default and per-plan availability of `createSignedUploadUrl` must be confirmed at implementation time against the installed `@supabase/supabase-js` version and the chosen plan (flagged in §10). Fallback if unavailable on the plan: proxy the binary through a server route (deviation requiring Backend + DevOps sign-off), or use `storage.from(bucket).uploadToSignedUrl(path, token, file)` from the browser with a service-role-issued signed URL.

### 5.4 `next/image` whitelist (reference)
The storage public host must be whitelisted in `next.config` `images.remotePatterns` — Frontend already proposes this (`docs/deliverables/03-frontend-architecture.md`). Confirming the shape it must cover:

```ts
// next.config.ts (owned by Frontend/DevOps; this doc fixes the pattern only)
images: {
  remotePatterns: [
    { protocol: 'https', hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '') ?? '<project-ref>.supabase.co' },
  ],
},
```

If a custom storage domain is added later, it joins this list; the public URL returned by `getPublicUrl` must match a listed host exactly.

---

## 6. Realtime (V2 roadmap — NOT in MVP)
**MVP explicitly uses **`revalidateTag('catalog')`** + ISR** (`docs/ARCHITECTURE.md` §3, Backend §9): every admin mutation invalidates the tag and the storefront re-renders server-side within seconds. Realtime is a **V2 enhancement** for live client-side storefront updates; it is documented now so the V2 slice has a wiring blueprint, but it ships with Realtime **disabled** for all tables in MVP.

Why deferred: realtime adds WebSocket connections per visitor, an always-on channel, and a second invalidation path that can fight server caching. MVP's cache-invalidation model is simpler and sufficient; realtime is a pure client-side delight layer on top.

Wiring blueprint (V2):

```ts
// V2 — lib/supabase/realtime.ts (browser-side live updates; do not build in MVP)
// @supabase/realtime-js is already a dependency of @supabase/supabase-js;
// subscribe through the browser client to get RLS-scoped rows.
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function subscribeCatalog(cb: (table: 'products' | 'offers' | 'categories', payload: unknown) => void) {
  const supabase = createSupabaseBrowserClient();
  const channel = supabase
    .channel('catalog-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products', filter: 'is_active=eq.true' },
      (payload) => cb('products', payload),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'offers', filter: 'is_active=eq.true' },
      (payload) => cb('offers', payload),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories', filter: 'is_active=eq.true' },
      (payload) => cb('categories', payload),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.info('[realtime] subscribed to catalog changes');
    });
  return () => { supabase.removeChannel(channel); };
}
```

V2 requirements this implies:

- Enable Realtime **per table** in the dashboard (Database → Realtime → public → toggle `products`, `offers`, `categories`, optionally `shop_settings`) — never schema-wide.
- **RLS applies to realtime**: anon subscribers receive only rows the anon SELECT policy exposes (active rows). This is free correctness on top of the §4 contract.
- Server caching remains the source of truth; the client layer re-fetches (`queryClient.invalidateQueries` or a fresh `getCatalog()`) on `postgres_changes` events rather than trusting the delta payload.
- Subscription limits/quotas on the free plan should be re-checked at V2 time; one channel shared by all storefront visitors is the target shape.

---

## 7. CLI Workflow

### 7.1 Local development

```
# Boot the full local stack (Postgres + GoTrue auth + Storage + Realtime) in Docker
supabase start

# After first boot it prints local URLs + keys. Map them to .env.local:
#   NEXT_PUBLIC_SUPABASE_URL        http://localhost:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY   <local anon key>
#   SUPABASE_SERVICE_ROLE_KEY       <local service_role key>  (server-only, still never committed)
#   SUPABASE_DB_PASSWORD            <local db password>

# Reset to a clean state: replays ALL migrations + runs seed.sql
supabase db reset

# Stop (keeps volumes)
supabase stop
```

Local dev runs the **same Auth/Storage/Realtime services** as prod, so the three-client pattern and RLS behavior are exercised before anything touches remote.

### 7.2 Migrations

- The Database Engineer authors one file per change under `supabase/migrations/<timestamp>_<name>.sql` (CLI stamps timestamps). Pushing is the Supabase Expert/DevOps repeatable step:

```
# Apply pending migrations to the linked remote project
supabase db push

# Create a new migration scaffold (DB Engineer fills it in)
supabase migration new <name>
```

- `supabase db push` is the **only** way schema changes reach prod (dashboard SQL editor is for the verification queries in §4, not for DDL). Storage-bucket inserts (§5.1) ride the same migration train.

### 7.3 Seeding

- `supabase/seed.sql` (Database Engineer owns content) is idempotent dev/CI data: shop settings, a few categories, products, offers. It runs automatically on `supabase db reset` and is also used by CI to stand up test fixtures.

```
# Local: migrations + seed
supabase db reset

# Remote staging seed (if ever needed): supabase db seed --remote (confirm availability on CLI version)
```

### 7.4 Type generation and how generated types are used

```
# Generate Database types from the LINKED remote project into the locked types file
supabase gen types typescript --linked > src/types/supabase.ts

# For local-first workflows, generate from the local stack:
# supabase gen types typescript --local > src/types/supabase.ts

# Older CLI alternative (project ref instead of --linked):
# supabase gen types typescript --project-id <project-ref> > src/types/supabase.ts
```

`src/types/supabase.ts` is **generated, committed, and regenerated on every schema change** (gated in CI so a drift fails the build). It is the single source of DB truth; `types/domain.ts` (locked) is the *domain* view that Backend maps DB rows into. Relationship between the two:

LayerFileOwnsGenerated DB types`src/types/supabase.ts` (`Database`)Supabase CLI (`supabase gen types`)Domain types`src/types/domain.ts` (`Product`, `OfferRule`, `ShopSettings`, …)Backend DeveloperMappingBackend `lib/services/*`Backend DeveloperUsage across the app:

```
import type { Database } from '@/types/supabase';

// 1. All three clients are typed with Database (§3) so every query is checked.
type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];

// 2. Service layer: typed reads (anon server client) …
const { data } = await supabase
  .from('products')
  .select('id, name, base_price, category_id')
  .eq('is_active', true)
  .returns<ProductRow[]>();

// 3. … and typed writes via service role.
const { data: inserted } = await supabaseAdmin
  .from('products')
  .insert({ name: 'x', base_price: 1000 } satisfies ProductInsert)
  .select()
  .single();

// 4. Rows are mapped to domain types at the service boundary (Backend owns mapping).
```

- `numeric` columns (e.g. `base_price`) come back as **strings** — the Backend `toMinor` boundary converts them (Backend §1.2); generated types reflect `string`, so the string→minor conversion is compiler-checked at the mapping site.
- Because `server.ts`/`client.ts` are typed with `Database`, the RLS assumption ("anon reads only") is mirrored in code by *convention* — typegen cannot enforce RLS; the §4 verification workflow does.

---

## 8. Security Hardening Checklist
Run top-to-bottom at project creation, after any auth/storage change, and before release.

- **Service-role exposure impossible**: `SUPABASE_SERVICE_ROLE_KEY` is a non-public env var; `lib/supabase/admin.ts` imports `server-only` and throws on `window`. CI fails if `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` appears in a bundle (add a grep/lint rule for `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`).
- **RLS enforced** on all six tables with SELECT-only anon policies (§4.2, §4.3); §4 checklist passes.
- **Signups disabled** (`enable_signup = false`, dashboard toggle OFF) with exactly one admin user existing.
- **Short magic-link expiry** (`otp_expiry = 1800`) and `shouldCreateUser: false` at the call site.
- **API keys restricted**: the project exposes only `anon` and `service_role` keys. Rotate the service-role key immediately on staff change or suspected leak (dashboard Settings → API → reveal → regenerate). Consider disabling the legacy/publishable keys if they exist in the project.
- **IP allow-listing (optional, paid plan)**: restrict project network access to Vercel function egress IPs + team office IPs. This makes a leaked service-role key useless off those IPs. Coordinate with DevOps (Vercel egress ranges) and the Auth Specialist (dashboard/Studio access is also affected).
- **PITR (Point-in-Time Recovery) enabled** (paid plan) with daily backups + granular recovery. Free tier has **no** backups — on free tier, migration discipline + `seed.sql` + re-push is the only recovery story, so a paid plan is strongly recommended before real data.
- **Deletion protection** toggle enabled in project settings (prevents accidental project deletion).
- **Row-Level-Security enforced flag**: `relforcerowsecurity = true` for the six tables (belt-and-suspenders so even a table owner can't bypass via grants). Confirmed in §4.2 query.
- **Storage**: buckets public-read only; no anon write policies on `storage.objects`; signed-upload TTL short (5 min); object keys are UUIDs (unpredictable).
- `next.image`** remotePatterns** whitelists only the Supabase storage host (§5.4).
- **Secrets hygiene**: `.env*` gitignored; only placeholders in `.env.example`; keys never logged (add a log-redaction rule for the service-role key prefix).
- **Rate limiting** on public endpoints and auth OTP (Backend §10 + Auth Specialist params) — Supabase applies built-in rate limits on `/auth/v1/otp`; app-level limits live in `lib/rate-limit.ts`.
- **Monitor**: dashboard Audit Logs reviewed on auth anomalies; auth sign-in history; storage usage alerts; Vercel logs for 4xx/5xx on `/api/admin/*` (DevOps owns alerting).
- **Dependency freshness**: pin and update `@supabase/supabase-js` + `@supabase/ssr` + Supabase CLI; typegen and CLI versions aligned across dev/CI.

---

## 9. Supabase-Focused Risk List and Mitigations
#RiskLikelihoodImpactMitigation1**Anon key "leak"** (it's in every bundle — expected)CertainLowAcceptable by design: RLS is the boundary. Real control is RLS regression prevention — §4 verification in CI, negative authz e2e (QA). Anon can read active rows + public images only2**Service-role key leaked** (repo, logs, `NEXT_PUBLIC_` prefix, GitHub Action)LowCriticalServer-only guard + runtime throw, non-public env var, log redaction, rotate immediately on any suspicion, IP allow-listing (paid) makes off-network use fail3**RLS regression: anon write policy or missing SELECT filter**MediumHigh§4.3/§4.5 negative checks before every merge; QA e2e negative test; policy review is a required review step4**Storage bucket made public-write** (accidental "public" + write policy, or anon policy added)LowHighNo anon write policies on `storage.objects` (§5.2 verification); signed-URL upload only; public-read-only contract5**Signed upload URL abuse** (reuse, oversize, wrong type)MediumMediumShort TTL (5 min), UUID keys (unpredictable), server re-checks size/type at signing, Supabase plan file-size cap as backstop6**Magic-link abuse** (OTP enumeration/spam, brute force on the single admin)MediumHighSignups disabled; `shouldCreateUser: false`; short OTP expiry; Supabase built-in `/auth/v1/otp` rate limits; app-level throttle via `lib/rate-limit.ts` (Auth Specialist owns params); monitor auth logs7**Admin reads filtered by anon RLS** (admin can't see inactive rows)High (if miswired)MediumAdmin reads always via `supabaseAdmin` (service role) — Backend services enforce this; storefront reads anon. Never read admin lists through `server.ts`8**Plan/limit surprises** (free tier: ~50 k MAU, 500 MB DB, 1 GB storage, no PITR; realtime/signed-upload gating)MediumMediumDecide paid plan before real data (PITR + IP allow-list + delete protection need it); confirm `createSignedUploadUrl` + realtime availability on chosen plan (§10)9**Region mismatch latency** (Vercel region ≠ Supabase region)MediumLow§1.1 matching rule; measure p95 DB round-trip on staging10**Realtime misconfigured in V2** (schema-wide toggle, unwieldy channel fan-out, realtime fighting cache)Low (V2)MediumPer-table toggles only; single shared channel; client re-fetches on events; stays out of MVP11**Generated types drift** (schema changed, typegen not regenerated → silent wrong queries)MediumMediumCommit `src/types/supabase.ts`; CI gate runs `supabase gen types` diff check12**Row/throughput limits on free DB** (connections, rows)LowMediumCache catalog reads (`revalidateTag`), bounded queries, plan headroom — mostly amortized by caching
---

## 10. Inputs Needed (from other agents)
FromNeededSupabase doc depends on it for**Database Engineer**Final RLS policy DDL for the six tables matching the §4 contract (anon SELECT active-only, no writes); `relforcerowsecurity`; storage-object policy DDL per §5.2 contract; exact table/column names for typegen stability§4 verification script to validate against, §5.2 storage policy contract**Authentication Specialist**Confirmed `shouldCreateUser: false` call for `signInWithOtp`, magic-link `redirect_to`/`site_url` values, session cookie name/shape, whether admin flag is `user_metadata` vs role, auth rate-limit parameters (OTP attempts, window), `middleware.ts` ownership of the cookie-mutating server client§1.4 provider decisions, §3.2 `setAll` no-op stance, §9 risk #6**Backend Developer**Adopt the bucket-relative `objectKey` contract in `POST /api/admin/upload` (§5.3 correction to their §7.5 `path` construction); confirm service-layer client usage matches the three-client map (§3.4)§5.3 signed-URL flow, §3.4 route map**Frontend Developer**Re-encode-to-WebP implementation (canvas `toBlob`, ~0.82 quality, 2 MB cap) feeding `POST /api/admin/upload`; `next.image` remotePatterns value; confirm admin never calls `lib/supabase/admin.ts` from a client component§5.3 client upload contract, §5.4**DevOps Engineer**Final Vercel function region per §1.1; env var provisioning (Vercel env UI + CI); paid-plan decision (PITR, IP allow-list, delete protection, realtime/signed-upload availability); IP allow-list coordination; log redaction for service-role key§1.1, §2, §8**PM / Product Manager**Confirm V2 scope for realtime (live storefront updates) vs MVP revalidateTag-only, and whether single-admin-only is truly fixed§6 gating**QA Engineer**Negative-authz e2e cases (anon write blocked, admin writes require session) that consume the §4 checklist; storage policy behavioral checks§4.7, §5.2

---

## 11. Deferred

- **Realtime storefront updates** — explicitly V2; MVP ships `revalidateTag` + ISR only (§6).
- **Custom storage domain** — optional later; changes `next.image` list and public URL host (§5.4).
- **Storage resize/CDN optimization** — out of scope; MVP relies on client-side WebP re-encode + 2 MB cap.
- **Supabase Edge Functions** — not used; all logic lives in the Next.js BFF (locked architecture §3).
- **Multi-admin support** — architecture locks single admin; revisit only as a product decision.
- **Branch-based Supabase previews** (`supabase db branch`) — nice-to-have for CI; not required for MVP.
- **Exact signed-upload TTL default / plan gating** — confirm against installed `@supabase/supabase-js` version and chosen plan at implementation time (§5.3, §9 #8).

---

## Revisions & Compliance
RevDateAuthorChangev12026-08-04Supabase ExpertInitial spec from locked `docs/ARCHITECTURE.md` v1**Compliance:** no contradiction with the locked architecture. Extends underspecified detail only: region-matching rule, config.toml Auth provider values, three-client internals (export names, `setAll` no-op, `server-only` guard), RLS verification workflow, storage bucket/object-key contract, realtime V2 blueprint, CLI workflow, and the hardening checklist. One flagged integration correction (Backend §7.5 `path` double-prefix) is recorded in §5.3 and §10 rather than silently changed.
