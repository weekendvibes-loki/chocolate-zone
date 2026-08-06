-- =====================================================================
-- Chocolate Zone — storage bucket configuration (migration 0002)
-- Owned by: Supabase Expert. Public read, no public write (§5.1–§5.2).
-- =====================================================================
begin;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true),
       ('offer-images',   'offer-images',   true)
on conflict (id) do nothing;

commit;
