-- =====================================================================
-- Chocolate Zone — confirmed brownie products (migration 0006)
--
-- Adds the three confirmed brownie products to the existing `brownies`
-- category created by migration 0005. base_price = actual selling price.
--
--  * No image URLs — images will be uploaded later via the admin UI
--    (image_url left null, matching migration 0005).
--  * Stock left null = unlimited, same convention as migration 0005.
--  * No offers created: the storefront "was price" presentation
--    (round(base_price / 0.9)) is purely presentational, and the offers
--    engine is untouched.
--  * The products schema has no slug column, so the product slugs
--    (brownie / triple-chocolate-brownie / kitkat-brownie) are noted for
--    reference only; the slug used in the join below is the category slug.
-- =====================================================================

begin;

insert into products (
    category_id, name, description, base_price, is_featured, is_veg,
    stock_qty, sort_order, is_active
)
select c.id, p.name, null, p.base_price, false, null, null, p.sort_order, true
from (values
    -- product slug (for reference): brownie
    ('brownies', 'Brownie',                  50.00, 10),
    -- product slug (for reference): triple-chocolate-brownie
    ('brownies', 'Triple Chocolate Brownie', 60.00, 20),
    -- product slug (for reference): kitkat-brownie
    ('brownies', 'KitKat Brownie',           60.00, 30)
) as p(slug, name, base_price, sort_order)
join categories c on c.slug = p.slug
-- Rerun-safe: skip once the brownies category already holds products
-- (same guard pattern as migration 0005).
where not exists (
    select 1 from products pp
    join categories cc on cc.id = pp.category_id
    where cc.slug = 'brownies'
);

commit;
