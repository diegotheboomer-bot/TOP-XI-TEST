-- Linked Discord account, so the Atlas bot can give clippers their Founder and tier roles.
alter table creators add column if not exists discord_id text unique;
alter table creators add column if not exists discord_username text;
