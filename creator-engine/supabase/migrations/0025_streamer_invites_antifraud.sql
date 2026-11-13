-- Streamer invite links: clippers who join through a business's link give that business their
-- 5% cash-out fee for 90 days, added to the business's campaign budget (never refunded to a card).
alter type ledger_entry_type add value if not exists 'referral_credit';

alter table brands add column if not exists referral_code text unique;
update brands set referral_code = 'BR' || upper(substr(md5(id::text || random()::text), 1, 8)) where referral_code is null;
alter table brands alter column referral_code set default ('BR' || upper(substr(md5(gen_random_uuid()::text), 1, 8)));

alter table creators add column if not exists referred_by_brand uuid references brands (id) on delete set null;
create index if not exists creators_referred_by_brand_idx on creators (referred_by_brand);

-- Anti-fraud for clipper invites: a hash of the sign-up network (never the raw IP), so an
-- invite from the same connection as the inviter doesn't count; and a reason when a reward is blocked.
alter table creators add column if not exists signup_fingerprint text;
alter table referral_earnings add column if not exists blocked_reason text;
