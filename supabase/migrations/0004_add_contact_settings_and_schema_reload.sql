-- =====================================================================
-- Chocolate Zone — shop_settings contact columns + schema-cache reload
-- Owned by: Database Engineer.
--
-- 1. Defensive: guarantees whatsapp_ordering_enabled exists even when
--    0003 was recorded as applied before its DDL took effect.
-- 2. Adds the display contact phone/email used by the storefront footer
--    (kept separate from whatsapp_number, which stays the order receiver).
-- 3. `NOTIFY pgrst, 'reload schema'` reloads the PostgREST schema cache so
--    the Data API no longer returns PGRST204 ("Could not find ... column of
--    'shop_settings' in schema cache") after the new columns are added.
-- =====================================================================
begin;

alter table shop_settings
    add column if not exists whatsapp_ordering_enabled boolean not null default true,
    add column if not exists contact_phone text,
    add column if not exists contact_email text;

notify pgrst, 'reload schema';

commit;
