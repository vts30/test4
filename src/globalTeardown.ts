import { getQueue } from './queue';
import { closePool } from './db';

export default async function globalTeardown(): Promise<void> {
  const queue = getQueue();
  queue.stop();
  await queue.flush();
  await closePool();
}
