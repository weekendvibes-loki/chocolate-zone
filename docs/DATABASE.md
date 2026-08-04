# Chocolate Zone — Database Design Specification
**Owner:** Database Engineer · **Status:** Draft v1 (implementation-ready) · **Audience:** Supabase Expert, Backend Developer, DevOps Engineer, QA, PM
**Locked contract:** `docs/ARCHITECTURE.md` (v1). This document implements §5 (data model) exactly — table names, columns, semantics. It extends underspecified detail (indexes, RLS mechanics, migrations, seeds, backups) and never contradicts the locked model. Where a locked choice was ambiguous, the decision is flagged in §13, never silently changed.

---

## 0. Reading Guide
SectionWhat it contains1Conventions: money, identity, timestamps, JSONB shapes2Full DDL (5 tables + `set_updated_at` trigger)3Indexes (with rationale, incl. partial active indexes)4Row Level Security (anon SELECT contract + REVOKE hardening)5Migration plan (Supabase CLI, local + CI, rollback)6Seed script (realistic Chocolate Zone data)7Backup strategy (PITR + scheduled pg_dump + restore)8Data-integrity & soft-delete strategy9Performance notes (row estimates, V2 search, N+1)10Reference: full `supabase/seed.sql`11Inputs needed (from other agents)12Deferred13Compliance flags
---

## 1. Conventions

### 1.1 Money

- All monetary columns are Postgres `numeric(10,2)`, exactly as the Backend expects (`numeric` arrives over PostgREST as a string, converted at the boundary — see Backend §1.2/§2).
- **Range:** supports ₹0.00 to ₹99,999,999.99. Base prices, deltas, delivery fees and fixed discounts all satisfy `>= 0`.
- **Fixed discount **`discount_value`** semantics** (flagged, not silently chosen): treated by the Backend as **per item, capped at the line total** (Backend §5.2, PM assumption). DB stores the raw amount; stacking policy lives in the Backend. `percentage` discounts are stored as percent (`10` = 10%), with a cross-field check `discount_value <= 100`.

### 1.2 Identity

- All PKs are `uuid`, default `gen_random_uuid()` (built into Postgres ≥ 13; no extension dependency beyond `pgcrypto` for safety on older branches).
- `shop_settings` is a singleton: `id` fixed to `'00000000-0000-0000-0000-000000000001'` with a `CHECK (id = ...)` so a second row is physically impossible.
- No numeric sequences anywhere → no sequence grants needed, nothing to leak row counts, nothing to reseed.

### 1.3 Timestamps

- `created_at timestamptz NOT NULL DEFAULT now()` and `updated_at timestamptz NOT NULL DEFAULT now()` on every table.
- `updated_at` is maintained by a single shared trigger function `set_updated_at()` (see §2.6) — the Backend never sets it manually.

### 1.4 JSONB shapes (confirming Backend §13 ask)

- `shop_settings.theme` — free-form app-config jsonb (validated app-side). MVP shape:

```
{ "accent": "gold", "density": "cozy" }
```
- `shop_settings.timings` — array of `TimingRule` (matches Backend `types/domain.ts`):

```
[
  { "day": "all", "open": "10:00", "close": "21:00", "closed": false }
]
```
`day` is `0`–`6` (0 = Sunday) or `"all"`; `open`/`close` are `"HH:MM"`; `closed: true` marks a closed day. Unlisted days default to closed. Display/open-state math is the Backend's job; the DB stores the raw rules.

### 1.5 Naming

- Tables and columns are `snake_case`, lowercase, exactly as locked in ARCHITECTURE §5.
- Index names: `idx_<table>_<purpose>`; constraints use Postgres default names where they are clear (`categories_slug_key`).
- Migrations: `supabase/migrations/0001_init.sql`, `0002_seed.sql` (see §5).

---

## 2. Full DDL (`supabase/migrations/0001_init.sql`)

> Copy-paste ready. Create the file with this exact content. Everything below is **additive** to ARCHITECTURE §5 — the locked columns appear verbatim; only constraints, defaults and comments are added.

