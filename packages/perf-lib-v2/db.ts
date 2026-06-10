import { Pool } from 'pg';
import { resolveConfig } from './config';

let pool: Pool | null = null;

function buildConnStr(host: string, port: number, dbName: string, user: string, password: string, schema: string | undefined): string {
  const base = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  // URLSearchParams encodes space as '+' which PostgreSQL does not accept — use %20 manually
  return schema ? `${base}?options=-c%20search_path%3D${schema}%2Cpublic` : base;
}

export function getPool(): Pool {
  if (pool) return pool;
  const cfg = resolveConfig();
  const dbCfg = cfg.database;
  const schema = process.env.PG_SCHEMA;

  console.log(`[perf-v2] db config: host=${dbCfg.host} port=${dbCfg.port} db=${dbCfg.dbName} user=${dbCfg.user} schema=${schema ?? '(not set)'}`);

  let connStr: string;
  if (dbCfg.connectionString) {
    const url = new URL(dbCfg.connectionString);
    if (schema) url.search = `?options=-c%20search_path%3D${schema}%2Cpublic`;
    connStr = url.toString();
  } else {
    connStr = buildConnStr(dbCfg.host, dbCfg.port, dbCfg.dbName, dbCfg.user, dbCfg.password, schema);
  }

  console.log(`[perf-v2] connectionString (redacted): ${connStr.replace(/:([^@]+)@/, ':***@')}`);

  pool = new Pool({ connectionString: connStr });

  pool.on('error', (err) => {
    console.error(`[perf-v2] pool error: ${err.message}`);
  });

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
