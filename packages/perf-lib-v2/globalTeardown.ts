import { closePool } from './db';

// For Cucumber: teardown is handled by AfterAll in hooks_merge_v2.ts
// This file is only needed if using Playwright test runner instead of Cucumber.
export default async function globalTeardown(): Promise<void> {
  await closePool();
}
