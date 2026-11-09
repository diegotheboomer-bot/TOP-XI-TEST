import { beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
});

describe('token encryption', () => {
  it('round-trips and uses a fresh IV', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/crypto');
    const a = encryptSecret('act.secret-token');
    const b = encryptSecret('act.secret-token');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('act.secret-token');
  });

  it('rejects tampered ciphertext', async () => {
    const { encryptSecret, decryptSecret } = await import('@/lib/crypto');
    const parts = encryptSecret('hello').split('.');
    parts[3] = Buffer.from('x' + Buffer.from(parts[3], 'base64url').toString('latin1')).toString('base64url');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });
});
