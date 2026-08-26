import { defineConfig, devices } from '@playwright/test';

const PREVIEW_PORT = 4321;
const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

// The smoke tier proves the production build, never a dev server: globalSetup
// builds and serves dist/, which is the artifact that ships. It does that instead
// of using Playwright's webServer option because this Astro version's preview
// server is a background daemon — see preview-lifecycle.ts for what that breaks.
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/preview-lifecycle.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: PREVIEW_URL,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
