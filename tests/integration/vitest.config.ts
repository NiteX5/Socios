import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/integration/**/*.test.ts'], testTimeout: 60000, env: { NEXT_PUBLIC_USE_EMULATORS: 'true' } },
});
