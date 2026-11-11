// Fake test data (scripts/seed-local.mjs) uses video ids starting with this. Those clips
// are never synced with the platforms or paid out, so test data can't touch real money.
export const TEST_VIDEO_PREFIX = 'atlastest';
export const isTestClip = (s: { social_platform_video_id?: string | null }) => !!s.social_platform_video_id?.startsWith(TEST_VIDEO_PREFIX);
