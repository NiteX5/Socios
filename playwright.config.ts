import { defineConfig } from '@playwright/test';

// Requiere emuladores (npm run test:e2e los levanta con emulators:exec).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx next dev -p 3100',
    url: 'http://localhost:3100/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_USE_EMULATORS: 'true' },
  },
});
