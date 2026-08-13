-- =====================================================================
-- Chocolate Zone — Brownie + Waffle Duo offer (migration 0007)
--
-- Creates a REAL promotional offer using the existing offers /
-- offer_products schema (migration 0001) and the seed.sql offer pattern.
--
--   KitKat Chocolate Waffle + Triple Chocolate Brownie = ₹119 normally
--   Duo price = ₹99  →  fixed ₹20 off (discount_value 20.00)
--
-- No image, no start/end window (active now, never expires), applies only
-- to the two products listed via offer_products. No application logic is
-- changed — the existing offer engine applies the fixed discount.
-- =====================================================================

begin;

with new_offer as (
    insert into offers (
        title, description, image_url, discount_type, discount_value,
        applies_to_all, starts_at, ends_at, is_active, sort_order
    )
    select
        'Brownie + Waffle Duo',
        'KitKat Chocolate Waffle + Triple Chocolate Brownie for ₹99.',
        null,
        'fixed',
        20.00,
        false,
        null,
        null,
        true,
        10
    -- Rerun-safe: no duplicate offer if the migration is reapplied.
    where not exists (
        select 1 from offers where title = 'Brownie + Waffle Duo'
    )
    returning id
)
insert into offer_products (offer_id, product_id)
select o.id, p.id
from new_offer o
cross join (
    -- Resolve products by category slug + exact menu name (0005/0006
    -- lookup convention); no invented UUIDs.
    select c.id as category_id, v.name
    from (values
        ('chocolate-waffles', 'Kitkat chocolate'),
        ('brownies',          'Triple Chocolate Brownie')
    ) as v(slug, name)
    join categories c on c.slug = v.slug
) targets
join products p on p.category_id = targets.category_id and p.name = targets.name;

commit;
