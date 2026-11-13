-- Devices each account has used (a hashed random browser ID, never anything personal), so an
-- invite link opened on the inviter's own phone or computer doesn't count.
create table if not exists user_devices (
  user_id     uuid not null references auth.users (id) on delete cascade,
  device_hash text not null,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (user_id, device_hash)
);
create index if not exists user_devices_device_idx on user_devices (device_hash);
alter table user_devices enable row level security;
