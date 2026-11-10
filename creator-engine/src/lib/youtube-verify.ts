import { createHmac } from 'node:crypto';
import { requireEnv } from './env';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * The code a clipper puts in their YouTube channel description to prove it's
 * theirs. Derived from their id with a server secret, so it's stable without
 * being stored and can't be guessed for someone else.
 */
export function youtubeVerifyCode(creatorId: string): string {
  const mac = createHmac('sha256', requireEnv('TOKEN_ENCRYPTION_KEY')).update(`youtube-verify:${creatorId}`).digest();
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[mac[i] % ALPHABET.length];
  return `ATLAS-${code}`;
}
