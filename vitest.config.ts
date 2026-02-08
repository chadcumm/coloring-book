import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/dist/**',
      ],
      lines: 85,
      functions: 85,
      branches: 85,
      statements: 85,
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
