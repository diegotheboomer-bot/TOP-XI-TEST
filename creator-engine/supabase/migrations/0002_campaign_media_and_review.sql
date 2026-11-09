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
