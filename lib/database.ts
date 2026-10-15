import { Pool, type PoolClient, type QueryResult } from "pg";

type Values = unknown[];
type Result = { results: Record<string, unknown>[]; meta: { changes: number } };

let pool: Pool | undefined;
function connection() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 1, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
  return pool;
}

function postgresSql(source: string, priorChanges = 0) {
  let index = 0;
  return source
    .replace(/changes\(\)/g, String(priorChanges))
    .replace(/lower\(hex\(randomblob\(16\)\)\)/g, "gen_random_uuid()::text")
    .replace(/\?/g, () => `$${++index}`);
}

class Statement {
  values: Values = [];
  constructor(readonly text: string) {}
  bind(...values: Values) { this.values = values; return this; }
  async execute(client?: PoolClient, priorChanges = 0): Promise<Result> {
    const query = postgresSql(this.text, priorChanges);
    const result: QueryResult = await (client ?? connection()).query(query, this.values);
    return { results: result.rows as Record<string, unknown>[], meta: { changes: result.rowCount ?? 0 } };
  }
  all() { return this.execute(); }
  async first() { return (await this.execute()).results[0] ?? null; }
  run() { return this.execute(); }
}

export function db() {
  return {
    prepare(text: string) { return new Statement(text); },
    async batch(statements: Statement[]) {
      const client = await connection().connect();
      try {
        await client.query("BEGIN");
        const results: Result[] = [];
        for (const statement of statements) {
          results.push(await statement.execute(client, results.at(-1)?.meta.changes ?? 0));
        }
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
