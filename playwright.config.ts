import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: 'env.satu' });

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: true,
    launchOptions: {
      executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
    },
  },
  globalTeardown: './src/globalTeardown.ts',
});
