-- Where each clipper wants to be paid: Stripe (bank or debit card), PayPal or Venmo.
-- Kept out of `creators` because streamers can read the creator rows of clippers
-- in their campaigns; a PayPal email or Venmo number is private to the clipper.
create type payout_method as enum ('stripe', 'paypal', 'venmo');

create table payout_methods (
  creator_id   uuid primary key references creators (id) on delete cascade,
  method       payout_method not null default 'stripe',
  handle       varchar(254),            -- PayPal email or Venmo mobile (+1…); null for Stripe
  last_failure text,                    -- why the last PayPal/Venmo payout came back
  updated_at   timestamptz not null default now(),
  constraint handle_matches_method check ((method = 'stripe') = (handle is null))
);

alter table payout_methods enable row level security;
-- Read-only for the clipper themselves; writes go through server code (service role).
create policy "own payout method" on payout_methods for select using (creator_id = my_creator_id());
