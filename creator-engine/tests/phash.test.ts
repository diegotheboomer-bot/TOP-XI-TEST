import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { perceptualHash } from '@/lib/phash';
import { hashSimilarity, DUPLICATE_THRESHOLD } from '@/lib/fraud';

// Synthetic "frame": a gradient with a few shapes.
const frame = (shift = 0) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#222"/><stop offset="1" stop-color="#eee"/></linearGradient></defs>
        <rect width="360" height="640" fill="url(#g)"/>
        <circle cx="${120 + shift}" cy="220" r="80" fill="#fff"/>
        <rect x="${60 + shift}" y="420" width="240" height="120" rx="24" fill="#111"/>
      </svg>`,
    ),
  );
const other = () =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640">
        <rect width="360" height="640" fill="#f5f5f5"/>
        <rect x="0" y="0" width="180" height="640" fill="#333"/>
        <circle cx="270" cy="500" r="60" fill="#000"/>
      </svg>`,
    ),
  );

describe('perceptualHash', () => {
  it('matches a re-encoded, resized copy', async () => {
    const original = await frame().png().toBuffer();
    const reupload = await frame().resize(720, 1280).jpeg({ quality: 55 }).toBuffer();
    const sim = hashSimilarity(await perceptualHash(original), await perceptualHash(reupload));
    expect(sim).toBeGreaterThan(DUPLICATE_THRESHOLD);
  });

  it('separates different content', async () => {
    const sim = hashSimilarity(await perceptualHash(await frame().png().toBuffer()), await perceptualHash(await other().png().toBuffer()));
    expect(sim).toBeLessThan(DUPLICATE_THRESHOLD);
  });

  it('returns 16 hex chars', async () => {
    expect(await perceptualHash(await frame().png().toBuffer())).toMatch(/^[0-9a-f]{16}$/);
  });
});