```
-- =====================================================================
-- Chocolate Zone — schema init (migration 0001)
-- Owned by: Database Engineer. Do not edit without a DB change ticket.
-- =====================================================================

begin;

-- gen_random_uuid() is built into PG >= 13; pgcrypto kept for safety.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- shop_settings (singleton row id = '...001')
-- ---------------------------------------------------------------------
create table shop_settings (
    id                    uuid primary key default gen_random_uuid(),
    brand                 text not null,
    logo                  text,
    theme                 jsonb not null default '{}'::jsonb,
    currency              text not null default 'INR'
                          check (currency ~ '^[A-Z]{3}$'),
    whatsapp_number       text not null
                          check (whatsapp_number ~ '^[0-9]{10,15}$'),
    address               text,
    timings               jsonb not null default '[]'::jsonb,
    delivery_fee          numeric(10,2) not null default 0
                          check (delivery_fee >= 0),
    free_delivery_threshold numeric(10,2)
                          check (free_delivery_threshold is null or free_delivery_threshold >= 0),
    delivery_enabled      boolean not null default true,
    pickup_enabled        boolean not null default true,
    is_open               boolean not null default true,
    ordering_enabled      boolean not null default true,
    announcement          text,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),

    -- single-row guard: only the fixed uuid may ever exist
    check (id = '00000000-0000-0000-0000-000000000001')
);

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table categories (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    slug        text not null unique,          -- unique index auto-created
    emoji       text,
    image_url   text,
    sort_order  integer not null default 0 check (sort_order >= 0),
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
create table products (
    id           uuid primary key default gen_random_uuid(),
    category_id  uuid not null references categories (id)
                 on delete restrict,           -- cannot delete category with products
    name         text not null,
    description  text,
    base_price   numeric(10,2) not null check (base_price >= 0),
    image_url    text,
    is_featured  boolean not null default false,
    is_veg       boolean,
    stock_qty    integer check (stock_qty is null or stock_qty >= 0),  -- null = unlimited
    sort_order   integer not null default 0 check (sort_order >= 0),
    is_active    boolean not null default true,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------
create table product_variants (
    id          uuid primary key default gen_random_uuid(),
    product_id  uuid not null references products (id)
                on delete cascade,             -- deleting a product removes its variants
    name        text not null,                 -- group label, e.g. 'Size'
    option      text not null,                 -- e.g. 'Large'
    price_delta numeric(10,2) not null default 0 check (price_delta >= 0),
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),

    -- no duplicate option within a group
    unique (product_id, name, option)
);

-- ---------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------
create table offers (
    id              uuid primary key default gen_random_uuid(),
    title           text not null,
    description     text,
    image_url       text,
    discount_type   text not null check (discount_type in ('percentage', 'fixed')),
    discount_value  numeric(10,2) not null check (discount_value >= 0),
    applies_to_all  boolean not null default false,
    starts_at       timestamptz,               -- null = active from now
    ends_at         timestamptz,               -- null = never expires
    is_active       boolean not null default true,
    sort_order      integer not null default 0 check (sort_order >= 0),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    -- a percentage discount can never exceed 100
    check (discount_type <> 'percentage' or discount_value <= 100),
    -- sane date window
    check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

-- ---------------------------------------------------------------------
-- offer_products (M2M)
-- ---------------------------------------------------------------------
create table offer_products (
    offer_id   uuid not null references offers (id) on delete cascade,
    product_id uuid not null references products (id) on delete cascade,
    primary key (offer_id, product_id)
);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

create trigger trg_categories_updated_at before update on categories
    for each row execute function set_updated_at();
create trigger trg_products_updated_at before update on products
    for each row execute function set_updated_at();
create trigger trg_product_variants_updated_at before update on product_variants
    for each row execute function set_updated_at();
create trigger trg_offers_updated_at before update on offers
    for each row execute function set_updated_at();
create trigger trg_shop_settings_updated_at before update on shop_settings
    for each row execute function set_updated_at();

commit;
```

---

## 3. Indexes
`supabase/migrations/0001_init.sql` continues:

```
begin;

-- unique slug (auto-index from the UNIQUE constraint; listed for explicitness)
-- categories(slug) is used by every category deep-link and by admin slug
-- validation, so it must be unique AND indexed:
--   create unique index categories_slug_key on categories (slug);  -- (created by unique constraint)

-- categories: storefront chips = active, sorted
create index idx_categories_active_sort
    on categories (sort_order)
    where is_active;

-- products: FK lookup / admin "products in category" lists
create index idx_products_category_id
    on products (category_id);

-- products: storefront grid = active products grouped by category, sorted
create index idx_products_active_cat_sort
    on products (category_id, sort_order)
    where is_active;

-- products: hero/featured rail = active + featured, sorted
create index idx_products_active_featured
    on products (sort_order)
    where is_active and is_featured;

-- product_variants: FK lookup, and variant read per product (product detail)
create index idx_product_variants_product_id
    on product_variants (product_id);

-- product_variants: storefront only needs active variants
create index idx_product_variants_active
    on product_variants (product_id)
    where is_active;

-- offers: storefront offers rail = active, sorted.
-- NOTE: the time-window predicate (starts_at <= now() <= ends_at) cannot be a
-- partial-index predicate because now() is volatile; it is evaluated in the
-- WHERE clause instead. At catalog scale (~3 offers) this is free.
create index idx_offers_active_sort
    on offers (sort_order)
    where is_active;

-- offer_products: PK (offer_id, product_id) auto-indexes offer lookups
-- (admin replaces M2M rows per offer: delete-then-insert by offer_id).
-- The reverse direction serves checkout best-offer resolution per product:
create index idx_offer_products_product_id
    on offer_products (product_id);

commit;
```

