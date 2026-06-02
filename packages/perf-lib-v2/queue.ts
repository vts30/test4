import { appendFileSync, existsSync } from 'fs';
import { getPool } from './db';
import { resolveConfig } from './config';
import type { PerfRecord } from './recorder';

export interface ObservationRecord extends PerfRecord {
  metricName: string;
}

export interface Queue {
  enqueue(records: ObservationRecord[]): void;
  flush(runNumber?: number): Promise<boolean>;
  size(): number;
  start(): void;
  stop(): void;
}

// flat CSV — test_run fields + observation fields in every row (local dev only)
const CSV_HEADER = 'run_number,build_id,git_hash,branch,environment,version,test_suite,metric_name,value,recorded_at,url,method,status_code,response_size_bytes,content_type,assertions';

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function flushToCsv(batch: ObservationRecord[], runNumber: number, csvPath: string): void {
  const cfg = resolveConfig();
  const needsHeader = !existsSync(csvPath);
  const now = new Date().toISOString();
  const rows = batch.map((r) => [
    runNumber, cfg.buildId, cfg.gitHash, cfg.branch,
    cfg.environment, cfg.version, cfg.testSuite,
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
  let lastRunNumber: number | null = null;

  const flush = async (runNumber?: number): Promise<boolean> => {
    const resolvedRunNumber = runNumber ?? lastRunNumber;
    if (buffer.length === 0) return true;
    if (!resolvedRunNumber) {
      console.warn('[perf-v2] flush() called without runNumber and no previous runNumber stored — skipping');
      return false;
    }
    lastRunNumber = resolvedRunNumber;
    const batch = buffer.splice(0, buffer.length);
    const now = new Date();

    const csvPath = process.env.PERF_CSV_PATH;
    if (csvPath) {
      try {
        flushToCsv(batch, resolvedRunNumber, csvPath);
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
      resolvedRunNumber,
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
      INSERT INTO observations (run_number, metric_name, value, recorded_at, attributes)
      VALUES ${values.join(', ')}
    `;

    try {
      await getPool().query(sql, params);
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
    size(): number {
      return buffer.length;
    },
    start(): void {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (pendingRunNumber) flush(pendingRunNumber).catch(() => {});
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

