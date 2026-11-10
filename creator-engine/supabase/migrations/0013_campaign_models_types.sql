-- 0013: two more payment models and campaign tags.
--   per_post: a flat amount (base_payout) for each approved clip.
--   pool:     the funded budget is split between clippers by their share of views,
--             paid when the campaign ends.
-- content_types: what kind of videos the streamer wants; category: their niche.
alter type payout_model add value if not exists 'per_post';
alter type payout_model add value if not exists 'pool';
alter table campaigns add column if not exists content_types text[] not null default '{}';
alter table campaigns add column if not exists category text;
