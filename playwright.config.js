import { defineConfig, devices } from '@playwright/test';

// BASE_URL permite correr los mismos tests contra GitHub Pages:
//   BASE_URL=https://usuario.github.io/sanatorio-del-oeste-juego/ npx playwright test
const BASE_URL = process.env.BASE_URL || 'http://localhost:4173/sanatorio-del-oeste-juego/';
const LOCAL = !process.env.BASE_URL;

const portrait = /.*\.portrait\.spec\.js/;
const landscape = /.*\.landscape\.spec\.js/;

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iphone-se', use: { ...devices['iPhone SE'] }, testMatch: portrait },
    { name: 'iphone-14', use: { ...devices['iPhone 14'] }, testMatch: portrait },
    { name: 'pixel-5', use: { ...devices['Pixel 5'] }, testMatch: portrait },
    { name: 'iphone-14-landscape', use: { ...devices['iPhone 14 landscape'] }, testMatch: landscape },
    { name: 'pixel-5-landscape', use: { ...devices['Pixel 5 landscape'] }, testMatch: landscape },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testMatch: /.*\.desktop\.spec\.js/ },
  ],
  webServer: LOCAL
    ? {
        command: 'node node_modules/vite/bin/vite.js build && node node_modules/vite/bin/vite.js preview --port 4173 --strictPort',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
