# DevOps

Outline deployment, CI/CD, infrastructure, and monitoring.

# Chocolate Zone — Deployment, CI/CD & DevOps Specification
**Owner:** DevOps Engineer · **Status:** Draft v1 (implementation-ready) · **Audience:** PM, Backend Developer, Database Engineer, Supabase Expert, Authentication Specialist, QA Engineer, solo founder (primary operator)
**Locked contract:** `docs/ARCHITECTURE.md` (v1), §10 (Deployment) and §11 (DevOps lane). This document implements the locked deployment model exactly — Vercel (single Next.js app, functions region-matched to Supabase) + Supabase (Postgres + Auth + Storage), env vars managed in Vercel Project Settings (never in repo), Supabase CLI migrations, PITR, Plausible, optional Sentry. It extends underspecified detail (CI workflow, backup scheduling, security headers, runbook) and never contradicts the locked model.
**Consumed artifacts:** DB Engineer migration plan (`docs/deliverables/05-database.md` §5, §7), Supabase Expert env contract & region pairing (`docs/deliverables/06-supabase.md` §1.1, §2, §7), Authentication Specialist env needs (`docs/deliverables/07-auth.md` §2.1), Backend rate-limit store decision (`docs/deliverables/04-backend-api.md` §10), PM analytics baseline (`docs/deliverables/01-pm-prd.md` §7).

---

## 0. Reading Guide
SectionWhat it contains1Locked deployment model restated (the contract this doc must not break)2Vercel project setup: framework detection, region pairing, domains/SSL, previews, protected previews3Environment variable management: full table, where each var lives, secrets-hygiene checklist4CI/CD pipeline: GitHub Actions workflow (lint, typecheck, unit tests, build, Supabase CLI steps, e2e), Vercel deploy, release checklist5Observability & monitoring: Vercel logs, Sentry, Plausible event list, uptime, alerting6Backups & disaster recovery: PITR, scheduled off-platform `pg_dump` via read-only role, retention, restore drill, RPO/RTO7Performance & security at the edge: cache/ISR behavior, security headers, rate limiting, WAF/DDoS, `next/image`8Environments: local dev, staging/preview, production promotion, database branch strategy9Cost & scaling notes: Vercel Hobby vs Pro, Supabase Free vs Pro, when to upgrade, baseline usage10Numbered "deploy from zero" runbook for a solo founder11Inputs needed (from other agents)12Deferred13Compliance & reference map**Lane boundaries (what this doc does NOT own):**

- No application code, no SQL DDL, no auth logic. The backup role DDL, migrations `0001`/`0002`/`0003`, and seed content are the Database Engineer's; this doc only *schedules* and *operates* them.
- No storage bucket design or upload flow (Supabase Expert), no rate-limit implementation (Backend), no admin session handling (Auth Specialist).
- What this doc owns: the Vercel project, the CI/CD pipeline, env/secrets wiring, observability tooling, backup scheduling, restore drills, edge security/performance configuration, environment strategy, cost model, and the end-to-end runbook.

---

## 1. Locked Deployment Model (restated — do not break)

```
browser ──HTTPS──▶ Vercel (Next.js 15, App Router, ISR)
                    │  ├─ (storefront) RSC  ── anon key + RLS SELECT ──▶ Supabase Postgres
                    │  ├─ /api/* Route Handlers (BFF) ─────────────────▶ Supabase Postgres + Storage
                    │  └─ admin writes ── service role (server-only) ───▶ Supabase Postgres + Storage
                    │  └─ checkout ── server-computed WhatsApp deep-link
GitHub ──▶ CI (lint/typecheck/test/build + Supabase CLI) ──▶ Vercel deploy (production on main, preview per PR)
Scheduled ──▶ pg_dump (read-only role) ──▶ private object storage
```
Non-negotiable rules inherited from the locked contract:

- Single Vercel app. Functions region == Supabase region (pairing in §2.2).
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only). Never in client bundles; never in the repo.
- Migrations only via Supabase CLI (`supabase db push`). Dashboard SQL editor is for verification queries, not DDL.
- PITR enabled. Plausible for analytics (no PII). Sentry optional but recommended (§5.2).
- Storefront cache invalidated via `revalidateTag('catalog')` on every admin mutation — the deployment config must not block on-demand revalidation.

---

## 2. Vercel Project Setup

### 2.1 Create the project & framework detection

1. Push the repo to GitHub (`chocolate-zone/<repo>`).
2. Import into Vercel: **Dashboard → Add New → Project → Import Git Repository**.
3. **Framework preset: Next.js** (auto-detected from `next.config.ts` + `package.json`). Do not override.
4. **Root directory:** `/` (single app, no monorepo).
5. **Build command:** `npm run build` → framework auto-detected as `next build`. **Output:** `next build` emits `.next/` — Vercel's default Next.js handling uses the prebuilt output; keep **"Output Directory" empty** (default).
6. **Install command:** `npm ci` (or `pnpm install --frozen-lockfile` if the team standardizes on pnpm; keep the lockfile committed — CI and Vercel both install from it).
7. Node version: pin via `"engines": { "node": ">=20" }` in `package.json` and `.nvmrc` (Vercel auto-selects from either; use Node 20 LTS, the baseline for Next.js 15).
8. **Vercel Function configuration:** keep defaults initially. Optional `vercel.json` (applies on Pro where function regions are selectable — see §2.2):

```
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10,
      "region": "iad1"
    }
  }
}
```

### 2.2 Region selection — the pairing decision
**The rule (from Supabase Expert §1.1, owned as the wiring by DevOps):** pick the Supabase region first, then pin Vercel functions to the matching region. The dominant latency is the Postgres round trip from the Vercel function to Supabase — not query time at this scale. Mismatched regions add +100–300 ms silently per request.

Supabase regionVercel function regionEast US (N. Virginia)`iad1`West US (North California)`sfo1`Central US (Iowa)`pdx1` / `iad1`South America (São Paulo)`gru1`West Europe (Frankfurt)`fra1`North Europe (Ireland)`dub1`**South Asia (Mumbai)**`bom1`Southeast Asia (Singapore)`sin1`North Asia (Tokyo)`hnd1`Oceania (Sydney)`syd1`**Decision for Chocolate Zone (MVP, single small shop):**

- The shop currency is INR and phone country code +91 (DB §1, WhatsApp §7), so the natural home is **South Asia (Mumbai) ⇄ **`bom1`.
- **However:** Vercel **Hobby** plan pins serverless functions to `iad1` and does not allow custom function regions; Supabase **Free** tier is usually pinned to East US (N. Virginia) on the self-serve path. Therefore the **locked default pairing for MVP on free/Hobby is **`iad1`** (Washington D.C.) ⇄ East US (N. Virginia)**. This is correct, safe, and costs ~100 ms more than the ideal for an India-based shop — irrelevant at MVP scale.
- **Upgrade path (documented, not MVP):** when the shop moves to Vercel **Pro** + Supabase **Pro**, create the Supabase project in **Mumbai** and pin Vercel functions to `bom1` via `export const config = { region: 'bom1' }` per App Router route segment or the `vercel.json` `functions` mapping above. Migrating Supabase region requires a fresh project + restore (§6); do it once, deliberately, before traffic exists.
- **Why not customer-based region selection:** customers are served through Vercel's CDN; only the *function↔DB* pair needs to be co-located. Do not pick a region based on where customers live.

