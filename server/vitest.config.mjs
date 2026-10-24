import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.mjs'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 180000,
    reporters: ['default', ['junit', { outputFile: 'reports/junit.xml' }]],
    coverage: {
      provider: 'v8',
      include: ['app.js', 'controllers/**/*.js', 'models/**/*.js', 'routes/**/*.js'],
      reporter: ['text', 'json-summary', 'lcov', 'cobertura'],
      reportsDirectory: 'coverage',
      reportOnFailure: true,
    },
  },
});
