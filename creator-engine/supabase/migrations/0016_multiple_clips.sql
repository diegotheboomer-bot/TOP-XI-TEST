-- Clippers can post more than one clip per campaign; streamers may set a limit (null = unlimited).
alter table submissions drop constraint if exists submissions_campaign_id_creator_id_key;
alter table campaigns add column if not exists max_clips_per_clipper integer check (max_clips_per_clipper is null or max_clips_per_clipper > 0);
