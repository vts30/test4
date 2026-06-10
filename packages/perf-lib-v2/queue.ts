import { appendFileSync, existsSync } from 'fs';
import { getPool } from './db';
import { resolveConfig } from './config';
import type { PerfRecord } from './recorder';

export interface ObservationRecord extends PerfRecord {
  metricName: string;
}

export interface Queue {
  enqueue(records: ObservationRecord[]): void;
  flush(runId?: string): Promise<boolean>;
  drain(): ObservationRecord[];
  size(): number;
  start(): void;
  stop(): void;
}

// flat CSV — test_run fields + observation fields in every row (local dev only)
const CSV_HEADER = 'run_id,build_id,git_repo,git_hash,git_branch,test_git_repo,environment,test_suite,sprint,metric_name,value,recorded_at,url,method,status_code,response_size_bytes,content_type,assertions';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function flushToCsv(batch: ObservationRecord[], runId: string, csvPath: string): void {
  const cfg = resolveConfig();
  const needsHeader = !existsSync(csvPath);
  const now = new Date().toISOString();
  const rows = batch.map((r) => [
    runId, cfg.buildId, cfg.gitRepo, cfg.gitHash, cfg.branch,
    cfg.testGitRepo, cfg.environment, cfg.testSuite, cfg.sprint,
    r.metricName, r.responseTimeMs, now,
    r.url, r.method, r.statusCode,
    r.responseSizeBytes, r.contentType,
    JSON.stringify({ ...r.assertions }),
  ].map(escapeCsv).join(','));
  const content = (needsHeader ? CSV_HEADER + '\n' : '') + rows.join('\n') + '\n';
  appendFileSync(csvPath, content, 'utf-8');
}

let instance: Queue | null = null;

export function getQueue(): Queue {
  if (instance) return instance;

  const buffer: ObservationRecord[] = [];
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastRunId: string | null = null;

  const flush = async (runId?: string): Promise<boolean> => {
    const resolvedRunId = runId ?? lastRunId;
    if (buffer.length === 0) return true;
    if (!resolvedRunId) {
      console.warn('[perf-v2] flush() called without runId and no previous runId stored — skipping');
      return false;
    }
    lastRunId = resolvedRunId;
    const batch = buffer.splice(0, buffer.length);
    const now = new Date();

    const csvPath = process.env.PERF_CSV_PATH;
    if (csvPath) {
      try {
        flushToCsv(batch, resolvedRunId, csvPath);
        return true;
      } catch (err) {
        console.warn(`[perf-v2] CSV write failed: ${(err as Error).message}`);
        return false;
      }
    }

    const values = batch.map((_, i) => {
      const b = i * 5;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
    });

    const params = batch.flatMap((r) => [
      resolvedRunId,
      r.metricName,
      r.responseTimeMs,
      now,
      JSON.stringify({
        url: r.url,
        method: r.method,
        status_code: r.statusCode,
        response_size_bytes: r.responseSizeBytes,
        content_type: r.contentType,
        assertions: r.assertions,
      }),
    ]);

    const sql = `
      INSERT INTO observations (run_id, metric_name, value, recorded_at, attributes)
      VALUES ${values.join(', ')}
    `;

    try {
      const pool = getPool();
      const schema = process.env.PG_SCHEMA;
      if (schema) await pool.query(`SET search_path TO ${schema}, public`);
      await pool.query(sql, params);
      return true;
    } catch (err) {
      console.warn(`[perf-v2] DB write failed: ${(err as Error).message}`);
      return false;
    }
  };

  instance = {
    enqueue(records: ObservationRecord[]): void {
      buffer.push(...records);
    },
    flush,
    drain(): ObservationRecord[] {
      return buffer.splice(0, buffer.length);
    },
    size(): number {
      return buffer.length;
    },
    start(): void {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (lastRunId) flush(lastRunId).catch(() => {});
        }, 5000);
      }
    },
    stop(): void {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };

  return instance;
}
