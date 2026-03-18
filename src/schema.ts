import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool } from './db';

async function initSchema(): Promise<void> {
  const sql = readFileSync(join(__dirname, '../db/init.sql'), 'utf-8');
  const pool = getPool();
  try {
    await pool.query(sql);
    console.log('[perf] Schema initialized successfully');
  } finally {
    await pool.end();
  }
}

initSchema().catch((err) => {
  console.error('[perf] Schema initialization failed:', err.message);
  process.exit(1);
});
