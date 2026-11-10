-- 0012: early partners pay no service fee, only Stripe's card processing.
-- Turn it on per streamer in the Supabase table editor (brands → early_partner).
alter table brands add column early_partner boolean not null default false;
