-- 0009: the clip's cover image, shown on the clipper's Clips page. Platform
-- cover links can expire, so the sync refreshes it.
alter table submissions add column cover_url text;
