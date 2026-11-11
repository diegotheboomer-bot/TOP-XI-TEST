-- Removes ALL Atlas test data: every @atlas.test account and everything they made
-- (campaigns, clips, money records, invites, tickets). Real accounts are not touched,
-- except clips a real account posted to a test campaign, which go with that campaign.
begin;
delete from escrow_ledger where campaign_id in (
  select c.id from campaigns c join brands b on b.id = c.brand_id join auth.users u on u.id = b.owner_id where u.email like '%@atlas.test'
);
delete from auth.users where email like '%@atlas.test';
commit;
select (select count(*) from auth.users where email like '%@atlas.test') as test_accounts_left,
       (select count(*) from submissions where social_platform_video_id like 'atlastest%') as test_clips_left;
