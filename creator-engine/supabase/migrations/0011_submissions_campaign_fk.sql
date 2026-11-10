-- 0011: direct link from submissions to campaigns. Submissions only referenced
-- campaign_creators (campaign_id, creator_id), so the API couldn't join
-- submissions to campaigns and the view sync failed.
alter table submissions add constraint submissions_campaign_id_fkey foreign key (campaign_id) references campaigns (id) on delete cascade;
notify pgrst, 'reload schema';
