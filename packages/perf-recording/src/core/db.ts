import { Pool } from 'pg';
import { resolveConfig } from './config';

let pool: Pool | null = null;

function buildConnStr(host: string, port: number, dbName: string, user: string, password: string, schema: string | undefined): string {
  const base = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  return schema ? `${base}?options=-c%20search_path%3D${schema}%2Cpublic` : base;
}

export function getPool(): Pool {
  if (pool) return pool;
  const cfg = resolveConfig();
  const dbCfg = cfg.database;
  const schema = process.env.PG_SCHEMA;

  let connStr: string;
  if (dbCfg.connectionString) {
    const url = new URL(dbCfg.connectionString);
    if (schema) url.search = `?options=-c%20search_path%3D${schema}%2Cpublic`;
    connStr = url.toString();
  } else {
    connStr = buildConnStr(dbCfg.host, dbCfg.port, dbCfg.dbName, dbCfg.user, dbCfg.password, schema);
  }

  pool = new Pool({ connectionString: connStr });
  pool.on('error', (err) => console.error(`[perf-recording] pool error: ${err.message}`));
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
