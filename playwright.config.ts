import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: true,
    channel: process.env.BROWSER_CHANNEL ?? undefined,
  },
  globalTeardown: './src/globalTeardown.ts',
});
