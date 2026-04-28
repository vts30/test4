import { getQueue } from '../perf-lib/queue';
import { closePool } from '../perf-lib/db';

export default async function globalTeardown(): Promise<void> {
  const queue = getQueue();
  queue.stop();
  await queue.flush();
  await closePool();
}
