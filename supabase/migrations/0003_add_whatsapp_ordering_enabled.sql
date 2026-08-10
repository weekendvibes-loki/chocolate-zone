-- =====================================================================
-- Chocolate Zone — shop_settings WhatsApp ordering toggle (migration 0003)
-- Owned by: Database Engineer. Adds an explicit ON/OFF switch so the admin
-- can disable WhatsApp ordering without clearing the stored number.
-- =====================================================================
begin;

alter table shop_settings
    add column if not exists whatsapp_ordering_enabled boolean not null default true;

commit;
