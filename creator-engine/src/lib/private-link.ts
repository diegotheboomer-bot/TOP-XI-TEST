// Private campaigns are link-only: the business shares one link, and any clipper who opens it
// can see and join the campaign. The key is a signature of the campaign id, so links can't be
// guessed or made for other campaigns.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { appUrl, requireEnv } from './env';

export const JOIN_COOKIE = 'atlas_join';

export function joinKey(campaignId: string): string {
  return createHmac('sha256', requireEnv('TOKEN_ENCRYPTION_KEY')).update(`join:${campaignId}`).digest('base64url').slice(0, 16);
}

export function validJoinKey(campaignId: string, key: string | null | undefined): boolean {
  if (!key || !/^[0-9a-f-]{36}$/i.test(campaignId)) return false;
  const want = Buffer.from(joinKey(campaignId));
  const got = Buffer.from(key);
  return want.length === got.length && timingSafeEqual(want, got);
}

export const privateLink = (campaignId: string) => `${appUrl().replace(/\/$/, '')}/join/${campaignId}?k=${joinKey(campaignId)}`;
