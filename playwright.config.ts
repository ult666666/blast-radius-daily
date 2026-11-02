import { defineConfig } from '@playwright/test';
// The keyboard journeys also play the Devvit game page in demo mode, served by the local
// Vite preview. Override the port with BLAST_PREVIEW_PORT when 4175 is taken.
const PREVIEW_PORT = Number(process.env.BLAST_PREVIEW_PORT ?? 4175);
export default defineConfig({
  testDir: './test',
  testMatch: ['demo.spec.ts', 'keyboard.spec.ts'],
  webServer: {
    command: `npm run preview:local -- --port ${PREVIEW_PORT} --strictPort`,
    url: `http://127.0.0.1:${PREVIEW_PORT}/src/client/game.html`,
    reuseExistingServer: false,
    timeout: 60000,
  },
  timeout: 90000,
  // Phaser uses animation time; software-rendered hosted runners can progress
  // more slowly than wall time. Keep semantic waits bounded without skipping them.
  expect: { timeout: 15000 },
  globalTimeout: 360000,
  workers: 1,
  outputDir: '.demo-results',
  reporter: [['list'], ['json', { outputFile: '.demo-results/results.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${PREVIEW_PORT}`,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
