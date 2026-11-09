import sharp from 'sharp';

const SIZE = 32;
const LOW = 8;

// Precomputed DCT-II cosine table.
const COS: number[][] = Array.from({ length: LOW }, (_, u) =>
  Array.from({ length: SIZE }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE))),
);

/**
 * Classic DCT perceptual hash: 32×32 grayscale → 2-D DCT → top-left 8×8 low
 * frequencies → bit = coefficient above the median (DC term excluded from the
 * median). Returns 64 bits as 16 hex chars.
 */
export async function perceptualHash(image: Buffer): Promise<string> {
  const pixels = await sharp(image).grayscale().resize(SIZE, SIZE, { fit: 'fill' }).raw().toBuffer();

  const coeffs: number[] = [];
  for (let u = 0; u < LOW; u++) {
    for (let v = 0; v < LOW; v++) {
      let sum = 0;
      for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) sum += pixels[y * SIZE + x] * COS[u][x] * COS[v][y];
      }
      coeffs.push(sum);
    }
  }

  const sorted = coeffs.slice(1).sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;

  let hash = 0n;
  for (const c of coeffs) hash = (hash << 1n) | (c > median ? 1n : 0n);
  return hash.toString(16).padStart(16, '0');
}

export async function perceptualHashFromUrl(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return perceptualHash(Buffer.from(await res.arrayBuffer()));
}
