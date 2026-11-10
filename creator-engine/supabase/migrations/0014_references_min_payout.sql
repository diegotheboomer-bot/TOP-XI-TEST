-- Reference material for clippers (links and uploaded images, videos, files) and a minimum payout per clip.
alter table campaigns add column if not exists reference_items jsonb not null default '[]';
alter table campaigns add column if not exists min_payout numeric(12,2) not null default 0;
insert into storage.buckets (id, name, public, file_size_limit)
values ('campaign-references', 'campaign-references', true, 52428800)
on conflict (id) do nothing;
