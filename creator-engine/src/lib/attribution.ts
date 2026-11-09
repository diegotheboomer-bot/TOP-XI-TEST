const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** e.g. ACME + 4 random chars → ACME7K2Q */
export function generateDiscountCode(prefix: string): string {
  // Web Crypto works in Node and the browser. 32 symbols divide 256 evenly, so no modulo bias.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(4));
  let suffix = '';
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  return `${prefix}${suffix}`;
}

/** The ?ref= value from the spec: creator_id_campaign_id */
export const refParam = (creatorId: string, campaignId: string) => `${creatorId}_${campaignId}`;

export function trackingLink(shopDomain: string | null, ref: string): string | null {
  return shopDomain ? `https://${shopDomain}/?ref=${encodeURIComponent(ref)}` : null;
}
