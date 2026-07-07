import { readFileSync } from 'fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  define: { __VERSION__: JSON.stringify(version) },
  test: {
    environment: 'node',
    setupFiles: ['dotenv/config'],
    // Verifies tests/*.test-d.ts with tsc (incl. that @ts-expect-error lines are real errors).
    // Needs its own tsconfig: the root one only includes src/, which would check nothing.
    typecheck: { enabled: true, tsconfig: './tsconfig.test.json' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
});
