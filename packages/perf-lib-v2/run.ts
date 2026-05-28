import { getPool } from './db';
import { resolveConfig } from './config';

export interface RunManager {
  start(): Promise<string>;
  finish(status: 'complete' | 'partial'): Promise<void>;
}

export function createRunManager(): RunManager {
  let runId: string | null = null;

  return {
    async start(): Promise<string> {
      const cfg = resolveConfig();
      const sql = `
        INSERT INTO test_runs
          (build_id, git_hash, branch, environment, test_suite, version, tags, started_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'running')
        RETURNING id
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
      runId = result.rows[0].id as string;
      return runId;
    },

    async finish(status: 'complete' | 'partial'): Promise<void> {
      if (!runId) return;
      const sql = `
        UPDATE test_runs
        SET status = $1, finished_at = NOW()
        WHERE id = $2
      `;
      await getPool().query(sql, [status, runId]);
    },
  };
}
