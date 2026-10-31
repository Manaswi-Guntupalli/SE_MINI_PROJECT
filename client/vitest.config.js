import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.jsx'],
    reporters: ['default', ['junit', { outputFile: 'reports/junit.xml' }]],
    coverage: {
      provider: 'v8',
      include: ['src/App.jsx', 'src/RoleDashboard.jsx', 'src/ExamAttempt.jsx', 'src/ResultsPanel.jsx', 'src/ui.jsx', 'src/examClock.js', 'src/dateTime.js'],
      reporter: ['text', 'json-summary', 'lcov', 'cobertura'],
      reportsDirectory: 'coverage',
      reportOnFailure: true,
    },
  },
})
