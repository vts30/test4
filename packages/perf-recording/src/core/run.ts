import { appendFileSync, existsSync } from 'fs';
import { getPool } from './db';
import { resolveConfig } from './config';
import type { ObservationRecord } from './queue';

export interface RunManager {
  start(): void;
  finish(observations: ObservationRecord[]): Promise<void>;
}

const CSV_HEADER = 'run_id,build_id,git_repo,git_hash,git_branch,test_git_repo,environment,test_suite,sprint,metric_name,value,recorded_at,url,method,status_code,response_size_bytes,content_type,assertions';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function createRunManager(): RunManager {
  const cfg = resolveConfig();
  const startedAt = new Date();

  return {
    start(): void {},

    async finish(observations: ObservationRecord[]): Promise<void> {
      const csvPath = process.env.PERF_CSV_PATH;
      const schema = process.env.PG_SCHEMA;
      const tr  = schema ? `${schema}.test_runs`   : 'test_runs';
      const obs = schema ? `${schema}.observations` : 'observations';

      const tags = JSON.stringify({
        ...(cfg.buildId ? { build: cfg.buildId } : {}),
        ...(observations.length >= 500 ? { golden: true } : {}),
      });

      if (csvPath) {
        const runId = `local-${Date.now()}`;
        const needsHeader = !existsSync(csvPath);
        const now = new Date().toISOString();
        const rows = observations.map((o) => [
          runId, cfg.buildId, cfg.gitRepo, cfg.gitHash, cfg.branch,
          cfg.testGitRepo, cfg.environment, cfg.testSuite, cfg.sprint,
          o.metricName, o.responseTimeMs, now,
          o.url, o.method, o.statusCode,
          o.responseSizeBytes, o.contentType,
          JSON.stringify({ ...o.assertions }),
        ].map(escapeCsv).join(','));
        const content = (needsHeader ? CSV_HEADER + '\n' : '') + rows.join('\n') + '\n';
        appendFileSync(csvPath, content, 'utf-8');
        return;
      }

      const client = await getPool().connect();
      try {
        await client.query('BEGIN');

        const runResult = await client.query(`
          INSERT INTO ${tr}
            (build_id, git_repo, git_hash, git_branch,
             test_git_repo, test_git_hash, test_git_branch,
             environment, test_suite, sprint,
             tags, started_at, finished_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          RETURNING id
        `, [
          cfg.buildId, cfg.gitRepo, cfg.gitHash, cfg.branch,
          cfg.testGitRepo, cfg.testGitHash, cfg.testGitBranch,
          cfg.environment, cfg.testSuite ?? 'default', cfg.sprint,
          tags, startedAt,
        ]);

        const runId = runResult.rows[0].id as string;

        if (observations.length > 0) {
          const values = observations.map((_, i) => {
            const b = i * 5;
            return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
          });
          const params = observations.flatMap((o) => [
            runId, o.metricName, o.responseTimeMs, new Date(),
            JSON.stringify({
              url: o.url, method: o.method, status_code: o.statusCode,
              response_size_bytes: o.responseSizeBytes,
              content_type: o.contentType, assertions: o.assertions,
            }),
          ]);
          await client.query(`
            INSERT INTO ${obs} (run_id, metric_name, value, recorded_at, attributes)
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
