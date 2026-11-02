import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// QA independiente: contra emuladores Auth+Firestore (proyecto demo-socios).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/qa/**/*.int.test.ts'],
    testTimeout: 90000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: { NEXT_PUBLIC_USE_EMULATORS: 'true' },
  },
});
