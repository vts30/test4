import { Pool } from 'pg';
import { resolveConfig } from './config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const cfg = resolveConfig();
  const dbCfg = cfg.database;
  const schema = process.env.PG_SCHEMA;

  if (dbCfg.connectionString) {
    const url = new URL(dbCfg.connectionString);
    if (schema) url.searchParams.set('options', `-c search_path=${schema},public`);
    pool = new Pool({ connectionString: url.toString() });
  } else {
    const url = new URL(`postgresql://${dbCfg.host}:${dbCfg.port}/${dbCfg.dbName}`);
    url.username = dbCfg.user;
    url.password = dbCfg.password;
    if (schema) url.searchParams.set('options', `-c search_path=${schema},public`);
    pool = new Pool({ connectionString: url.toString() });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
