import { Pool } from 'pg';
import { resolveConfig } from './config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const cfg = resolveConfig();
  const dbCfg = cfg.database;

  const schema = process.env.PG_SCHEMA;
  const searchPath = schema ? `${schema},public` : undefined;

  pool = dbCfg.connectionString
    ? new Pool({ connectionString: dbCfg.connectionString })
    : new Pool({
        host: dbCfg.host,
        port: dbCfg.port,
        user: dbCfg.user,
        password: dbCfg.password,
        database: dbCfg.dbName,
        ...(searchPath && { options: `-c search_path=${searchPath}` }),
      });

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
