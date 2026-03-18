import { getPool } from './db';
import type { PerfRecord } from './recorder';

export interface QueueRecord extends PerfRecord {
  testName: string;
  environment: string;
  version: string;
}

export interface Queue {
  enqueue(records: QueueRecord[]): void;
  flush(): Promise<void>;
  size(): number;
  start(): void;
  stop(): void;
}

let instance: Queue | null = null;

export function getQueue(): Queue {
  if (instance) return instance;

  const buffer: QueueRecord[] = [];
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);

    const values = batch.map((r, i) => {
      const base = i * 11;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`;
    });

    const params = batch.flatMap((r) => [
      r.testName, r.environment, r.version,
      r.url, r.method, r.statusCode,
      r.responseTimeMs, r.responseSizeBytes, r.contentType,
      JSON.stringify(r.assertions), new Date(),
    ]);

    const sql = `
      INSERT INTO performance_measurements
        (test_name, environment, version, url, method, status_code,
         response_time_ms, response_size_bytes, content_type, assertions, recorded_at)
      VALUES ${values.join(', ')}
    `;

    try {
      await getPool().query(sql, params);
    } catch (err) {
      console.warn(`[perf] Failed to write ${batch.length} record(s) to database: ${(err as Error).message}`);
    }
  };

  instance = {
    enqueue(records: QueueRecord[]): void {
      buffer.push(...records);
    },
    flush,
    size(): number {
      return buffer.length;
    },
    start(): void {
      if (!intervalId) {
        intervalId = setInterval(() => { flush().catch(() => {}); }, 5000);
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
