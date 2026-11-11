-- Platinum sits between Gold and Diamond.
alter table campaigns drop constraint if exists campaigns_min_tier_check;
alter table campaigns add constraint campaigns_min_tier_check check (min_tier in ('silver', 'gold', 'platinum', 'diamond', 'majesty'));
