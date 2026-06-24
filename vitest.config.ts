import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/utils/**', 'src/lib/**'],
      // Thresholds refletem cobertura atual; aumentar incrementalmente
      thresholds: {
        statements: 15,
        branches: 5,
        functions: 8,
        lines: 15,
      },
    },
  },
});
