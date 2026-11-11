-- Agencies run campaigns for the streamers they manage; clipper tiers can gate campaigns.
alter table brands add column if not exists kind text not null default 'streamer' check (kind in ('streamer', 'agency'));
alter table campaigns add column if not exists client_name text;
alter table campaigns add column if not exists min_tier text not null default 'silver' check (min_tier in ('silver', 'gold', 'platinum', 'diamond', 'majesty'));
