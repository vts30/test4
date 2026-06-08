import { getPool } from './db';
import { resolveConfig } from './config';
import type { ObservationRecord } from './queue';

export interface RunManager {
  start(): void;
  finish(observations: ObservationRecord[]): Promise<void>;
}

export function createRunManager(): RunManager {
  const cfg = resolveConfig();
  const startedAt = new Date();

  return {
    start(): void {
      // no DB write — full transaction happens in finish()
    },

    async finish(observations: ObservationRecord[]): Promise<void> {
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');

        const runResult = await client.query(`
          INSERT INTO test_runs
            (build_id, git_hash, branch, environment, test_suite, version, tags, started_at, finished_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          RETURNING run_number
        `, [
          cfg.buildId, cfg.gitHash, cfg.branch,
          cfg.environment, cfg.testSuite, cfg.version,
          cfg.buildId ? JSON.stringify({ build: cfg.buildId }) : null,
          startedAt,
        ]);

        const runNumber = runResult.rows[0].run_number as number;

        if (observations.length > 0) {
          const values = observations.map((_, i) => {
            const b = i * 5;
            return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
          });
          const params = observations.flatMap((o) => [
            runNumber, o.metricName, o.responseTimeMs, new Date(),
            JSON.stringify({
              url: o.url, method: o.method, status_code: o.statusCode,
              response_size_bytes: o.responseSizeBytes,
              content_type: o.contentType, assertions: o.assertions,
            }),
          ]);
          await client.query(`
            INSERT INTO observations (run_number, metric_name, value, recorded_at, attributes)
            VALUES ${values.join(', ')}
          `, params);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
}
