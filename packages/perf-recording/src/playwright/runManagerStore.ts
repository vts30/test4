import { createRunManager, type RunManager } from '../core/run';

let _instance: RunManager | null = null;

export function getRunManager(): RunManager {
  if (!_instance) {
    _instance = createRunManager();
    _instance.start();
  }
  return _instance;
}

export function clearRunManager(): void {
  _instance = null;
}
