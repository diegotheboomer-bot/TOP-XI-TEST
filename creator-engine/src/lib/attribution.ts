import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** e.g. ACME + 4 random chars → ACME7K2Q */
export function generateDiscountCode(prefix: string): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}${suffix}`;
}

/** The ?ref= value from the spec: creator_id_campaign_id */
export const refParam = (creatorId: string, campaignId: string) => `${creatorId}_${campaignId}`;

export function trackingLink(shopDomain: string | null, ref: string): string | null {
  return shopDomain ? `https://${shopDomain}/?ref=${encodeURIComponent(ref)}` : null;
}
