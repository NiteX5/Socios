import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// QA independiente: pruebas puras (sin emulador).
// Ejecutar: npx vitest run --config tests/qa/vitest.config.ts
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/qa/**/*.unit.test.ts'] },
});
