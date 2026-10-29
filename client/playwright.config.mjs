import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.mjs',
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [['list'], ['json', { outputFile: 'reports/browser.json' }], ['junit', { outputFile: 'reports/browser-junit.xml' }]],
  outputDir: 'reports/browser-artifacts',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1366, height: 768 },
    channel: process.env.OEP_BROWSER_CHANNEL || (process.platform === 'win32' && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe') ? 'msedge' : undefined),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/fixture-server.mjs',
    url: 'http://127.0.0.1:4173',
    timeout: 180000,
    reuseExistingServer: false,
  },
});