### 3.1 Why each index exists
IndexServesVolume todayGrowth plan`categories_slug_key` (unique)Deep-links `?cat=<slug>` / `category/[slug]`, admin slug-taken checks5 rowsKeep unique forever; slug is the public identity`idx_categories_active_sort`Storefront chips, ordered5 rows20–40 rows ceiling; negligible`idx_products_category_id`FK constraint checks on `categories` update/delete, admin per-category lists (incl. inactive)15 rowsNeeded whenever `categories` rows are updated — FK checks must scan this index`idx_products_active_cat_sort`Storefront grid grouped by category15 rows300–500 products: still trivial; composite partial keeps the whole grid on one index scan`idx_products_active_featured`Hero rail~4 rows1 index scan regardless of catalog size`idx_product_variants_product_id`FK checks + variant read per product~7 rowsVariant counts are the fastest-growing table (options×sizes); per-product lookup is the hot path`idx_product_variants_active`Storefront only ships active variants~7 rowsHalves the rows the storefront aggregate touches`idx_offers_active_sort`Storefront offers rail3 rowsAdmin may grow a dozen active/paused offers; is_active filter keeps inactive ones out`idx_offer_products_product_id`Checkout `best offer for product` (reverse M2M)~6 rowsScales with products×offers; without it every best-offer lookup is a seq scan

### 3.2 Low-read-volume reality
The storefront is SSR + ISR and reads through `unstable_cache(..., tags: ['catalog'], revalidate: 60)` plus `revalidateTag('catalog')` on every admin mutation (ARCHITECTURE §3, Backend §9). The database therefore sees **single-digit reads per minute in steady state**, not per-page-view. The indexes above are not bought for today's load — they are bought so that:

1. admin mutations (which invalidate the cache and can hit at checkout peak) never trigger a seq scan on a hot table,
2. FK constraint checks (`on delete restrict`/`on update`) never scan tables to find referencing rows,
3. the schema does not need an index migration before V2 scale.
At this size the only index with real runtime cost is `idx_products_active_cat_sort` (one extra row per product on the `products` heap). That is acceptable and worth the planner safety.

---

## 4. Row Level Security

### 4.1 The security model (why)

- **Public storefront reads** use the anon key → PostgREST → `anon` role → RLS SELECT policies. The storefront must only ever see *active, currently-saleable* rows.
- **All writes** (admin CRUD) happen server-side with the **service role**, which has `BYPASSRLS` — RLS never filters, and never blocks, service-role writes. Admin Route Handlers are the real guard (Backend §1.3); RLS is the data-layer guarantee that no misconfiguration of the *client* key can ever mutate rows.
- `authenticated` is granted SELECT too, because when an admin is logged in, `@supabase/ssr` server clients send the user's JWT → requests arrive as `authenticated`. If that role had no SELECT, a logged-in admin browsing the storefront would see an empty catalog. It still has **no write privileges**.
- The RLS WHERE filters below are the **contract** the Supabase Expert verifies and the Backend relies on. They are the exact baseline filters (active products/categories, active offers within their start/end window) plus the defense-in-depth joins documented inline.

### 4.2 Policies (`0001_init.sql`, continued)

```
begin;

-- ===================== shop_settings =====================
alter table shop_settings enable row level security;

create policy "shop_settings_select"
    on shop_settings for select to anon, authenticated
    using (true);
-- Single row, always public. is_open / ordering_enabled are read by the
-- Backend to decide storefront state; the row must be visible even when
-- closed (the storefront still renders, ordering is disabled app-side).

-- ===================== categories =====================
alter table categories enable row level security;

create policy "categories_select_active"
    on categories for select to anon, authenticated
    using (is_active = true);

-- ===================== products =====================
alter table products enable row level security;

create policy "products_select_active"
    on products for select to anon, authenticated
    using (
        is_active = true
        and exists (
            select 1 from categories c
            where c.id = products.category_id and c.is_active = true
        )
    );
-- Defense-in-depth: a product must never leak if its category is hidden.

-- ===================== product_variants =====================
alter table product_variants enable row level security;

create policy "product_variants_select_active"
    on product_variants for select to anon, authenticated
    using (
        is_active = true
        and exists (
            select 1 from products p
            where p.id = product_variants.product_id and p.is_active = true
        )
    );
-- Variants of a hidden product are unreachable; kept airtight anyway.

-- ===================== offers =====================
alter table offers enable row level security;

create policy "offers_select_active"
    on offers for select to anon, authenticated
    using (
        is_active = true
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
    );
-- The baseline offer filter: active AND inside the start/end window.
-- now() is evaluated per request; because the catalog is cached for 60s,
-- an offer expiring mid-cache-life degrades gracefully (cache revalidates).

-- ===================== offer_products =====================
alter table offer_products enable row level security;

create policy "offer_products_select_visible"
    on offer_products for select to anon, authenticated
    using (
        exists (
            select 1 from offers o
            where o.id = offer_products.offer_id
              and o.is_active = true
              and (o.starts_at is null or o.starts_at <= now())
              and (o.ends_at is null or o.ends_at >= now())
        )
        and exists (
            select 1 from products p
            where p.id = offer_products.product_id and p.is_active = true
        )
    );
-- Anon may only see M2M links whose offer is currently live AND whose
-- product is currently on sale. Stale / future offers never leak products.

commit;
```

