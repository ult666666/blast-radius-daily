import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './test',
  testMatch: 'demo.spec.ts',
  timeout: 90000,
  // Phaser uses animation time; software-rendered hosted runners can progress
  // more slowly than wall time. Keep semantic waits bounded without skipping them.
  expect: { timeout: 15000 },
  globalTimeout: 180000,
  workers: 1,
  outputDir: '.demo-results',
  reporter: [['list'], ['json', { outputFile: '.demo-results/results.json' }]],
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
