import { describe, expect, it } from 'vitest';
import { isBrandCode, signupFingerprint, validCode } from '@/lib/referrals';

describe('invite codes and anti-fraud fingerprint', () => {
  it('tells business codes from clipper codes', () => {
    expect(isBrandCode('BR1A2B3C4D')).toBe(true);
    expect(isBrandCode('813CE4F0')).toBe(false);
    expect(validCode('BR1A2B3C4D')).toBe(true);
  });
  it('hashes the sign-up network the same way every time, never storing the IP', () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const a = signupFingerprint('203.0.113.9, 10.0.0.1');
    expect(a).toBe(signupFingerprint('203.0.113.9'));
    expect(a).not.toContain('203');
    expect(signupFingerprint('198.51.100.4')).not.toBe(a);
    expect(signupFingerprint(null)).toBeNull();
  });
});
