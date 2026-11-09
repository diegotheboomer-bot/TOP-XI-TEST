-- Atlas Clips: full database setup in one paste (Supabase SQL Editor → New query → Run).
-- Same as supabase/migrations/0001…0005 in order. Runs as one transaction: all or nothing.
-- Run it once on a new project.

begin;

-- ═════ 0001_init.sql ═════
-- Atlas Clips — initial schema (Supabase / PostgreSQL 15+)
--
-- Access model:
--   * Row Level Security is enabled on every table.
--   * Signed-in users get SELECT policies scoped to the rows they own.
--   * All writes go through server actions / webhooks / cron that verify the
--     caller and then use the service-role key. No INSERT/UPDATE/DELETE
--     policies exist, so a browser client can never write money or metrics.

create extension if not exists pgcrypto;

-- ─── Enums ────────────────────────────────────────────────────────────────
create type payout_model      as enum ('hybrid', 'pure_cpm', 'cps_performance');
create type campaign_status   as enum ('draft', 'active', 'paused', 'completed');
create type submission_status as enum ('pending_review', 'live_tracking', 'flagged', 'paid');
create type social_platform   as enum ('tiktok', 'instagram', 'youtube');
create type ledger_entry_type as enum ('deposit', 'creator_payout', 'platform_fee', 'refund');
create type conversion_match  as enum ('ref_param', 'discount_code');

-- ─── Brands & creators ───────────────────────────────────────────────────
create table brands (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null unique references auth.users (id) on delete cascade,
  name               varchar(120) not null,
  stripe_customer_id varchar(64),
  created_at         timestamptz not null default now()
);

create table creators (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users (id) on delete cascade,
  display_name      varchar(120) not null,
  stripe_account_id varchar(64) unique,           -- Stripe Connect Express account
  payouts_enabled   boolean not null default false,
  created_at        timestamptz not null default now()
);

-- OAuth tokens are AES-256-GCM ciphertext produced by the app
-- (src/lib/crypto.ts). Never readable by clients: no policies on this table.
create table social_accounts (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references creators (id) on delete cascade,
  platform           social_platform not null,
  platform_user_id   varchar(128) not null,       -- TikTok open_id, etc.
  username           varchar(128),
  follower_count     integer,
  access_token_enc   text not null,
  refresh_token_enc  text,
  access_expires_at  timestamptz not null,
  refresh_expires_at timestamptz,
  scopes             text[] not null default '{}',
  updated_at         timestamptz not null default now(),
  unique (creator_id, platform),
  unique (platform, platform_user_id)
);

