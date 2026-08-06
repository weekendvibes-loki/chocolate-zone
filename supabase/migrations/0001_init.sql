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
