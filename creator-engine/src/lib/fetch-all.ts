// Supabase (PostgREST) returns at most 1,000 rows per request. These read every page,
// so totals, tiers and refunds stay right once a table grows past that.

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
interface Query<T> {
  range(from: number, to: number): Page<T>;
}

const PAGE = 1000;
// Ids per request for `.in()` filters, so URLs stay well under proxy limits.
const CHUNK = 150;

/** Every row of a query. Pass a function that builds the query (with a stable order). */
export async function selectAll<T>(query: () => Query<T>): Promise<{ data: T[]; error: { message: string } | null }> {
  const data: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error } = await query().range(from, from + PAGE - 1);
    if (error) return { data, error };
    data.push(...(rows ?? []));
    if (!rows || rows.length < PAGE) return { data, error: null };
  }
}

/** Every row of a query filtered by a (possibly long) list of ids, in chunks. */
export async function selectAllIn<T>(ids: string[], query: (chunk: string[]) => Query<T>): Promise<{ data: T[]; error: { message: string } | null }> {
  const data: T[] = [];
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const res = await selectAll(() => query(chunk));
    data.push(...res.data);
    if (res.error) return { data, error: res.error };
  }
  return { data, error: null };
}
