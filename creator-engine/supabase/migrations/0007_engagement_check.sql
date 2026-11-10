-- 0007: low-engagement hold. Clips with far fewer likes and comments per view
-- than normal (a sign of paid promotion) are held for the streamer to check.
-- Set once the streamer approves such a clip, so it isn't held again.
alter table submissions add column engagement_cleared boolean not null default false;