### 2.3 Domains & SSL

- **Default domain:** `<project>.vercel.app` — always available, TLS (Let's Encrypt) automatic.
- **Custom domain (recommended before going live):** add the shop domain in **Project → Settings → Domains**.

- Set `A`/`CNAME`/`ALIAS` records exactly as Vercel instructs (usually `cname.vercel-dns.com`).
- Vercel provisions + auto-renews TLS (Let's Encrypt, 90-day). **Do not** add your own cert; Vercel manages it. DNS propagation typically < 5 min.
- Set `NEXT_PUBLIC_SITE_URL` to the **custom domain** (not the `.vercel.app` URL) once it resolves — the Auth Specialist's magic-link redirect origin uses it (`07-auth.md` §2.1: `APP_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL`). A mismatch breaks the magic-link callback or routes it to the wrong origin.
- Add both `www` and apex (`example.com` and `www.example.com`) if the shop uses both; Vercel handles the apex vs `www` split automatically.

### 2.4 Preview deployments & production on `main`

- **Production:** deploys on push to `main`. Each push builds and, on success, atomically promotes to the production alias (`<custom-domain>` + `<project>.vercel.app`).
- **Previews:** every PR (and every push to a PR branch) gets an isolated preview URL `<project>-<git-hash>.<user>.vercel.app` with the **Preview** env scope (§3). Previews are shareable (send the link to the founder's phone for a quick check) and **non-blocking** — `vercel` waits for a green pipeline before promotion to production.
- **PR comments:** Vercel bot posts the preview URL on every PR automatically (integration default). Keep it enabled — QA uses it for the e2e/review loop (§4.6).
- **"Skip deploy" for docs-only PRs:** add `[skip ci]` / `[skip vercel]` in the commit message or configure the ignore paths in **Git → Ignored Build Step** (`git diff --quiet HEAD^ HEAD -- docs/ .github/`). Cheap habit for a docs-heavy repo.

### 2.5 Protected previews

- **Enable Preview Deployment Protection** (Settings → Deployment Protection) so preview URLs require Vercel Authentication (email) before rendering. This hides a still-in-development storefront from Google and casual visitors.
- **Gotcha:** preview protection intercepts *all* requests to the preview domain — including the magic-link callback. Testing admin login against a protected preview will fail until the admin is authenticated into the preview itself. For MVP, either (a) leave previews **unprotected** (acceptable — previews contain only public catalog data, no secrets, no customer data), or (b) protect them and test admin flows on staging/prod instead. **Recommended for MVP: leave previews unprotected**, because the entire content is public-by-design (RLS SELECT is the security boundary, `05-database.md` §4) and the storefront has no auth. Protect only if the founder objects to an indexed "work in progress".
- Never put real `SUPABASE_SERVICE_ROLE_KEY` in the **Preview** env scope if you open previews to the internet (see §3 — Preview scope gets its own value, typically pointing at a staging project).

---

## 3. Environment Variable Management

### 3.1 Full env var table
All values are set in **Vercel → Project → Settings → Environment Variables** (never in the repo; the only committed artifact is `.env.example`, §3.4). Scopes: **Production** (prod deploy), **Preview** (PR previews), **Development** (pulled locally via `vercel env pull`).

VariableScope (app runtime)Public?Vercel scope to setType in VercelWhere it livesPurpose / Notes`NEXT_PUBLIC_SUPABASE_URL`client + server**Yes (public by design)**Production, Preview, DevelopmentPlainVercel env UI; `.env.local` locally`https://<project-ref>.supabase.co`. Format fixed by Supabase Expert §2. Leaking reveals only the project ref.`NEXT_PUBLIC_SUPABASE_ANON_KEY`client + server**Yes (public by design)**Production, Preview, DevelopmentPlainVercel env UI; `.env.local`Safe because RLS is the real security boundary. Never used for writes.`SUPABASE_SERVICE_ROLE_KEY`**server only****Never**Production, Preview, Development**Sensitive/encrypted**Vercel env UI (Sensitive type), CI secret, secret storeBypasses RLS — the one secret that can never carry a `NEXT_PUBLIC_` prefix. If it ever leaks, rotate it immediately (§3.3).`ADMIN_EMAIL`server only**Never**Production, Preview, DevelopmentPlainVercel env UISingle admin identity for magic-link (`07-auth.md` §2.1). Auth Specialist's source of truth for "who is admin".`NEXT_PUBLIC_SITE_URL`client + serverYesProduction (custom domain), Preview (preview URL), Development (`http://localhost:3000`)PlainVercel env UIMagic-link redirect origin (`APP_ORIGIN`). Must be exact per environment — see §2.3.`UPSTASH_REDIS_REST_URL`server only**Never**Production, Preview, DevelopmentSensitiveVercel env UI; `.env.local`Rate-limit backing store (Backend §10: `take()` primitive, shared by checkout + magic-link throttles). Only if Upstash is adopted — see §7.3.`UPSTASH_REDIS_REST_TOKEN`server only**Never**Production, Preview, DevelopmentSensitiveVercel env UI; `.env.local`REST API token for the same store. Encrypted at rest by Vercel.`SUPABASE_PROJECT_REF`CLI/CI/scripts**Never**(CI secret)—GitHub Actions secretProject ref for `supabase link`, `db push`, `gen types` (§4.3).`SUPABASE_DB_PASSWORD`CLI/CI**Never**(CI secret)—GitHub Actions secret; secret storeDB password for `supabase db push`/connection (Supabase Expert §2).`SUPABASE_ACCESS_TOKEN`CLI/CI**Never**(CI secret)—GitHub Actions secretPersonal/automation token for the Supabase CLI to authenticate against the API.`BACKUP_DATABASE_URL`backup job (off-platform)**Never**(CI secret, backup job only)—GitHub Actions secret; secret store**Read-only** connection string for the scheduled `pg_dump` (role `backup_reader`, DB §7.3). Never the service role / postgres URL. See §6.2.`SENTRY_DSN`server + client (build)**Never** (public DSN is fine, but keep as Sensitive for hygiene)Production, Preview, DevelopmentSensitiveVercel env UIOptional — `@sentry/nextjs` DSN. §5.2.`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`clientYesProduction, PreviewPlainVercel env UIPlausible `data-domain` — the analytics site identifier (`chocolate-zone.com`). Used by the browser script tag. §5.3.**Deliberately NOT an env var:** the Plausible script source domain is a constant (`https://plausible.io/js/script.js` for the cloud plan, or your self-host host). Do not gate it behind an env var that differs per environment — Plausible should run in **Production only** (Preview scopes get the same value but the script can be skipped in dev by env check).

### 3.2 NEXT_PUBLIC vs server-only — the rule

- `NEXT_PUBLIC_*` is **inlined into every client bundle at build time**. Only values safe for public disclosure get the prefix: the Supabase URL, the anon key, the site URL, and the Plausible domain. These are secrets to nobody.
- Anything server-only (service role, admin email, Upstash token, Sentry DSN) must **not** be prefixed, and must be imported only inside server code (`import 'server-only'` is enforced at build time by the Supabase Expert's `lib/supabase/admin.ts`). A common failure mode is copy-pasting `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — treat that as a critical incident (§3.3).

### 3.3 Secrets-hygiene checklist (run before every release)

- No `SUPABASE_SERVICE_ROLE_KEY` (or Upstash/Sentry/backup secrets) anywhere in the repo — grep for the value and for `NEXT_PUBLIC_SUPABASE_SERVICE` across `src/`, configs, and history. Secrets are stored in Vercel env UI + GitHub secrets + secret store only.
- `SUPABASE_SERVICE_ROLE_KEY` set as **Sensitive** (encrypted) type in Vercel so its value is never readable after save.
- `.env.example` committed with **placeholders only** (never real values); `.env*` files gitignored (root `.gitignore` already covers `.env.local`/`.env`/`.env.production`).
- `BACKUP_DATABASE_URL` uses the read-only `backup_reader` role, never the `postgres` role or service key (§6.2).
- Vercel project access list contains only the founder's account; CI tokens are scoped and rotated every 90 days.
- If any secret is pushed to a commit, treat as compromised: rotate `SUPABASE_SERVICE_ROLE_KEY` in the Supabase dashboard **immediately** (Auth → keys), rotate the Upstash token, and scrub git history (rewrite + `git filter-repo` or delete the branch).
- `NEXT_PUBLIC_SITE_URL` matches the actual origin for each environment (§2.3); a wrong value silently breaks magic links.
- Preview scope never receives Production's service-role value unless previews share the production project (they don't — §8.2). Give Preview its own project + keys.

### 3.4 `.env.example` (committed artifact — placeholders only)

```
# --- Public (inlined client-side; safe by design) ---
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=chocolate-zone.com

# --- Server-only (never NEXT_PUBLIC_, never in the repo) ---
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_EMAIL=owner@chocolate-zone.com
UPSTASH_REDIS_REST_URL=https://<upstash-ref>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<upstash-token>
SENTRY_DSN=<sentry-dsn>

# --- CLI / CI only ---
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_DB_PASSWORD=<db-password>
SUPABASE_ACCESS_TOKEN=<cli-access-token>
BACKUP_DATABASE_URL=postgresql://backup_reader:<secret>@<db-host>.supabase.co:5432/postgres
```

---

## 4. CI/CD Pipeline

### 4.1 Pipeline overview

```
Pull request ──▶ GitHub Actions ──┬─ Job 1: quality   (lint + typecheck + unit tests + build)
                                  ├─ Job 2: db        (supabase db lint, db push to CI DB, gen types drift check)
                                  ├─ Job 3: e2e       (Playwright against local Supabase stack, needs Docker)
                                  └─ Vercel Git integration ──▶ preview deployment (on success, non-blocking)
Push to main ──▶ GitHub Actions (same quality+db+e2e, gating) ──▶ Vercel ──▶ production deployment
Scheduled (daily) ──▶ GitHub Actions backup job ──▶ pg_dump ──▶ private object storage
```
Two deploy options (choose one; both documented):

- **A. Vercel Git integration (recommended, simplest):** Vercel builds & deploys on its own after the Git push; GitHub Actions gates with checks that are *required* on `main` and *suggested* on PRs. No deploy step in Actions needed.
- **B. GitHub Actions → **`vercel`** CLI:** Actions builds (`next build`) then `vercel deploy --prebuilt --prod` / `--prebuilt` with `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` secrets. More control, more moving parts. **MVP uses A.**

### 4.2 GitHub Actions workflow (outline — `.github/workflows/ci.yml`)

```
name: ci

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "20"

jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint              # next lint --dir src
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Unit tests
        run: npm run test -- --ci      # vitest/jest for pricing, order-message, validation
      - name: Build
        run: npm run build             # verifies RSC/client split, ISR config, no server-only leaks
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_SITE_URL: http://localhost:3000
          # NO service role here — build must succeed without it (guards server-only imports)

  db:
    runs-on: ubuntu-latest
    needs: quality
    timeout-minutes: 10
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
      SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - name: Lint migrations (static, no DB)
        run: supabase db lint
      - name: Link project
        run: supabase link --project-ref "$SUPABASE_PROJECT_REF"
      - name: Apply pending migrations to CI database
        run: supabase db push          # idempotent; only pending migrations run
      - name: Drift / type check
        run: |
          supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public \
            > /tmp/gen.sql
          git diff --exit-code -- src/types/supabase.ts || {
            echo "::error::Committed supabase types are stale. Run gen types and commit.";
            exit 1;
          }

  e2e:
    runs-on: ubuntu-latest
    needs: db
    timeout-minutes: 30
    services:
      docker: docker:24
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - name: Start local Supabase stack (Postgres + GoTrue + Storage + Realtime)
        run: supabase start            # requires Docker; boots the same services as prod (§8.1)
      - name: Install + seed
        run: npm ci && npm run db:seed # runs seed against local stack
      - name: Run e2e
        run: npx playwright test
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_SITE_URL: http://localhost:3000
          ADMIN_EMAIL: owner@chocolate-zone.com
      - name: Upload Playwright artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  # Option B deploy (only if not using the Vercel Git integration):
  deploy:
    runs-on: ubuntu-latest
    needs: [quality, db, e2e]
    if: github.ref == 'refs/heads/main'
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: npm }
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_SITE_URL: ${{ secrets.NEXT_PUBLIC_SITE_URL }}
      - run: npx vercel deploy --prebuilt --prod --token "${{ secrets.VERCEL_TOKEN }}"
```
**Notes on the outline:**

- The `quality` build intentionally runs *without* `SUPABASE_SERVICE_ROLE_KEY` — the build must succeed with only the two public Supabase vars. This fails CI if any client component accidentally imports a server-only secret.
- Branch protection on `main`: require `quality`, `db`, `e2e` to pass; require 1 approval; require up-to-date branches.
- Unit-test targets: pricing/discount math, WhatsApp message builder, money formatting, validation schemas (they are pure functions — the highest-value tests, per Backend §1/§8).

### 4.3 Supabase CLI steps in CI
StepCommandFails onPurposeLint`supabase db lint`SQL errors, policy-lint findingsStatic check, no DB needed (DB §5.4)Link`supabase link --project-ref $SUPABASE_PROJECT_REF`bad ref/tokenBind the repo to the CI databasePush`supabase db push`failing migrationApply only pending migrations (0001, 0002, 0003…) to the CI database — every commit re-runs it; it is idempotentType drift`supabase gen types typescript … --schema public > /tmp/gen.sql` + `git diff --exit-code`committed `src/types/supabase.ts` is staleEnforces the "types match migrations" invariant so the app and DB never drift silentlyList (log)`supabase migration list`—Log applied/pending status for the pipeline recordThe CI database: for MVP, reuse the **staging Supabase project** (§8.2) for `db push`. The `db push` from CI runs the same forward-only migration train as production; because `0001`/`0002`/`0003` are wrapped in `begin; … commit;`, a mid-transaction failure rolls back atomically and the migration is never marked applied (`05-database.md` §5.6) — CI simply fails and nothing is half-applied.

### 4.4 E2E job against a local/CI Supabase stack

- Use `supabase start` on the runner (Docker service). It boots Postgres + GoTrue + Storage + Realtime locally — the same stack as prod — so RLS behavior and the three-client pattern are exercised before anything reaches a shared database (`06-supabase.md` §6.1).
- The e2e suite (QA-owned) covers: storefront load → category filter → offer visible → add to cart → name+phone checkout → correct pre-filled WhatsApp link; admin CRUD on all four entities; open/ordering toggle reflects on storefront within seconds (DoD §12).
- Seeding: run the DB Engineer's seed against the local stack so the fixture menu is deterministic (`05-database.md` §5.5/§10).
- Playwright artifacts upload on failure for triage.

### 4.5 Deploy via Vercel

- **Option A (MVP):** Vercel Git integration. Production builds on `main` push; previews on PR. No extra deploy code. The CI checks above are wired into the PR as required status checks; Vercel's own deployment status check is also required on `main`.
- **Option B:** `vercel deploy --prebuilt --prod` from Actions (workflow outline above). Use only if you need a single pipeline that owns build + deploy atomically. Requires `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets.
- After a successful production deploy, Vercel rewrites the static/preview caches; `revalidateTag('catalog')` continues to work on the new deployment (tag revalidation is per-deployment and begins warm on the freshly built app).

### 4.6 Release checklist (run before each release to production)

- All three CI jobs green on `main` (`quality`, `db`, `e2e`).
- Migrations applied and `supabase migration list` shows all migrations applied in production; `src/types/supabase.ts` is in sync (drift check passed).
- Preview deployment smoke-tested by the founder (storefront + admin login on preview, or on staging).
- Env vars verified per scope (Production values point at the production Supabase project; `NEXT_PUBLIC_SITE_URL` is the custom domain).
- Security headers present in production response (`curl -I https://<domain>` — §7.2).
- Sentry healthy (if enabled): release shows in Sentry, source maps uploaded.
- Plausible receiving events on the production domain (check live events after one browse).
- PITR enabled on the production project (§6.1); last `pg_dump` backup succeeded (§6.2).
- Rollback plan documented: schema rollback = ship a reverse migration (forward-only, DB §5.6); app rollback = redeploy previous production commit in Vercel (**Settings → Instant Rollback**).
- Tag the release: `git tag -a v1.0.0` and push (Vercel deploys from `main`; the tag is for provenance).

---

## 5. Observability & Monitoring

### 5.1 Vercel logs

- **Runtime logs** (Runtime Logs, free): per-deployment request logs for functions and ISR. View in **Vercel → Project → Logs**, filter by function (`/api/checkout/whatsapp`, `/api/admin/*`, `/api/auth/*`).
- **Console** (`vercel logs <url>`): tail a specific deployment from the CLI — the fastest way to debug a single bad request during the runbook.
- **Log drains** (Pro): forward to Axiom/Datadog etc. **Deferred** — MVP uses the in-product logs; the payload volume is tiny (a few hundred requests/day).
- **Watch for:** repeated `429 LIMIT_EXCEEDED`, 5xx spikes, long P95 durations on checkout (indicates region mismatch — §2.2).

### 5.2 Error tracking — Sentry (optional but recommended)
Set up `@sentry/nextjs` (Vercel Marketplace integration or manual DSN env var `SENTRY_DSN`).

- **Instrument (breadcrumb + error capture):**

- **Checkout route** `POST /api/checkout/whatsapp` — capture 4xx validation failures as **handled errors** with typed error code only (never the raw name/phone/note — PII guardrail, PM §7), and any 5xx as an **unhandled exception** with a stack trace.
- **Auth flow** (`/api/auth/send-magic-link`, `/auth/callback`) — capture callback failures (invalid/expired link, PKCE mismatch) — these are the most silent, user-facing breakages and are invisible without a trace.
- **Admin CRUD** — capture 5xx on any admin mutation; log a breadcrumb on success (with the revalidation tag, not the row content).
- **Build/runtime:** upload source maps via the Vercel build (the integration does this automatically) so traces are symbolicated.
- **Config values:** `tracesSampleRate: 0.1` (low volume, enough signal); `release` set from git SHA (`SENTRY_RELEASE` or the integration's auto-setting).
- **Privacy:** Sentry must be configured to **never** capture request bodies for `/api/checkout/whatsapp` and `/api/admin/*` (`beforeSend` strips `request.body`). The only data ever recorded is error codes, route names, timings. This is a hard guardrail (no customer PII, `ARCHITECTURE.md` §1).
- **Alternative:** if the founder declines Sentry, keep Vercel logs + a simple `/api/health` heartbeat as the bare minimum. Sentry is recommended but optional per the locked model.

### 5.3 Privacy-friendly analytics — Plausible event list
Load `script.js` with `data-domain=NEXT_PUBLIC_PLAUSIBLE_DOMAIN` **in Production only**. Custom events are fired client-side with `plausible('event', { props: {} })` and **must never carry name, phone, note, or any free-text input** (PM §7 guardrail).

**Baseline events (locked, from PM §7):**

EventWhenProps (no PII)`catalog_view`storefront catalog rendersnone (or `category`)`add_to_cart`item added to cart`product_id`, `variant_id`, `qty``offer_tap`offer tapped / scoped product added`offer_id``checkout_success``POST /api/checkout/whatsapp` returned 200 with `waUrl``total`, `line_item_count` (aggregates only)**Extended events ( recommended for the KPI set, PM §7.1):** `storefront_load`, `offer_impression`, `product_view`, `checkout_start`, `checkout_total`, `store_closed_view`, `store_paused_view`. All optional; the four baseline events satisfy the MVP KPI table (conversion, offer tap-through, add-to-cart rate, AOV via `checkout_total`).

**Implementation note for checkout:** `checkout_success` is fired from the **client** after the server responds — the server never talks to Plausible, so no PII can leak into analytics through the checkout route. Goal funnels ("Browse-to-order") in Plausible use `catalog_view` → `checkout_start` → `checkout_success` (session-scoped, PM §7 KPI 5).

### 5.4 Uptime monitoring

- **Free, reliable:** UptimeRobot (free 50 monitors) or a private Better Stack health check hitting `GET /api/health` (a tiny Route Handler that does one read-only `select 1` against Postgres and returns `200 { ok: true }`). Alert on downtime > 60 s.
- **Platform:** Vercel publishes status at `status.vercel.com` (subscribe to incident emails) and Supabase at `status.supabase.com`. Both have public status pages — point the founder there for "is it us or them".
- **Checks:** every 5 min from ≥ 2 regions (UptimeRobot supports multiple regions free). A single-region check can false-alarm on a single PoP.
- The `/api/health` route also gives Plausible's outbound / uptime a DB-free signal to distinguish "app down" from "DB down".

### 5.5 Alerting (single-owner friendly — keep the noise near zero)
AlertChannelThresholdUptime down > 60 sEmail (UptimeRobot/Better Stack)AnySentry: new error, or error volume spikeEmail (Sentry default alert)≥ 3 errors in 10 minCheckout 5xx spikeVercel Logs + Sentry alert≥ 5 in 5 minBackup job failureGitHub Actions failure notification (email)Any (§6.2)Plausible: zero events for 24 h on prodManual weekly check (no native alert on free tier)—Supabase pause/crashSupabase status page subscription—For a solo founder, **email-only alerting** (Sentry + UptimeRobot + GitHub notifications) is the right MVP; SMS/paging is over-engineering for a shop that serves during business hours.

---

## 6. Backups & Disaster Recovery
Context from DB Engineer §7: the DB is tiny (5 tables, ~35 rows) and holds **menu data only** (no customers, no orders). Losing it means rebuilding the catalog by hand — annoying, not catastrophic — but backups are cheap, so do them properly anyway.

### 6.1 PITR enablement (primary recovery)

- **Supabase PITR** (paid plan, Pro): continuous WAL archiving + daily snapshots. Restore to **any point in the last 7 days** (retention is plan/setting-dependent).
- Enable: **Dashboard → Database → Backups → Enable PITR**. Toggle it **before** the shop goes live so the entire production lifetime is covered.
- Restore flow: **Backups → Restore to a point in time** → Supabase spins up a **new read-only instance** → verify → promote (point the project's DB connection at the promoted instance). This is the safety net for a bad migration or a mis-issued `DELETE`.
- **Also enable the free-tier daily backup** on Free plan: dashboard → Database → Backups (Free includes daily backups with 7-day retention, but **no point-in-time** — recovery is the latest snapshot only). See §6.5 RPO.

### 6.2 Scheduled off-platform `pg_dump` via a read-only backup role
PITR lives inside Supabase; a scheduled `pg_dump` gives a **portable, off-platform, vendor-independent** copy you can restore anywhere (local Postgres, another project, or a manual disaster).

- **Role (DB Engineer-authored, migration **`0003`**):** `backup_reader` — login, `nosuperuser`, no create privileges, `grant select on all tables in schema public` (+ default privileges). The backup job **never** uses the `postgres` role or the service key (`05-database.md` §7.3). The connection string is the `BACKUP_DATABASE_URL` secret.
- **Job:** a GitHub Actions scheduled workflow (`.github/workflows/backup.yml`), `cron: '15 2 * * *'` (02:15 UTC daily):

```
name: daily-pgdump
on:
  schedule:
    - cron: "15 2 * * *"   # 02:15 UTC daily
  workflow_dispatch: {}

jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - name: Dump database (read-only role)
        run: |
          pg_dump \
            "${{ secrets.BACKUP_DATABASE_URL }}" \
            --schema=public \
            --no-owner \
            --no-acl \
            -F c -f cz-db-$(date -u +%Y%m%d-%H%M%S).dump
      - name: Upload to private object storage
        run: |
          # rclone copy cz-db-*.dump backup-bucket:cz/   (S3/R2/Backblaze, private, versioned)
      - name: Prune old backups (retention 30 days)
        run: |
          # rclone delete --min-age 30d backup-bucket:cz/
      - name: Notify on failure
        if: failure()
        run: echo "::error::Daily backup failed"   # GitHub email notification fires
```

- **Why GitHub Actions for the runner:** Supabase's hosted Postgres does not permit SSH or filesystem dumps on the instance (`05-database.md` §7.3) — the dump must run from a separate machine. GitHub Actions is free, already used, and its failure notification doubles as the backup alert.
- **Destination:** any **private, versioned** object store — AWS S3 (private bucket, versioning on, lifecycle to delete `pg_dump` files > 30 days), Cloudflare R2, or Backblaze B2. It holds only menu data (no PII), so sensitivity is low, but keep it private and versioned anyway. Encryption: use the provider's server-side encryption; no GPG needed for menu-only data (note this in the runbook so the founder doesn't over-engineer).
- **Do not** store the dump in the repo or as a GitHub Actions artifact (artifacts expire; repo would leak business data into git history).

### 6.3 Retention
LayerRetentionTargetSupabase daily backups7 days (platform)always onSupabase PITR (paid)7 days point-in-time (plan-dependent; raise to 14/28 on Pro if cheap)enabled pre-launchOff-platform `pg_dump`**30 days** rolling (2/4/8-weekly cadence optional)`rclone` lifecycleLong-term monthly archive1/year kept forever (optional, cheap)founder's choice30-day `pg_dump` retention comfortably covers "I noticed a week later that a bad change landed" with a pre-PITR-window fallback.

### 6.4 Restore drill procedure (documented, quarterly)

1. **Create a scratch restore project** in Supabase (or a local Postgres via Docker) — never restore on top of the live project.
2. **PITR restore:** Dashboard → Backups → Restore to point in time → pick a timestamp (use "yesterday 12:00" as the drill target) → wait for the new read-only instance → verify schema (`\dt`, row counts per table) → **promote** → point the app's env at it in a scratch Vercel project or local env and confirm storefront + admin render.
3. **Portable restore (off-platform):** restore the latest `pg_dump` into a scratch project: `pg_restore --clean --no-owner --dbname=<scratch-url> cz-db-<ts>.dump` → verify → repeat steps 2's verify.
4. **Record the drill** (date, duration, what was verified, any gaps) in `docs/operations/restore-drills.md`. Target drill completion in **< 30 min** end-to-end.
5. First drill runs within **2 weeks of go-live**; then quarterly, and after any backup-affecting change (new table, plan change, region move).

### 6.5 RPO / RTO targets (documented, honest numbers)
MetricTargetProvided by**RPO** (max data loss)**≤ 24 h** (MVP)daily `pg_dump` — worst case lose one day of menu editsRPO (better)minutesPITR (paid) — covers accidental destructive queries**RTO** (time to recover)**≤ 1 h**PITR dashboard restore or `pg_dump` → scratch project; both are minutes, < 1 h with verifyFull app outage response≤ 15 min for detectionUptime alerting (§5.4) + Vercel Instant RollbackBecause the DB is menu-only, an RPO of 24 h is acceptable for MVP; the 7-day PITR window (paid) reduces RPO to minutes for operational mistakes. The RTO targets are comfortably met by the platform restore flows — the drill proves it.

---

## 7. Performance & Security at the Edge

### 7.1 Cache headers & ISR behavior

- **ISR on the storefront:** catalog-driven pages (`(storefront)/`, `category/[slug]`, `product/[slug]`) use ISR with `revalidateTag('catalog')` on-demand invalidation. Every admin mutation calls `revalidateCatalog()` (`lib/revalidate.ts`) so the storefront updates within seconds — the locked near-instant update requirement (`ARCHITECTURE.md` §10, DoD).
- **Plan constraint (Vercel):** on **Hobby**, time-based `revalidate` is floored at **60 s**; on **Pro** it drops to **1 s**. **On-demand** `revalidateTag`/`revalidatePath` works on **both** plans. **Implication:** the near-instant storefront update is driven by on-demand revalidation (admin mutation → tag purge), which works on Hobby — a strong reason to prefer `revalidateTag` over short `revalidate` intervals in this codebase. Avoid relying on `revalidate: 5` for catalog freshness; it will not behave as written on Hobby.
- `/api/catalog`**:** cached with `unstable_cache(..., { tags: ['catalog'], revalidate: 60 })` (Backend §9). No extra headers needed — the Route Handler + tag revalidation already control freshness.
- **Static assets:** Vercel serves `.next/static/*` with immutable caching automatically. Fonts/images built through `next/image` are optimized and cached at the edge (§7.5).
- **Default **`Cache-Control`** on API routes:** ensure `POST /api/checkout/whatsapp`, `/api/admin/*`, `/api/auth/*` are **never** cached (Next.js default for `POST` is `no-store`; add `export const dynamic = 'force-dynamic'` or `Cache-Control: no-store` on handlers that could be revalidated). Public `GET` catalog routes may be cached at the edge via ISR only, not CDN-cached with stale-forever semantics.

### 7.2 Security headers
Set in `next.config.ts` `headers()` so they apply in local dev too (Vercel edge headers are equivalent; next.config is the single source):

```
// next.config.ts — headers() excerpt (placeholder supabase host)
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '') ?? '*.supabase.co';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' https://plausible.io https://*.plausible.io",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
      `connect-src 'self' https://${SUPABASE_HOST} https://wa.me https://plausible.io`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];
```

- **CSP rationale:** `connect-src` must include the Supabase host (all reads), `https://wa.me` (checkout opens the deep link), and Plausible. `script-src` adds the Plausible analytics host. `style-src 'unsafe-inline'` is needed for Framer Motion inline styles and shadcn theme CSS — accepted trade-off; a stricter nonce-based CSP is deferred (§12). `frame-ancestors 'none'` + `X-Frame-Options: DENY` block clickjacking on the admin dashboard.
- **HSTS:** `preload` is safe to include once the custom domain is live; it forces HTTPS for a year. Do not set HSTS while still on the temporary `.vercel.app` domain if you plan to move (HSTS applies per host).
- **Vercel default headers** already include `X-Content-Type-Options` and HTTPS redirects; the explicit config above makes them deterministic and self-documenting.
- **Verify after deploy:** `curl -sI https://<domain>/ | grep -iE 'content-security|strict-transport|x-frame|referrer-policy'`.

### 7.3 Rate limiting notes (platform + app level)

- **App level (MVP, all plans):** the Backend's `take()` primitive (§10) throttles `POST /api/checkout/whatsapp` (15/min per IP, 3/min per phone+IP) and the magic-link send (5/hour per email/IP) with a `429 LIMIT_EXCEEDED` + `Retry-After: 60`. Backing store is **Upstash Redis** (`UPSTASH_REDIS_REST_URL`/`_TOKEN`) — a single REST read per call, shared by checkout and auth, with the free tier (10k commands/day, 256 MB) covering a shop's entire traffic. **This is the primary rate limiter and works on every Vercel plan.**
- **Fallback (documented, not recommended):** an in-memory Map (per warm instance) is best-effort only and undocumented in its limits — fine for a single-function workload, not for correctness. Adopt Upstash.
- **Platform level (Vercel, Pro feature):** Vercel's native **Rate Limiting** (WAF rules) can add edge-enforced IP rate limits before requests hit functions. **Deferred** until Pro — app-level Upstash is sufficient for MVP, and native rules add per-request cost on Pro.
- **Supabase built-ins:** GoTrue applies its own OTP throttling to `/auth/v1/otp` as the backstop (Auth §3.2); Storage enforces per-plan file-size caps (free ~50 MB, well above the 2 MB upload cap — Supabase Expert §5).

### 7.4 DDoS / WAF basics on Vercel

- **Vercel free/Hobby:** Vercel's edge network absorbs and filters volumetric DDoS at its PoPs automatically (this is included, not a paid add-on). You do not need Cloudflare as a front for DDoS on Vercel.
- **Pro:** **Vercel WAF** (paid add-on, ~$30/mo) adds managed rules (SQLi/XSS probing, bot management, IP allow/deny, custom rules, native rate limiting). **Deferred** — the app is read-mostly public content + a single admin; the admin surface is already protected by session verification (handler-level guard), magic link, and app-level rate limits.
- **Recommended baseline on every plan:** keep the admin surface small (`/admin/*`, `/api/admin/*`), keep it un-linked in the storefront UI, and monitor `429`/401 spikes in Vercel logs. Enable WAF only if attack traffic appears or compliance demands it.

### 7.5 `next/image` optimization + remotePatterns

- `next/image` auto-optimizes (WebP, responsive `srcset`) and serves through Vercel's optimizer cache — no manual cache headers needed for images.
- `remotePatterns` must whitelist the Supabase storage host exactly as `getPublicUrl()` returns it (Frontend §10.2, Supabase Expert §5.4):

```
// next.config.ts — images
images: {
  formats: ['image/webp'],
  remotePatterns: [
    {
      protocol: 'https',
      hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '') ?? '*.supabase.co',
    },
  ],
},
```

- **Operational notes:** `getPublicUrl` returns `https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>` — the host must match the pattern exactly or images 400. If a custom storage domain is added later, it joins the list (`06-supabase.md` §5.4). Keep `formats: ['webp']` (client re-encodes to WebP before upload, so the optimizer rarely needs transcoding). Buckets are public-read, so images are cached edge-side by the optimizer with a long TTL; invalidation happens through the optimizer cache when the object URL changes (uploads use versioned object keys — Supabase Expert §5.3).

---

## 8. Environments
EnvironmentWhereDB targetPurpose**Local dev**developer laptop`supabase start` local stack (Docker)day-to-day coding, RLS/three-client testing**Preview (per PR)**Vercel preview deploymentstaging Supabase projectPR review, QA smoke, designer check**Staging**Vercel production of a `staging` branch (or a dedicated project)staging Supabase projectpre-release rehearsal with real data shape**Production**Vercel production on `main`production Supabase projectthe live shop
### 8.1 Local dev (`supabase start` + `.env.local`)

1. `supabase start` boots Postgres + GoTrue + Storage + Realtime in Docker (URL `http://127.0.0.1:54321`). It runs all migrations and seeds automatically (`supabase/seed.sql`).
2. `supabase status` prints the local anon key + service role. Put them (and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`) in `.env.local` (gitignored). Dev uses the **local** keys, never production keys.
3. Run `npm run dev`. The storefront + admin + `/api/*` all talk to the local stack; auth magic links resolve to `http://localhost:3000`.
4. On migration changes: `supabase db reset` (drop + reapply + reseed) for a clean slate, or `supabase db push` to apply pending only. `supabase gen types typescript --local > src/types/supabase.ts` to refresh types locally before committing.

### 8.2 Staging / preview (database branch strategy)

- **MVP (free-tier friendly):** one shared **staging** Supabase project (Free or Pro). Preview deployments and the CI `db` job point at it via the Preview env scope (§3.1) with its **own** staging keys (separate project ref, separate anon/service role). Production never shares keys with preview/staging.
- **Database branching (paid plan):** Supabase **database branches** (Preview branching) create an **ephemeral Postgres clone per PR** — `supabase db branch` in CI or the GitHub integration. The preview URL gets a branch-specific database, so PRs never step on staging data. This is the clean long-term answer; **adopt when on Supabase Pro** (§9). The migration train (0001→0003) applies identically to branches.
- **Staging data:** seed staging with the DB Engineer's deterministic demo seed (`0002_seed.sql` / `seed.sql`) so previews render a real menu. Never point preview at production data (even though there is no customer PII, previews must not read the live DB — it trains bad habits and risks `revalidateTag` purging the prod catalog cache from a preview build).

### 8.3 Production promotion

- Promotion = merge PR to `main` → CI gates pass → Vercel deploys production. There is no separate "promote" step in MVP (Option A).
- For staged promotion (optional): deploy `main` to the **staging** project first (Vercel allows the same repo in two projects; staging project's production branch = `staging`), verify against staging DB, then merge to `main`. **MVP default: direct-to-prod** because the storefront content is fully reversible (revalidateTag + Instant Rollback) and traffic is near-zero at launch.
- **Rollback:** Vercel → Deployments → Instant Rollback (one-click to a previous deployment). For schema, rollback is forward-only: ship a reverse migration (DB §5.6). Document this in the release checklist (§4.6).

### 8.4 Database branch strategy (summary decision)

- **MVP:** single production DB + single staging DB, forward-only migrations via CLI. No DB branches until Pro.
- **On Pro:** enable database branching for PRs; keep a dedicated `main`/`production` branch as the only branch CI `db push` targets; never push migrations to a branch that is not the production branch.
- **Never:** hand-editing schema in the dashboard SQL editor for DDL; `db push` to production from a laptop with a stale migration list (CI is the only pusher in the runbook, §4.3).

---

## 9. Cost & Scaling Notes

### 9.1 Vercel — Hobby vs Pro (for this storefront)
CapabilityHobby (free)Pro ($20/mo)Chocolate Zone needServerless functions✓ (pinned `iad1`)✓ + selectable regions (`bom1`)Hobby OK; Pro for Mumbai pairingISR on-demand `revalidateTag`✓✓✓ on Hobby (this is the whole storefront-update model)Time-based ISR floor60 s1 sNot used for freshness (on-demand tag is primary)Bandwidth100 GB/mo1 TB/moShop uses a few GB/mo — Hobby fineFunction invocations100k/day400k/dayShop: hundreds/day — Hobby fineProtected previews, log drains, WAF, native rate limiting—✓Deferred; only if traffic/compliance demandsCustom domain + SSL✓✓✓ Hobby**Verdict: Hobby is correct for MVP.** The storefront's near-instant update requirement rides on on-demand ISR, which Hobby supports. The only Hobby pain points (fixed `iad1`, 60-s revalidate floor) do not bite at this scale.

### 9.2 Supabase — Free vs Pro
CapabilityFreePro ($25/mo)Chocolate Zone needDB size500 MB8 GBMenu data is ~KB — Free plentyStorage1 GB100 GBShop images ~tens of MB — Free plentyBandwidth5 GB/mo250 GB/moShop images ~1–2 GB/mo — Free OK, watch itDaily backups✓ (7 days)✓ (7 days)✓ both**PITR**✗✓**Pro only** — the safety net for bad migrations/DELEETEs**Custom domain for Auth/Storage**✗✓Pro only — needed to move off `*.supabase.co` URL**IP allow-listing**✗✓Pro only — lock admin/storage access**Auto-pause after 7 days idle****Yes (project pauses)**No**The #1 reason to go Pro** — a paused shop = closed storefrontDatabase branches (Preview)✗✓Pro only — clean per-PR DBs**Verdict: start Free, move to Pro at (or shortly after) go-live.** The killer argument is **auto-pause**: a free Supabase project pauses after 7 days of inactivity — for a shop that's open but quiet, the storefront silently dies. Combined with PITR, IP allow-listing, and custom domain, **Pro is the recommended production tier from day one of live traffic** (~$25/mo ≈ the price of a couple of desserts). Keep Free only for staging/preview.

### 9.3 When to upgrade
TriggerUpgradeShop goes live / first real trafficSupabase **Pro** (kill auto-pause, get PITR)Custom domain wants Supabase-branded URLs cleaned (optional)Pro custom domain for storage/authStorefront moves to Mumbai / founders report regional latencyVercel **Pro** + recreate Supabase in Mumbai (`bom1`)Attack traffic / bot noise appearsVercel **Pro** + WAFTeam > 1 developer, want clean PR DBsSupabase Pro **database branches**
### 9.4 Expected baseline usage (single small dessert shop)

- **Traffic:** 100–500 storefront sessions/day; a few dozen checkouts/day at peak. Each session = a handful of RSC reads (ISR-cached after the first render) + one `/api/catalog` fetch (cached) + occasional `/api/checkout/whatsapp`.
- **Vercel:** tens of thousands of function invocations/month of a ~100k/day budget; a few GB bandwidth of 100 GB. No capacity concern for years.
- **Supabase:** DB storage in the KB range; storage tens of MB; bandwidth dominated by image serving — if it ever approaches 5 GB/mo on Free, move images to the CDN/optimizer and/or upgrade Pro.
- **Upstash:** rate-limit calls = a few hundred/day — trivially inside the free tier (10k commands/day).
- **Plausible:** one site; cloud plan ~$9/mo (or self-host). ~1–5k pageviews/mo.
- **Total MVP monthly (live):** ≈ Vercel $0 + Supabase Pro $25 + Plausible ~$9 + Upstash $0 ≈ **$34/mo** (or ≈ $0–9/mo on Free+free-tiers before go-live). This is the honest number to put in the founder's budget.

---

## 10. "Deploy from Zero" Runbook (solo founder, numbered)
Assumes: a GitHub repo `chocolate-zone` exists with the app code, `supabase/migrations/0001_init.sql`, `0002_seed.sql`, `0003_*_backup_role.sql`, `supabase/seed.sql`, `next.config.ts`, and a committed `.env.example`.

1. **Create the Supabase project.**

- supabase.com → New project → name `chocolate-zone-prod`, pick **East US (N. Virginia)** on Free (or **Mumbai** if already going Pro), set a strong DB password, record the **project ref** (`https://<ref>.supabase.co`).
- Immediately enable **PITR** if Pro: Dashboard → Database → Backups → Enable PITR.
2. **Create the local + staging projects (optional but recommended).**

- `chocolate-zone-staging` for previews/CI (Free tier is fine). Note both refs and keys.
3. **Install Supabase CLI and link locally.**

- `npm i -g supabase` → `supabase login` (Personal Access Token) → `supabase link --project-ref <prod-ref>` (or staging ref) with the DB password.
4. **Create the Upstash Redis store** (rate limiting). Upstash → Create Database (region: same as Vercel `iad1` for MVP) → copy REST URL + token. Leave free tier.
5. **Enable Sentry (optional).** Create a project, copy the DSN.
6. **Set up Plausible.** Add the site (`chocolate-zone.com` domain) in Plausible; copy the site identifier.
7. **Create the Vercel project.**

- vercel.com → New → Import Git → select the repo → **Framework: Next.js**, root `/`, install `npm ci`, build `npm run build`.
- Skip "Environment Variables" at creation if you prefer the settings UI; otherwise add them now (from §3 table, Production scope).
8. **Set all environment variables in Vercel** (Project → Settings → Environment Variables). Add each var from §3.1 for **Production**, **Preview**, **Development** scopes. Mark `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN` as **Sensitive**. Preview gets staging-project values; Development gets local values (or use `vercel env pull`).
9. **Set the CI secrets in GitHub** (Settings → Secrets and variables → Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` (staging), `BACKUP_DATABASE_URL` (read-only role, §6.2), and the four public Supabase/site vars for the `quality` build job. Commit `.github/workflows/ci.yml` (and `backup.yml`).
10. **Run migrations.**

- `supabase db push --linked` against staging first; then repeat for production (`supabase link --project-ref <prod-ref>` → `supabase db push`). Verify `supabase migration list` shows `0001`, `0002`, `0003` applied.
- Generate and commit types: `supabase gen types typescript --project-id <prod-ref> --schema public > src/types/supabase.ts`.
11. **Seed.**

- Staging/prod: the seed rides in as migration `0002_seed.sql`, so it is already applied by `db push`. For the prod project, confirm the demo menu exists: `supabase db seed --linked` if the seed is a separate `seed.sql`, or verify via the dashboard's Table Editor / `select count(*) from products`.
- Configure **shop settings** row in the dashboard (brand, WhatsApp number, timings, delivery settings) — this is data, not DDL, edited by the founder in the admin UI after login.
12. **Create the admin identity.**

- Verify `ADMIN_EMAIL` matches the owner's email (it gates who may sign in, `07-auth.md` §2.1). Create the admin user's Supabase auth record (or rely on the app's first magic-link flow with `is_admin` metadata — Auth §2.6) and set the magic-link `site_url` in the Supabase Auth provider config to the production URL (§8 of `06-supabase.md`; the DevOps owner wires the final origin per §2.3).
13. **Deploy production.**

- Push `main` → GitHub Actions runs quality/db/e2e → Vercel builds and deploys production → Vercel posts "Production Deployment Ready" with the URL.
- Add the **custom domain** (Settings → Domains) and update `NEXT_PUBLIC_SITE_URL` to it; redeploy so the magic-link origin uses the custom domain.
14. **Verify the storefront.**

- Open the production URL on a phone: storefront renders within 2 s (LCP target), catalog images load (check `next/image` + `remotePatterns`), add to cart → checkout → the pre-filled WhatsApp deep link opens with the correct message and totals (DoD).
- `curl -sI https://<domain>/` — confirm security headers (§7.2) and 200.
15. **Verify the admin.**

- Visit `/admin/login` → enter `ADMIN_EMAIL` → click the magic link in the mailbox → land on `/admin/dashboard`. Edit a product → confirm the storefront reflects it within seconds (`revalidateTag('catalog')`). Confirm a signed-upload image round-trips into Storage and renders.
16. **Enable backups & monitoring.**

- Confirm PITR on (§6.1). Push `.github/workflows/backup.yml` (daily `pg_dump` → private storage, §6.2). Set up UptimeRobot on `https://<domain>/api/health`, Sentry alerts, and Plausible live-event check (§5).
17. **Run the first restore drill** (§6.4) within 2 weeks — restore the dump into a scratch project, verify, record it.
18. **Schedule the first release.** Tag `v1.0.0`; log the go-live date, plan tier, and the $34/mo baseline in `docs/operations/runbook.md`.
**Go/no-go gate:** steps 14–15 pass (storefront under 2 s, admin CRUD live, WhatsApp link correct), PITR on, first backup succeeded, security headers verified, and a successful checkout opens WhatsApp. Then it's live.

---

## 11. Inputs Needed (from other agents)
InputOwnerNeeded forStatusExact migration filenames & ordering (`0001_init.sql`, `0002_seed.sql`, `0003_backup_role.sql`)Database EngineerCI `db push`, runbook step 10Available (`05-database.md` §5)`backup_reader` role DDL + connection string formatDatabase Engineer`BACKUP_DATABASE_URL` secret, backup jobAvailable (§7.3)`ADMIN_EMAIL` authoritative value + `is_admin` metadata contractAuthentication Specialistenv var, admin bootstrap step 12Available (`07-auth.md` §2.1)Exact `NEXT_PUBLIC_SITE_URL` usage & callback path (`/auth/callback`)Authentication Specialistenv var correctness per environmentAvailable (§2.1)Final env var contract + region pairing tableSupabase Expert§2.2, §3.1, runbook steps 1/8Available (`06-supabase.md` §1.1, §2)Rate-limit store decision (Upstash URL/token var names)Backend Engineer`UPSTASH_REDIS_REST_URL`/`_TOKEN` env varsAvailable (`04-backend-api.md` §10)Baseline Plausible event list + props (no PII)Product ManagerPlausible setup §5.3Available (`01-pm-prd.md` §7)`next/image` `remotePatterns` shape (exact storage host)Frontend / Supabase Expert§7.5 configAvailable (`03-frontend-architecture.md` §10.2)Playwright e2e spec & CI expectationsQA Engineere2e job §4.4Pending (QA deliverable `10-qa.md`)Package manager decision (npm vs pnpm) + `package.json` scriptsFrontend DeveloperCI workflow commandsPending (no app repo yet)Exact shop region target (Mumbai vs N. Virginia default)Founder/PMSupabase region + function pairing**Required before step 1**
## 12. Deferred

- **Vercel Pro + WAF + native rate limiting** — only when attack traffic or compliance demands (§7.3/7.4).
- **Mumbai (`bom1`) region move** — a deliberate, pre-traffic migration once both sides are on paid plans (§2.2).
- **Supabase database branches per PR** — on Pro, replaces shared staging DB for previews (§8.2).
- **Strict nonce-based CSP** — current CSP uses `'unsafe-inline'` for styles (Framer Motion); tightening is a post-MVP hardening pass (§7.2).
- **Log drains (Axiom/Datadog)** — Pro feature; Vercel in-product logs suffice for a few hundred requests/day (§5.1).
- **Server-side Plausible events from the checkout route** — kept client-side by design to guarantee no PII in analytics (§5.3); revisit only if AOV accuracy demands server attribution.
- **Monthly long-term backup archive** (keep 1/year) — optional, founder's call (§6.3).
- **Sentry** — optional per locked model; if declined, Vercel logs + health check are the minimum (§5.2).

## 13. Compliance & Reference Map

- **Locked contract:** `docs/ARCHITECTURE.md` §10 (Deployment), §11 (DevOps lane), §12 (DoD).
- **DB Engineer:** `docs/deliverables/05-database.md` §5 (migration plan), §7 (backup strategy), §13 (flags).
- **Supabase Expert:** `docs/deliverables/06-supabase.md` §1.1 (region), §2 (env contract), §5 (storage/remotePatterns), §7 (CLI workflow).
- **Authentication Specialist:** `docs/deliverables/07-auth.md` §2.1 (env), §3 (rate limiting), §7 (provider config).
- **Backend:** `docs/deliverables/04-backend-api.md` §10 (rate limiting), §9 (caching).
- **Product Manager:** `docs/deliverables/01-pm-prd.md` §7 (KPIs/analytics), §5.2 (Ops/DevOps responsibilities).
- **Frontend:** `docs/deliverables/03-frontend-architecture.md` §10.2 (remotePatterns).
- **Compliance flags raised:** (a) Supabase Free auto-pause is a silent-production-outage risk — recommend Pro at go-live (§9.2); (b) Hobby ISR 60-s `revalidate` floor — the codebase must rely on on-demand `revalidateTag('catalog')`, which works on Hobby (§7.1); (c) `NEXT_PUBLIC_SITE_URL` must be per-environment exact or magic links break (§2.3/§3.3).

