-- Streamer affiliate earnings: kept as a balance the business chooses what to do with:
-- add it to a campaign's budget (a discount) or cash it out to their own payout account.
create table if not exists brand_affiliate_earnings (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands (id) on delete cascade,
  referred_id uuid references creators (id) on delete set null,
  amount      numeric(12, 2) not null check (amount > 0),
  source_ref  text not null unique,           -- the clip payout it came from; stops double counting
  status      text not null default 'available' check (status in ('available', 'applied', 'paid')),
  campaign_id uuid references campaigns (id) on delete set null,  -- when added to a campaign
  transfer_id text,                           -- when cashed out
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);
create index if not exists brand_affiliate_earnings_brand_idx on brand_affiliate_earnings (brand_id, status);
alter table brand_affiliate_earnings enable row level security;

-- Payout account for businesses (Stripe Connect), only needed to cash out affiliate earnings.
alter table brands add column if not exists stripe_account_id text unique;
alter table brands add column if not exists payouts_enabled boolean not null default false;
