-- =====================================================================
-- Chocolate Zone — real menu seed (migration 0005)
--
-- Replaces the demo catalog seeded by seed.sql with the confirmed
-- Chocolate Zone menu. Only catalog rows (categories / products /
-- offers / offer_products) are touched; shop_settings, auth, storage
-- buckets and any order/WhatsApp data are left untouched.
--
-- Pricing decision
-- ---------------
-- products.base_price = ACTUAL SELLING PRICE (the menu price).
-- The storefront's only discount mechanism is the offers table, and
-- offers apply REAL discounts at checkout (src/lib/pricing/discount.ts).
-- Because the menu prices above are final selling prices, no offers are
-- created here — an offer would change what the customer actually pays.
--
-- There is no compare-at / original-price column in the schema and, per
-- the change constraints, the schema is NOT altered. The display/compare
-- price (round(menuPrice / 0.90), e.g. 59 -> 66) is purely presentational
-- and has no storage field in the current application model.
--
-- The "Brownie + Waffle Duo" offer is intentionally NOT seeded (see the
-- note at the end): the offers table requires a non-null discount_type
-- and discount_value, and the brownie price / final offer price are not
-- yet confirmed.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Remove demo offers. offer_products rows cascade with the offer.
--    Targeted by the exact titles inserted by seed.sql.
-- ---------------------------------------------------------------------
delete from offers
where title in ('Weekend Wonder', 'Brownie + Coffee Duo', 'Midnight Cravings');

-- ---------------------------------------------------------------------
-- 2. Remove demo products. product_variants and offer_products rows
--    cascade with the product. Targeted by the exact seed.sql names so
--    this is a no-op if the demo catalog is already gone.
-- ---------------------------------------------------------------------
delete from products
where name in (
    'Classic Belgian Waffle',
    'Chocolate Overload Waffle',
    'Double Dark Brownie',
    'Walnut Brownie',
    'Sizzling Brownie',
    'Chocolate Truffle Cake',
    'Red Velvet Cake',
    'Blueberry Cheesecake',
    'Assorted Choco Box',
    'Choco Truffle Bites',
    'Dark Chocolate Bark',
    'Hot Chocolate',
    'Cold Coffee',
    'Chocolate Shake'
);

-- ---------------------------------------------------------------------
-- 3. Remove the now-empty demo categories. products.category_id is
--    ON DELETE RESTRICT, so only categories that no longer hold any
--    product are removed. The demo 'brownies' category is intentionally
--    left in place and re-initialised by the upsert below (step 4), so
--    a real empty Brownies category is never deleted on re-runs.
-- ---------------------------------------------------------------------
delete from categories
where slug in ('waffles', 'cakes', 'chocolates', 'beverages')
  and not exists (
      select 1 from products p where p.category_id = categories.id
  );

-- ---------------------------------------------------------------------
-- 4. Real categories, in menu order. Upsert on slug so the migration is
--    idempotent and re-initialises the legacy empty 'brownies' category.
-- ---------------------------------------------------------------------
insert into categories (name, slug, emoji, sort_order, is_active)
values
    ('Vanilla Waffles',   'vanilla-waffles',   '🧇', 10, true),
    ('Chocolate Waffles', 'chocolate-waffles', '🍫', 20, true),
    ('Strawberry Bowl',   'strawberry-bowl',   '🍓', 30, true),
    ('Strawberry Stick',  'strawberry-stick',  '🍓', 40, true),
    ('Bowl Waffles',      'bowl-waffles',      '🥣', 50, true),
    ('Muska Bun',         'muska-bun',         '🥖', 60, true),
    ('Brownies',          'brownies',          '🍩', 70, true)
on conflict (slug) do update
    set name       = excluded.name,
        emoji      = excluded.emoji,
        sort_order = excluded.sort_order,
        is_active  = true;

