import { describe, expect, it } from 'vitest';
import { selectAll, selectAllIn } from '@/lib/fetch-all';

// A fake table that, like PostgREST, never returns more than 1,000 rows per request.
const table = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));
const fake = (rows: { id: number }[]) => ({
  range: (from: number, to: number) => Promise.resolve({ data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null }),
});

describe('selectAll', () => {
  it('reads every page past the 1,000-row cap', async () => {
    const { data } = await selectAll(() => fake(table(2500)));
    expect(data).toHaveLength(2500);
    expect(data.at(-1)).toEqual({ id: 2499 });
  });
  it('stops after an exact multiple of the page size', async () => {
    expect((await selectAll(() => fake(table(2000)))).data).toHaveLength(2000);
    expect((await selectAll(() => fake(table(0)))).data).toHaveLength(0);
  });
  it('returns what it has plus the error when a page fails', async () => {
    let calls = 0;
    const res = await selectAll(() => ({
      range: (from: number) => Promise.resolve(calls++ === 0 ? { data: table(1000), error: null } : { data: null, error: { message: 'boom' } }),
    }));
    expect(res.data).toHaveLength(1000);
    expect(res.error?.message).toBe('boom');
  });
});

describe('selectAllIn', () => {
  it('splits long id lists into chunks and keeps every row', async () => {
    const ids = Array.from({ length: 400 }, (_, i) => `id${i}`);
    const chunks: number[] = [];
    const { data } = await selectAllIn(ids, (chunk) => {
      chunks.push(chunk.length);
      return { range: () => Promise.resolve({ data: chunk.map((id) => ({ id })), error: null }) };
    });
    expect(data).toHaveLength(400);
    expect(Math.max(...chunks)).toBeLessThanOrEqual(150);
  });
});
