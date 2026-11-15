// Fake test data (scripts/seed-local.mjs) uses video ids starting with this. Those clips
// are never synced with the platforms or paid out, so test data can't touch real money.
export const TEST_VIDEO_PREFIX = 'atlastest';
export const isTestClip = (s: { social_platform_video_id?: string | null }) => !!s.social_platform_video_id?.startsWith(TEST_VIDEO_PREFIX);

// Real-money tests from /admin/test-data: a balance the Atlas team gives a clipper from a campaign it funded,
// to try a real cash-out. Never synced with the platforms (there is no video), but paid out like any clip.
export const MONEY_TEST_PREFIX = 'atlasmoney';
export const isMoneyTest = (s: { social_platform_video_id?: string | null }) => !!s.social_platform_video_id?.startsWith(MONEY_TEST_PREFIX);
