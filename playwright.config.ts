import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  reporter: [['html', { open: 'never' }]],
  use: {
    headless: true,
  },
  globalTeardown: './src/globalTeardown.ts',
});
