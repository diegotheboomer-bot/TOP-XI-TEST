-- 0008: verified YouTube channels live in social_accounts (platform 'youtube')
-- with no token: the channel is proven by a code in its description.
alter table social_accounts alter column access_token_enc drop not null;
alter table social_accounts alter column access_expires_at drop not null;
