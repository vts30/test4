import { getQueue } from '../core/queue';
import { closePool } from '../core/db';
import { getRunManager, clearRunManager } from './runManagerStore';

export default async function globalTeardown(): Promise<void> {
  const observations = getQueue().drain();
  await getRunManager().finish(observations);
  clearRunManager();
  await closePool();
}
