import { Pool } from 'pg';
import { resolveConfig } from './config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const cfg = resolveConfig();
  const dbCfg = cfg.database;
  const schema = process.env.PG_SCHEMA;

  console.log(`[perf-v2] db config: host=${dbCfg.host} port=${dbCfg.port} db=${dbCfg.dbName} user=${dbCfg.user} schema=${schema ?? '(not set)'} connectionString=${dbCfg.connectionString ? 'yes' : 'no'}`);

  if (dbCfg.connectionString) {
    const url = new URL(dbCfg.connectionString);
    if (schema) url.searchParams.set('options', `-c search_path=${schema},public`);
    const connStr = url.toString();
    console.log(`[perf-v2] using connectionString (redacted): ${connStr.replace(/:([^@]+)@/, ':***@')}`);
    pool = new Pool({ connectionString: connStr });
  } else {
    const url = new URL(`postgresql://${dbCfg.host}:${dbCfg.port}/${dbCfg.dbName}`);
    url.username = dbCfg.user;
    url.password = dbCfg.password;
    if (schema) url.searchParams.set('options', `-c search_path=${schema},public`);
    const connStr = url.toString();
    console.log(`[perf-v2] using built connectionString (redacted): ${connStr.replace(/:([^@]+)@/, ':***@')}`);
    pool = new Pool({ connectionString: connStr });
  }

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