-- ---------------------------------------------------------------------
-- 5. Real products, in the exact menu order within each category.
--    base_price = actual selling price. description, image_url and
--    is_veg are left null (no invented data); images are uploaded later
--    through the existing admin/storage flow. No product_variants are
--    created: every item is a distinct priced product.
--    Guarded so the block is skipped once the menu has been seeded.
-- ---------------------------------------------------------------------
insert into products (
    category_id, name, description, base_price, is_featured, is_veg,
    stock_qty, sort_order, is_active
)
select c.id, p.name, null, p.base_price, false, null, null, p.sort_order, true
from (values
    -- Vanilla Waffles
    ('vanilla-waffles',   'Dark chocolate',                   49.00,  10),
    ('vanilla-waffles',   'Milk chocolate',                   55.00,  20),
    ('vanilla-waffles',   'White chocolate',                  59.00,  30),
    ('vanilla-waffles',   'Mixed chocolate',                  59.00,  40),
    ('vanilla-waffles',   'Honey',                            59.00,  50),
    ('vanilla-waffles',   'Dark Chocolate with nuts',         59.00,  60),
    ('vanilla-waffles',   'White chocolate with nuts',        59.00,  70),
    -- Chocolate Waffles
    ('chocolate-waffles', 'Double chocolate',                 55.00,  10),
    ('chocolate-waffles', 'Milk chocolate',                   55.00,  20),
    ('chocolate-waffles', 'Oreo chocolate',                   59.00,  30),
    ('chocolate-waffles', 'Kitkat chocolate',                 59.00,  40),
    ('chocolate-waffles', 'White chocolate',                  59.00,  50),
    -- Strawberry Bowl
    ('strawberry-bowl',   'Dark chocolate',                   130.00, 10),
    ('strawberry-bowl',   'Mixed chocolate',                  135.00, 20),
    ('strawberry-bowl',   'Milk chocolate',                   135.00, 30),
    ('strawberry-bowl',   'White chocolate',                  140.00, 40),
    -- Strawberry Stick
    ('strawberry-stick',  'Dark chocolate',                   55.00,  10),
    ('strawberry-stick',  'White chocolate',                  59.00,  20),
    ('strawberry-stick',  'Milk chocolate',                   59.00,  30),
    ('strawberry-stick',  'Mixed chocolate',                  59.00,  40),
    -- Bowl Waffles
    ('bowl-waffles',      'Milk chocolate',                   85.00,  10),
    ('bowl-waffles',      'Mixed chocolate',                  95.00,  20),
    ('bowl-waffles',      'Double chocolate',                 99.00,  30),
    ('bowl-waffles',      'White chocolate',                  99.00,  40),
    ('bowl-waffles',      'Chocolate with nuts',              105.00, 50),
    -- Muska Bun
    ('muska-bun',         'Plain Muska Bun',                  30.00,  10),
    ('muska-bun',         'Chocolate Muska Bun',              40.00,  20),
    ('muska-bun',         'Blueberry Muska Bun',              40.00,  30),
    ('muska-bun',         'Strawberry Muska Bun',             40.00,  40),
    ('muska-bun',         'Jam Muska Bun',                    40.00,  50),
    ('muska-bun',         'Nutella Muska Bun',                40.00,  60)
    -- Brownies: category created above; no products yet (prices pending).
) as p(slug, name, base_price, sort_order)
join categories c on c.slug = p.slug
where not exists (
    select 1
    from products pp
    join categories cc on cc.id = pp.category_id
    where cc.slug = 'vanilla-waffles'
);

-- ---------------------------------------------------------------------
-- Brownie + Waffle Duo — NOT seeded.
--
-- Offer requires final brownie price and/or offer price before it can be
-- seeded.
-- The offers table requires a non-null discount_type and discount_value,
-- and the duo's product link needs the brownie products (which have no
-- confirmed prices yet). No invented price/offer has been created.
-- ---------------------------------------------------------------------

commit;