### 4.3 Privilege hardening (defense in depth, `0001_init.sql`, continued)

```
begin;

-- Writes are STRICTLY service-role-only. Strip write privileges from the
-- two client-facing roles at the privilege level (belt-and-braces on top of
-- the fact that they only hold SELECT policies).
revoke all on table shop_settings from anon, authenticated;
revoke all on table categories from anon, authenticated;
revoke all on table products from anon, authenticated;
revoke all on table product_variants from anon, authenticated;
revoke all on table offers from anon, authenticated;
revoke all on table offer_products from anon, authenticated;

-- Re-grant exactly what the storefront needs: SELECT only.
grant select on shop_settings to anon, authenticated;
grant select on categories to anon, authenticated;
grant select on products to anon, authenticated;
grant select on product_variants to anon, authenticated;
grant select on offers to anon, authenticated;
grant select on offer_products to anon, authenticated;

-- service_role retains full privileges via Supabase defaults and BYPASSRLS.
-- postgres (migration owner) retains full privileges.

-- Sequences: none exist (uuid PKs), so there is nothing to lock down here.

commit;
```

### 4.4 Guarantees this gives the Backend
Backend useRoleGuarantee`GET /api/catalog`, `GET /api/products/[id]`, checkout readsanon (or authenticated)Only active categories, products of active categories, active variants, offers active AND within window, M2M links only when both ends visible. **Zero writes possible** at the privilege layer.Admin CRUD (`/api/admin/*`)service roleBypasses RLS; full DML. Guarded by session verification in handlers (Backend §11).
> **Verification checklist for the Supabase Expert:** (1) `anon` `INSERT`/`UPDATE`/`DELETE` on any table → `permission denied` before RLS is even consulted; (2) `anon` `SELECT` on `products` with `is_active=false` or an inactive parent category → 0 rows; (3) `anon` `SELECT` on `offers` outside the window → 0 rows; (4) `service_role` `UPDATE` still works everywhere; (5) logged-in admin (`authenticated`) can still read the catalog.

---

## 5. Migration Plan (Supabase CLI)

### 5.1 Repository layout

```
supabase/
├── config.toml            # generated by `supabase init`
├── migrations/
│   ├── 0001_init.sql      # schema + triggers + indexes + RLS + revokes (§2–§4)
│   └── 0002_seed.sql      # demo data (or rely on supabase/seed.sql, see 5.5)
└── seed.sql               # optional: auto-run seed for local/CI demo
```

### 5.2 Naming convention

