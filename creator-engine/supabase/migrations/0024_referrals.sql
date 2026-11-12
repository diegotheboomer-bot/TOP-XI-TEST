-- Referrals: every clipper gets an invite code. When someone they invited cashes out,
-- the 2% cash-out fee goes to the inviter for the first 90 days after the new clipper joined.
alter table creators add column if not exists referral_code text unique;
alter table creators add column if not exists referred_by uuid references creators (id) on delete set null;

-- Give every clipper a short code, now and on sign-up.
update creators set referral_code = upper(substr(md5(id::text || random()::text), 1, 8)) where referral_code is null;
alter table creators alter column referral_code set default upper(substr(md5(gen_random_uuid()::text), 1, 8));

create index if not exists creators_referred_by_idx on creators (referred_by);

-- The inviter's share of each fee. Written by the server only; paid by Stripe transfer.
create table if not exists referral_earnings (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references creators (id) on delete cascade,
  referred_id  uuid not null references creators (id) on delete cascade,
  submission_id uuid references submissions (id) on delete set null,
  amount       numeric(12, 2) not null check (amount > 0),
  source_ref   text not null unique,  -- the clip payout it came from; stops double counting
  transfer_id  text,                  -- 'claim:…' while sending, then the Stripe transfer id
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists referral_earnings_referrer_idx on referral_earnings (referrer_id, paid_at);
alter table referral_earnings enable row level security;
drop policy if exists "creators read own referral earnings" on referral_earnings;
create policy "creators read own referral earnings" on referral_earnings for select using (referrer_id = my_creator_id());
