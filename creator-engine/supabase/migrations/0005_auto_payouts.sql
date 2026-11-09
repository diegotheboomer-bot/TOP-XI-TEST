-- Clips are paid automatically a set time after approval, so we need to know when they were approved.
alter table submissions add column approved_at timestamptz;

-- Clips already approved: treat the last sync (or submission) time as their approval time.
update submissions
set approved_at = coalesce(last_synced_at, created_at)
where status in ('live_tracking', 'paid') and approved_at is null;
