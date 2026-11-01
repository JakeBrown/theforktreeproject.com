import { DatabaseSync } from 'node:sqlite';
import type { D1Database, D1Statement } from '../../src/lib/volunteerDb.ts';

/** Minimal in-memory stand-in for a Cloudflare D1 binding, backed by node:sqlite. */
export function createD1(): D1Database & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  const prepare = (query: string, values: unknown[] = []): D1Statement => {
    const statement = () => sqlite.prepare(query);
    const params = values as any[];
    return {
      bind: (...next: unknown[]) => prepare(query, next),
      first: async <T>() => (statement().get(...params) as T) ?? null,
      all: async <T>() => ({ results: statement().all(...params) as T[] }),
      run: async () => {
        const result = statement().run(...params);
        return { meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
      },
    };
  };
  return {
    sqlite,
    prepare: (query: string) => prepare(query),
    batch: async (statements: D1Statement[]) => {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  };
}
