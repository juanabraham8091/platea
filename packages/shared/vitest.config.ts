import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/money.ts', 'src/states.ts', 'src/roles.ts'],
      thresholds: { lines: 90, functions: 90, statements: 90 },
    },
  },
});
