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
