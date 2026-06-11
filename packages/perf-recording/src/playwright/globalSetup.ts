import { getRunManager } from './runManagerStore';

export default async function globalSetup(): Promise<void> {
  getRunManager(); // initialises and captures startedAt
}
