import { getPool } from './db';
import { resolveConfig } from './config';

export interface RunManager {
  start(): Promise<number>;
  finish(status: 'complete' | 'partial'): Promise<void>;
}

export function createRunManager(): RunManager {
  let runNumber: number | null = null;

  return {
    async start(): Promise<number> {
      const cfg = resolveConfig();
      const sql = `
        INSERT INTO test_runs
          (build_id, git_hash, branch, environment, test_suite, version, tags, started_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'running')
        RETURNING run_number
      `;
      const params = [
        cfg.buildId,
        cfg.gitHash,
        cfg.branch,
        cfg.environment,
        cfg.testSuite,
        cfg.version,
        cfg.buildId ? JSON.stringify({ build: cfg.buildId }) : null,
      ];

      const result = await getPool().query(sql, params);
      runNumber = result.rows[0].run_number as number;
      return runNumber;
    },

    async finish(status: 'complete' | 'partial'): Promise<void> {
      if (!runNumber) return;
      const sql = `
        UPDATE test_runs
        SET status = $1, finished_at = NOW()
        WHERE run_number = $2
      `;
      await getPool().query(sql, [status, runNumber]);
    },
  };
}
