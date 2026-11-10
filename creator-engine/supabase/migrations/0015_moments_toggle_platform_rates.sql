-- Moments (pinned stream timestamps) are optional per campaign, off by default.
alter table campaigns add column if not exists moments_enabled boolean not null default false;
-- Optional rate per 1K views for each platform, e.g. {"tiktok": 1, "instagram": 1.5}. Empty = cpm_rate everywhere.
alter table campaigns add column if not exists platform_rates jsonb not null default '{}';
