import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

/**
 * Vitest config — intentionally kept separate from vite.config.ts
 * so Sentry / AutoImport plugins don't run in the test environment.
 *
 * Related spec: pm/specs/dev-spec-vitest-infra.md §6-3
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e', 'playwright.config.ts'],
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
