-- Profiles (picture, bio), a verified badge, the after-sign-up questionnaire, and campaign invites.
alter table creators add column if not exists avatar_url text;
alter table creators add column if not exists bio text;
alter table creators add column if not exists verified boolean not null default false;
alter table creators add column if not exists interests text[] not null default '{}';
alter table creators add column if not exists heard_from text;
alter table creators add column if not exists onboarded_at timestamptz;

alter table brands add column if not exists avatar_url text;
alter table brands add column if not exists verified boolean not null default false;
alter table brands add column if not exists interests text[] not null default '{}';
alter table brands add column if not exists heard_from text;
alter table brands add column if not exists onboarded_at timestamptz;

-- A campaign owner invites a clipper, with an optional note.
create table if not exists campaign_invites (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  creator_id  uuid not null references creators (id) on delete cascade,
  message     text,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
alter table campaign_invites enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152)
on conflict (id) do nothing;