- Sequential numeric prefix + `snake_case` purpose: `0001_init.sql`, `0002_seed.sql`. Lexical order == apply order.
- (Supabase CLI's `supabase migration new <name>` emits a `YYYYMMDDHHMMSS_<name>.sql` timestamp prefix — equally valid; the team standard is the `NNNN_` form because it reads cleanly in a file listing. Either is fine as long as ordering is preserved.)
- One logical change per migration. Never edit an already-applied migration; add a new one.

### 5.3 Apply locally

```
# one-time
supabase init
supabase link --project-ref <ref>        # only needed if you push to remote from CLI

# start local Postgres + run all migrations (0001, 0002)
supabase start

# apply migrations to the local DB (idempotent equivalent of db push)
supabase db reset                         # drops + recreates from migrations, then runs seed.sql
```

### 5.4 Apply in CI / to staging / prod

```
supabase link --project-ref <ref> --workflow
supabase db push                          # applies pending migrations to the linked DB
supabase db lint                          # runs pg-meta lint; fail the job on errors
supabase migration list                   # verify applied/pending status in the pipeline log
```
Recommended CI pipeline (DevOps owns the runner):

1. `supabase db lint` (static check, no DB)
2. `supabase db push` (idempotent; safe to run on every commit — pending migrations only)
3. `supabase db seed --local` in a throwaway local stack for a full-integration smoke test of the seed
4. Optionally diff the deployed schema: `supabase db diff --linked` and fail on drift

### 5.5 Seeding strategy

- **Dev/demo default:** `supabase/seed.sql` — the CLI runs it automatically on `supabase db reset` and `supabase start`. Best for local + preview environments.
- **Deterministic demo data in prod (optional):** keep the seed as `0002_seed.sql` (a real migration) so a fresh staging/prod database gets demo data from migrations alone. Because the seed uses fixed, conflict-safe statements where sensible, running it twice is harmless.
- Recommendation for this repo: `0002_seed.sql`** as a migration**, so preview/staging deployments come up with a working menu without a separate seeding step. The seed content is §6/§10.

### 5.6 Rollback

- **Supabase CLI is forward-only** — there is no `db rollback`/down migration. This is intentional and normal for Postgres shops.
- To revert a released change, ship a **new** migration that reverses it (e.g., `0003_drop_column_x.sql`).
- If a migration is partially applied and fails mid-transaction: every migration file in this repo is wrapped in a single `begin; ... commit;` so a failure rolls back atomically and the migration is never marked applied. Fix the SQL, then re-run `supabase db push`.
- For emergency point-in-time restore, see §7.

---

## 6. Seed Script — realistic Chocolate Zone data
Full file: `supabase/migrations/0002_seed.sql` (copy-paste ready — also mirrored in §10 as `supabase/seed.sql`).

Design choices:

- **Categories:** Waffles, Brownies, Cakes, Chocolates, Beverages (the 5 locked category families, ARCHITECTURE §1).
- **Products:** 14 total across the 5 categories, INR prices stored as `numeric(10,2)` (₹149.00 … ₹599.00). `stock_qty = null` = unlimited for everything except the two items that carry real stock limits.
- **Variants:** on 2 products — Classic Belgian Waffle gets **Size** (Regular / Large), Chocolate Overload Waffle gets **Topping** (Extra Chocolate / Caramel Drizzle / Nutella). Exactly matches the "sizes and toppings" requirement.
- **Offers:** 3 —

1. **Weekend Wonder** — 10% percentage, `applies_to_all=true`, no window (evergreen).
2. **Brownie + Coffee Duo** — fixed ₹50, `applies_to_all=false`, scoped via `offer_products` to Double Dark Brownie + Cold Coffee.
3. **Midnight Cravings** — 15% percentage, `applies_to_all=true`, time-windowed (`starts_at`/`ends_at`; the window below starts 18:00 on the seed day and ends 30 days later).
- The seed uses CTEs with `returning` so `offer_products` references products by `slug`-derived lookup, not hand-maintained uuids — it stays correct if names change.

```
-- =====================================================================
-- Chocolate Zone — demo seed (migration 0002)
-- =====================================================================
begin;

insert into shop_settings (
    id, brand, logo, theme, currency, whatsapp_number, address, timings,
    delivery_fee, free_delivery_threshold, delivery_enabled, pickup_enabled,
    is_open, ordering_enabled, announcement
) values (
    '00000000-0000-0000-0000-000000000001',
    'Chocolate Zone',
    null,
    '{"accent": "gold"}'::jsonb,
    'INR',
    '919876543210',
    '12, Chocolate Street, Bengaluru',
    '[{"day": "all", "open": "10:00", "close": "21:00", "closed": false}]'::jsonb,
    40.00,
    500.00,
    true, true, true, true,
    'Grand opening week — use code-free flat offers, now live!'
);

insert into categories (name, slug, emoji, sort_order, is_active) values
    ('Waffles',     'waffles',     '🧇', 10, true),
    ('Brownies',    'brownies',    '🍩', 20, true),
    ('Cakes',       'cakes',       '🧁', 30, true),
    ('Chocolates',  'chocolates',  '🍫', 40, true),
    ('Beverages',   'beverages',   '☕', 50, true);

with prods as (
    insert into products (
        category_id, name, description, base_price, is_featured, is_veg,
        stock_qty, sort_order, is_active
    ) values
        ((select id from categories where slug = 'waffles'),
            'Classic Belgian Waffle', 'Crisp golden waffle dusted with cocoa and maple drizzle.', 199.00, true, true, null, 10, true),
        ((select id from categories where slug = 'waffles'),
            'Chocolate Overload Waffle', 'Belgian waffle smothered in Belgian dark chocolate.', 249.00, true, null, null, 20, true),
        ((select id from categories where slug = 'brownies'),
            'Double Dark Brownie', 'Fudgy 70% cocoa brownie, warm and gooey in the middle.', 149.00, false, true, 40, 10, true),
        ((select id from categories where slug = 'brownies'),
            'Walnut Brownie', 'Classic fudge brownie loaded with toasted walnuts.', 169.00, false, true, null, 20, true),
        ((select id from categories where slug = 'brownies'),
            'Sizzling Brownie', 'Brownie on a sizzler with vanilla ice cream and hot fudge.', 249.00, true, null, 20, 30, true),
        ((select id from categories where slug = 'cakes'),
            'Chocolate Truffle Cake', 'Layers of moist chocolate sponge and ganache.', 499.00, true, true, null, 10, true),
        ((select id from categories where slug = 'cakes'),
            'Red Velvet Cake', 'Classic red velvet with cream-cheese frosting.', 549.00, false, null, null, 20, true),
        ((select id from categories where slug = 'cakes'),
            'Blueberry Cheesecake', 'Baked cheesecake over a blueberry swirl.', 599.00, false, null, null, 30, true),
        ((select id from categories where slug = 'chocolates'),
            'Assorted Choco Box', 'Handcrafted 12-piece box of truffles and pralines.', 349.00, false, true, null, 10, true),
        ((select id from categories where slug = 'chocolates'),
            'Choco Truffle Bites', 'Melt-in-the-mouth cocoa truffles, box of 8.', 299.00, false, true, null, 20, true),
        ((select id from categories where slug = 'chocolates'),
            'Dark Chocolate Bark', 'Slabs of 70% dark chocolate with almonds and sea salt.', 279.00, false, null, null, 30, true),
        ((select id from categories where slug = 'beverages'),
            'Hot Chocolate', 'Velvety hot chocolate with whipped cream.', 149.00, false, true, null, 10, true),
        ((select id from categories where slug = 'beverages'),
            'Cold Coffee', 'Frosty cold coffee blended to a silky shake.', 129.00, false, true, null, 20, true),
        ((select id from categories where slug = 'beverages'),
            'Chocolate Shake', 'Thick chocolate shake topped with cocoa crumble.', 179.00, false, true, null, 30, true)
    returning id, name
)
select 'products seeded', count(*) from prods;

insert into product_variants (product_id, name, option, price_delta, is_active)
select p.id, 'Size', 'Regular', 0.00, true
from products p where p.name = 'Classic Belgian Waffle';

insert into product_variants (product_id, name, option, price_delta, is_active)
select p.id, 'Size', 'Large', 60.00, true
from products p where p.name = 'Classic Belgian Waffle';

insert into product_variants (product_id, name, option, price_delta, is_active)
select p.id, 'Topping', 'Extra Chocolate', 50.00, true
from products p where p.name = 'Chocolate Overload Waffle';

insert into product_variants (product_id, name, option, price_delta, is_active)
select p.id, 'Topping', 'Caramel Drizzle', 40.00, true
from products p where p.name = 'Chocolate Overload Waffle';

insert into product_variants (product_id, name, option, price_delta, is_active)
select p.id, 'Topping', 'Nutella', 60.00, true
from products p where p.name = 'Chocolate Overload Waffle';

with offer1 as (
    insert into offers (title, description, discount_type, discount_value, applies_to_all, starts_at, ends_at, is_active, sort_order)
    values ('Weekend Wonder', 'Flat 10% off everything this weekend — and every weekend.', 'percentage', 10.00, true, null, null, true, 10)
    returning id
),
offer2 as (
    insert into offers (title, description, discount_type, discount_value, applies_to_all, starts_at, ends_at, is_active, sort_order)
    values ('Brownie + Coffee Duo', '₹50 off when you grab a brownie and a cold coffee together.', 'fixed', 50.00, false, null, null, true, 20)
    returning id
),
offer3 as (
    insert into offers (title, description, discount_type, discount_value, applies_to_all, starts_at, ends_at, is_active, sort_order)
    values ('Midnight Cravings', 'Late-night dessert run? 15% off every order after 6 PM.', 'percentage', 15.00, true, date_trunc('day', now()) + interval '18 hours', date_trunc('day', now()) + interval '30 days', true, 30)
    returning id
)
insert into offer_products (offer_id, product_id)
select o.id, p.id
from offer2 o
cross join products p
where p.name in ('Double Dark Brownie', 'Cold Coffee');

commit;
```

> The time-windowed offer's `starts_at`/`ends_at` are seeded relative to `now()` so the demo offer is always live on first seed. Admin edits the window in the dashboard afterwards.

---

## 7. Backup Strategy

### 7.1 Reality check
The database is tiny (5 tables, ~35 rows). It is the **source of truth for the menu** — losing it means rebuilding the catalog by hand, but it is *not* customer or order data. Backups are cheap, so do them properly anyway.

### 7.2 PITR (primary recovery)

- **Supabase PITR** (paid plan): continuous WAL archiving + daily snapshots. Enables restoring to any point in the last 7 days (plan-dependent).
- Enable in the dashboard: **Database → Backups → Enable PITR**. No extra work at migration time; it is a platform feature, owned by DevOps.
- Restore flow: dashboard → Backups → *Restore to a point in time* → creates a new read-only instance → verify → promote. This is the safety net for accidental destructive queries (e.g., a bad migration or a mis-issued `DELETE`).

### 7.3 Scheduled `pg_dump` (portable, off-platform)

- Weekly logical dump for cheap off-platform copies. All tables are tiny; the dump is a few KB.
- Credentials: use a **read-only role** created via the dashboard or a dedicated migration, never the service role key in cron:

```
-- migration 0003 (owner: DB Engineer, applied by DevOps)
begin;
create role backup_reader with login password '<secret-from-vault>' nosuperuser nocreatedb nocreaterole;
grant usage on schema public to backup_reader;
grant select on all tables in schema public to backup_reader;
alter default privileges in schema public grant select on tables to backup_reader;
commit;
```

- Cron job (off-server, e.g. GitHub Actions scheduled or a managed cron) every Sunday 02:00:

```
pg_dump \
  "postgresql://backup_reader:<secret>@<db-host>.supabase.co:5432/postgres" \
  --schema=public --format=plain --no-owner --no-privileges \
  | gzip > chocolate-zone-$(date +%F).sql.gz
```

> Note: `pg_dump` from `backup_reader` won't see tables in other schemas (fine — we only own `public`). Supabase's hosted Postgres does not permit SSH or pg_dump to the file system on the instance; always run the dump from a separate runner.

### 7.4 Restore procedure

1. **PITR (point-in-time):** Dashboard → Backups → choose time → restore to new instance → run `supabase db push` on the new instance to ensure it matches the latest migration state → promote.
2. **Logical dump restore** (to a fresh Supabase project):

```
# target an empty database (or a fresh local stack via `supabase start`)
psql "postgresql://postgres:<pw>@<target-host>:5432/postgres" \
  < chocolate-zone-2026-08-11.sql.gz
```

Because the dump contains only `public` schema data + DDL, it restores cleanly onto a new project. **Ordering matters:** restore the most recent migration-compatible dump first, then `supabase db push` to catch any migrations added after the dump.
3. **Verify:** `select count(*)` per table, spot-check `shop_settings` id = `'...001'`, check RLS policies exist (`select * from pg_policies`), then smoke-test `GET /api/catalog`.

### 7.5 RPO / RTO

- PITR: RPO ~1 min, RTO ~1 hr (platform).
- Weekly dump: RPO ≤ 7 days, RTO ~10 min. It exists for off-platform durability and cross-project portability, not for fast recovery.

---

## 8. Data-Integrity & Soft-Delete Strategy

### 8.1 `is_active` flags are the default "delete"
Every mutable entity carries `is_active` (`categories`, `products`, `product_variants`, `offers`). The storefront and RLS only ever expose active rows, so **deactivation is indistinguishable from deletion to customers** while preserving history and FK integrity. This is the baseline behavior the Backend implements (Backend §7.2: `DELETE /api/admin/products` → `is_active=false`).

### 8.2 FK behaviors (locked by DDL §2)
FKON DELETEWhy`products.category_id → categories(id)`**RESTRICT**A category with products **cannot** be hard-deleted. Admin attempt → `23503` foreign_key_violation → Backend maps to `CATEGORY_IN_USE` (409) with "deactivate instead". This is the exact behavior the Backend specified (Backend §7.1, §13).`product_variants.product_id → products(id)`**CASCADE**A hard-deleted product takes its variants with it — variants are meaningless orphans.`offer_products.offer_id → offers(id)`**CASCADE**A hard-deleted offer drops its M2M rows.`offer_products.product_id → products(id)`**CASCADE**A hard-deleted product drops its offer links (safe: no orphans).`ON UPDATE` is the default `NO ACTION` — ids are immutable uuid PKs, so updates never cascade.

### 8.3 When is a hard delete safe?

- **Product:** safe when the admin explicitly hard-deletes (variants and offer_products cascade away). The Backend **soft-deletes by default** and the storefront never sees the row again. We keep `CASCADE` so that a deliberate hard delete never leaves orphans.
- **Category:** hard delete is **rejected while products exist** (RESTRICT). To remove a category, the admin first deactivates (or re-homes) its products. This prevents the classic "products pointing at a deleted category" bug and the silent category-history loss that soft-delete gives the admin.
- **Offer:** hard delete is safe (offer_products cascade). Backend soft-deletes offers by default too.

### 8.4 Guardrails added

- `check (stock_qty is null or stock_qty >= 0)` — null = unlimited, never negative inventory.
- `unique (product_id, name, option)` — no duplicate variant option inside one group.
- `check (discount_type <> 'percentage' or discount_value <= 100)` — a "120% off" offer is unrepresentable.
- `check (ends_at is null or starts_at is null or ends_at >= starts_at)` — no backwards windows.
- `check (id = '...001')` on `shop_settings` — the singleton cannot be duplicated by accident.
- `check (whatsapp_number ~ '^[0-9]{10,15}$')` — E.164 digits only, no formatting surprises in the wa.me builder.
- **No triggers** beyond `set_updated_at`; all business rules (best-offer, stacking, availability) live in the Backend pricing layer, so the DB stays a dumb, trustworthy store.

### 8.5 Deletion safety net
Because `pg_dump`/PITR cover disaster, and because every "delete" is either a flag flip or FK-guarded, there is **no **`TRUNCATE`** / bulk-delete path** exposed to any role other than the migration owner and service role. Additive migrations only (see §5.6).

---

## 9. Performance Notes

### 9.1 Row estimates at launch
TableRows`shop_settings`1`categories`5`products`~14`product_variants`~7`offers`3`offer_products`~6Even at 10× growth (150 products, 70 variants) the whole catalog fits in a single 8 KB page or two. **There is no real index-driven hot path today**; the storefront's cache absorbs the read traffic (Backend §9). The schema is built for correctness and admin-edit safety, with the indexes in §3 bought for the FK checks and the V2 curve.

### 9.2 The catalog aggregate — no N+1
The storefront needs shop settings + active categories + active products + active variants + active offers + offer_products in one request (`GET /api/catalog`). With RLS filtering active rows, the Backend runs **6 small SELECTs** (one per table, no per-row loops) and joins in memory — deterministic, cache-friendly, and trivially parallelizable. The `WHERE is_active` partial indexes make each of those SELECTs a single index range scan. There is deliberately **no** SQL `JOIN` aggregate view or Postgres function: a hand-rolled `UNION`/join would fight RLS policy filtering (policies apply per base table) and add zero value at this scale. If a future `JOIN`-based read is added, the RLS policies still filter each base relation correctly.

### 9.3 V2: `pg_trgm` for search
When search arrives (V2), add:

```
create extension if not exists pg_trgm;
create index idx_products_name_trgm on products using gin (name gin_trgm_ops);
create index idx_products_description_trgm on products using gin (description gin_trgm_ops);
create index idx_categories_name_trgm on categories using gin (name gin_trgm_ops);
```

trigram GIN supports ILIKE `%term%` and loose phrase matching on the short, human-entered product names. Do **not** ship these now — 14 rows do not justify the write/disk overhead, and the storefront is fully cacheable. Migrate them in as a dedicated `00XX_search.sql` when the PRD for search lands (PM V2-*).

### 9.4 Other growth notes

- Variants are the only table that can grow unboundedly in theory (many products × many options). `idx_product_variants_product_id` keeps per-product reads O(rows of that product).
- Offers are the only table with a time-window predicate that cannot be a partial-index predicate (`now()` is volatile). At tens of offers the `idx_offers_active_sort` + in-memory window check is still sub-millisecond.
- No `ANALYZE` tuning needed at this scale; the planner's default stats are fine. Re-run `analyze` after any bulk seed (Supabase does this automatically on dump/restore).

---

## 10. Reference: `supabase/seed.sql`
For the team that prefers CLI auto-seed over the `0002_seed.sql` migration: copy §6 verbatim into `supabase/seed.sql` (dropping the outer `begin;`/`commit;` is unnecessary — the CLI runs it in a transaction-less psql session and the file is already transactional and idempotent-safe). The content is identical to §6.

---

## 11. Inputs Needed (from other agents)
FromNeededI depend on it for**PM**Confirm fixed-discount semantics (per item capped at line — I assumed this per Backend §13/PM), default country code for `whatsapp_number` seed, whether the "Midnight Cravings" window seed (relative `now()`) is acceptable for demosSeed values, offer check constraints**Backend Developer**Final `timings` / `theme` jsonb shapes if they diverge from §1.4; confirmation they will rely on RLS-anon reads vs. a read-only API key for `GET /api/catalog`RLS contract (policies must match the real read path)**Supabase Expert**Confirm: `authenticated` should also hold SELECT (I granted it so a logged-in admin can still read the storefront); whether to add `force row level security`; PostgREST exposure of `numeric`/`timestamptz`RLS hardening, `numeric` as string assumption**DevOps Engineer**Cron runner + secret management for the weekly `pg_dump`; PITR enablement; CI runner for `supabase db push`§5.4, §7.3**Auth Specialist**None required — RLS relies only on role names (`anon`, `authenticated`, `service_role`), not on any admin flag/claimNo coupling
## 12. Deferred

- `admin_upsert_product`** / **`admin_upsert_offer`** transaction RPCs** — Backend §13/§14 listed these as optional hardening. Not in this migration; sequential writes with error handling are the MVP. When added, they are new migrations and call as `security definer` functions with the service role — flagged for the Supabase Expert to review the security definer surface.
- `pg_trgm`** search indexes** — V2 (see §9.3).
- `force row level security` — optional hardening owned by the Supabase Expert; default RLS is sufficient for MVP.
- **Read-only **`backup_reader`** role + its migration** — shipped in this doc (§7.3) but applied by DevOps when PITR + cron are stood up.
- `category.image_url`** upload flow** — schema supports it; seed omits images (they are uploaded via the admin dashboard / storage, owned by Supabase Expert).

## 13. Compliance Flags
All decisions below are **extensions** of underspecified ARCHITECTURE §5, none contradict it:

1. `shop_settings.id` fixed to `'...001'` + CHECK — implements the locked "single row id=1" constraint with a uuid.
2. `on delete restrict` for `categories` (Backend's `CATEGORY_IN_USE` semantics), `cascade` for variant and M2M children.
3. `authenticated` granted SELECT alongside `anon` (logged-in admin storefront reads); both stripped of all write privileges.
4. Products RLS filters on active **parent category** (defense-in-depth on "active products/categories").
5. Money as `numeric(10,2)` (Backend boundary contract), all `>= 0`.
6. JSONB shapes for `timings` / `theme` defined in §1.4 (was unshaped).

---

## Revisions & Compliance
RevDateAuthorChangev12026-08-04Database EngineerInitial spec from locked `docs/ARCHITECTURE.md` v1
- **Compliance:** no contradiction with the locked architecture. Extends underspecified detail only: DDL constraints, indexes, RLS mechanics, migration/seed layout, backup strategy, integrity rules. Conflicts are flagged in §13, never silently changed.
