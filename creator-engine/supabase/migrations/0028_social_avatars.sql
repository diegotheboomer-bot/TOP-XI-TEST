-- Profile picture of each connected platform account (copied to our storage, so it doesn't expire).
alter table social_accounts add column if not exists avatar_url text;