-- ─── Conversion pixels (installed on a brand's storefront) ────────────────
create table conversion_pixels (
  id         uuid primary key default gen_random_uuid(),
  brand_id   uuid not null references brands (id) on delete cascade,
  name       varchar(120) not null,
  shop_domain varchar(255),                       -- e.g. acme.myshopify.com
  created_at timestamptz not null default now()
);

-- ─── Campaigns ───────────────────────────────────────────────────────────
create table campaigns (
  id                 uuid primary key default gen_random_uuid(),
  brand_id           uuid not null references brands (id) on delete cascade,
  title              varchar(255) not null,
  payout_model       payout_model not null,
  escrow_balance     numeric(12, 2) not null default 0 check (escrow_balance >= 0),
  base_payout        numeric(10, 2) not null default 0 check (base_payout >= 0),
  cpm_rate           numeric(6, 2)  not null default 0 check (cpm_rate >= 0),
  cpm_cap            numeric(10, 2) not null check (cpm_cap > 0),
  cps_commission_pct numeric(5, 2)  not null default 0 check (cps_commission_pct between 0 and 100),
  code_prefix        varchar(12) not null check (code_prefix ~ '^[A-Z0-9]{2,12}$'),
  pixel_id           uuid references conversion_pixels (id) on delete set null,
  asset_folder_url   text,
  status             campaign_status not null default 'draft',
  created_at         timestamptz not null default now(),
  check (cpm_cap >= base_payout)
);
create index campaigns_brand_idx  on campaigns (brand_id);
create index campaigns_status_idx on campaigns (status);

-- A creator joining a campaign. Holds the attribution identifiers that are
-- generated on join: the ?ref= value and the discount code.
create table campaign_creators (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns (id) on delete cascade,
  creator_id    uuid not null references creators (id) on delete cascade,
  ref_param     varchar(80) not null unique,      -- "<creator_id>_<campaign_id>" shortened
  discount_code varchar(24) not null unique,      -- e.g. ACME7K2Q
  joined_at     timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

-- ─── Submissions ─────────────────────────────────────────────────────────
create table submissions (
  id                       uuid primary key default gen_random_uuid(),
  campaign_id              uuid not null,
  creator_id               uuid not null,
  platform                 social_platform not null,
  video_url                text not null,
  social_platform_video_id varchar(100) not null,
  current_view_count       integer not null default 0 check (current_view_count >= 0),
  current_like_count       integer not null default 0,
  current_comment_count    integer not null default 0,
  current_conversions      integer not null default 0,
  payout_earned            numeric(10, 2) not null default 0 check (payout_earned >= 0),
  payout_transferred       numeric(10, 2) not null default 0 check (payout_transferred >= 0),
  status                   submission_status not null default 'pending_review',
  fraud_score              integer not null default 0 check (fraud_score between 0 and 100),
  flag_reason              text,
  phash                    char(16) check (phash ~ '^[0-9a-f]{16}$'), -- 64-bit perceptual hash, hex
  last_synced_at           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- a creator can only submit to a campaign they joined
  foreign key (campaign_id, creator_id)
    references campaign_creators (campaign_id, creator_id) on delete cascade,
  -- one entry per creator per campaign (cpm_cap is a per-creator limit)
  unique (campaign_id, creator_id),
  -- the same video can only be submitted once per campaign
  unique (campaign_id, platform, social_platform_video_id),
  check (payout_transferred <= payout_earned)
);
create index submissions_campaign_idx on submissions (campaign_id);
create index submissions_creator_idx  on submissions (creator_id);
create index submissions_status_idx   on submissions (status);

create table social_metrics_logs (
  id            bigint generated always as identity primary key,
  submission_id uuid not null references submissions (id) on delete cascade,
  captured_at   timestamptz not null default now(),
  view_count    integer not null,
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  share_count   integer not null default 0
);
create index metrics_submission_time_idx on social_metrics_logs (submission_id, captured_at desc);

-- ─── Conversions (server-side storefront webhooks) ───────────────────────
create table conversions (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns (id) on delete cascade,
  campaign_creator_id uuid not null references campaign_creators (id) on delete cascade,
  external_order_id   varchar(64) not null,
  order_total         numeric(12, 2) not null check (order_total >= 0),
  currency            char(3) not null,
  matched_by          conversion_match not null,
  created_at          timestamptz not null default now(),
  unique (campaign_id, external_order_id)        -- webhook retries are idempotent
);
create index conversions_enrollment_idx on conversions (campaign_creator_id);

-- ─── Escrow ledger ───────────────────────────────────────────────────────
create table escrow_ledger (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references campaigns (id) on delete restrict,
  submission_id    uuid references submissions (id) on delete set null,
  entry_type       ledger_entry_type not null,
  amount           numeric(12, 2) not null check (amount > 0),
  stripe_object_id varchar(64),
  created_at       timestamptz not null default now(),
  unique (stripe_object_id, entry_type)
);
create index ledger_campaign_idx on escrow_ledger (campaign_id);

-- ─── Triggers ────────────────────────────────────────────────────────────
create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger submissions_touch before update on submissions
  for each row execute function touch_updated_at();

-- ─── Escrow functions (service role only) ────────────────────────────────
-- Atomic: the conditional UPDATE locks the row, so two concurrent payouts can
-- never overdraw the campaign.
create function escrow_debit(p_campaign uuid, p_amount numeric)
returns boolean language sql security definer set search_path = public as $$
  with u as (
    update campaigns set escrow_balance = escrow_balance - p_amount
    where id = p_campaign and p_amount > 0 and escrow_balance >= p_amount
    returning 1
  )
  select exists (select 1 from u);
$$;

create function escrow_credit(p_campaign uuid, p_amount numeric)
returns void language sql security definer set search_path = public as $$
  update campaigns set escrow_balance = escrow_balance + p_amount
  where id = p_campaign and p_amount > 0;
$$;

-- Stripe deposit: ledger row + balance credit in one transaction. Returns false
-- if this Stripe object was already recorded (webhook retry).
create function record_deposit(p_campaign uuid, p_amount numeric, p_stripe_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into escrow_ledger (campaign_id, entry_type, amount, stripe_object_id)
  values (p_campaign, 'deposit', p_amount, p_stripe_id)
  on conflict (stripe_object_id, entry_type) do nothing;
  if not found then return false; end if;
  update campaigns set escrow_balance = escrow_balance + p_amount where id = p_campaign;
  return true;
end $$;

revoke all on function record_deposit(uuid, numeric, text) from public, anon, authenticated;
grant execute on function record_deposit(uuid, numeric, text) to service_role;
revoke all on function escrow_debit(uuid, numeric)  from public, anon, authenticated;
revoke all on function escrow_credit(uuid, numeric) from public, anon, authenticated;
grant execute on function escrow_debit(uuid, numeric)  to service_role;
grant execute on function escrow_credit(uuid, numeric) to service_role;

-- ─── Row Level Security (read-only policies) ─────────────────────────────
alter table brands              enable row level security;
alter table creators            enable row level security;
alter table social_accounts     enable row level security;
alter table conversion_pixels   enable row level security;
alter table campaigns           enable row level security;
alter table campaign_creators   enable row level security;
alter table submissions         enable row level security;
alter table social_metrics_logs enable row level security;
alter table conversions         enable row level security;
alter table escrow_ledger       enable row level security;

-- Helpers run as definer so policies can reference each other's tables
-- without RLS recursion (brands <-> campaigns).
create function my_brand_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from brands where owner_id = auth.uid();
$$;

create function my_brand_campaign_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select c.id from campaigns c join brands b on b.id = c.brand_id where b.owner_id = auth.uid();
$$;

create function my_creator_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from creators where user_id = auth.uid();
$$;

create policy "own brand" on brands for select
  using (owner_id = auth.uid());

create policy "own creator profile" on creators for select
  using (user_id = auth.uid());

create policy "brand sees enrolled creators" on creators for select
  using (id in (select creator_id from campaign_creators
                where campaign_id in (select my_brand_campaign_ids())));

create policy "brand reads own pixels" on conversion_pixels for select
  using (brand_id in (select my_brand_ids()));

create policy "brand reads own campaigns" on campaigns for select
  using (brand_id in (select my_brand_ids()));

create policy "creators browse active campaigns" on campaigns for select
  using (status = 'active' and my_creator_id() is not null);

create policy "creators see campaigns they joined" on campaigns for select
  using (id in (select campaign_id from campaign_creators where creator_id = my_creator_id()));

create policy "creator reads own enrollments" on campaign_creators for select
  using (creator_id = my_creator_id());

create policy "brand reads enrollments" on campaign_creators for select
  using (campaign_id in (select my_brand_campaign_ids()));

create policy "creator reads own submissions" on submissions for select
  using (creator_id = my_creator_id());

create policy "brand reads campaign submissions" on submissions for select
  using (campaign_id in (select my_brand_campaign_ids()));

create policy "metrics follow submissions" on social_metrics_logs for select
  using (submission_id in (select id from submissions)); -- submissions RLS applies

create policy "brand reads conversions" on conversions for select
  using (campaign_id in (select my_brand_campaign_ids()));

create policy "creator reads own conversions" on conversions for select
  using (campaign_creator_id in (select id from campaign_creators where creator_id = my_creator_id()));

create policy "brand reads ledger" on escrow_ledger for select
  using (campaign_id in (select my_brand_campaign_ids()));

-- Creators may see the name of a brand whose campaigns they can see.
create policy "brand names for visible campaigns" on brands for select
  using (id in (select brand_id from campaigns));

-- ═════ 0002_campaign_media_and_review.sql ═════
-- Campaign thumbnails, briefs and requirements; review deadlines; ad disclosure.

alter table campaigns
  add column thumbnail_url      text,
  add column cover_color        char(7) not null default '#18181b' check (cover_color ~ '^#[0-9a-fA-F]{6}$'),
  add column brief              text check (char_length(brief) <= 4000),
  add column requirements       text[] not null default '{}' check (cardinality(requirements) <= 12),
  add column auto_approve_hours integer not null default 48 check (auto_approve_hours between 1 and 336);

-- Whether the video caption carries an ad disclosure (#ad, #sponsored, …).
-- Re-checked on every sync because captions can be edited.
alter table submissions
  add column has_disclosure boolean not null default false;

-- Public bucket for campaign thumbnails. Uploads go through the server with the
-- service-role key, so no insert policy is needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-thumbnails', 'campaign-thumbnails', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ═════ 0003_streamer_clipping.sql ═════
-- Streamer clipping: platforms per campaign, and the moment board.
-- (The `brands` table holds the campaign owner, which in the product is a streamer;
--  `creators` are the clippers.)

alter table campaigns
  add column platforms social_platform[] not null default '{tiktok,youtube,instagram}'
    check (cardinality(platforms) between 1 and 3);

-- Moments a streamer pins from a stream for clippers to cut. Each can be
-- claimed by a limited number of clippers so the feed isn't flooded with the
-- same clip.
create table campaign_moments (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  title       varchar(120) not null,
  timestamp_label varchar(12) not null check (timestamp_label ~ '^\d{1,2}:\d{2}(:\d{2})?$'),
  vod_url     text,
  max_claims  integer not null default 3 check (max_claims between 1 and 50),
  created_at  timestamptz not null default now()
);
create index moments_campaign_idx on campaign_moments (campaign_id);

create table moment_claims (
  moment_id  uuid not null references campaign_moments (id) on delete cascade,
  creator_id uuid not null references creators (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (moment_id, creator_id)
);

-- Claim atomically, respecting max_claims (service role only).
create function claim_moment(p_moment uuid, p_creator uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  m campaign_moments%rowtype;
  taken integer;
begin
  select * into m from campaign_moments where id = p_moment for update;
  if not found then return 'not_found'; end if;
  if exists (select 1 from moment_claims where moment_id = p_moment and creator_id = p_creator) then return 'already'; end if;
  select count(*) into taken from moment_claims where moment_id = p_moment;
  if taken >= m.max_claims then return 'full'; end if;
  insert into moment_claims (moment_id, creator_id) values (p_moment, p_creator);
  return 'ok';
end $$;
revoke all on function claim_moment(uuid, uuid) from public, anon, authenticated;
grant execute on function claim_moment(uuid, uuid) to service_role;

alter table campaign_moments enable row level security;
alter table moment_claims    enable row level security;

create policy "moments visible with their campaign" on campaign_moments for select
  using (campaign_id in (select id from campaigns)); -- campaigns RLS applies

create policy "claims visible with their moment" on moment_claims for select
  using (moment_id in (select id from campaign_moments));

-- ═════ 0004_payout_methods.sql ═════
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

-- ═════ 0005_auto_payouts.sql ═════
-- Clips are paid automatically a set time after approval, so we need to know when they were approved.
alter table submissions add column approved_at timestamptz;

-- Clips already approved: treat the last sync (or submission) time as their approval time.
update submissions
set approved_at = coalesce(last_synced_at, created_at)
where status in ('live_tracking', 'paid') and approved_at is null;

commit;
