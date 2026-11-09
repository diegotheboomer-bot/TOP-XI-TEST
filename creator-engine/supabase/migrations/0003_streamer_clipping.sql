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
