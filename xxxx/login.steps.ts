/**
 * Add this step to src/test/steps/login.steps.ts
 * It replaces the Scenario Outline with a single configurable user from LOGIN_USER_ID env var
 */

import { Given } from '@cucumber/cucumber';
import { configuredUser, configuredUserId } from '../src/helper/util/test-data/users';

Given('User logs in {string} as configured user', async function (app: string) {
  if (!configuredUser) {
    throw new Error(`User '${configuredUserId}' not found in users.ts. Check LOGIN_USER_ID in .env.satu.`);
  }

  // reuse existing step logic — replace this with their actual login implementation
  await this.step(`User logs in "${app}" as "${configuredUserId}"`);
});
