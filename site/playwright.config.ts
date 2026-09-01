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
  // Chromium only. A real, monitored CI run caught this step still in flight at 89 minutes on
  // GitHub's 2-core standard runner — one browser engine's worth of process launches, not
  // three, was the difference that mattered first. This is a content-heavy, largely static
  // site, not an app with browser-specific interactive logic: Firefox/WebKit-specific
  // rendering defects are a real but low-probability risk here, accepted rather than hidden.
  // Add either back the day a real defect specific to one of them is found — that is the
  // trigger, not a calendar date.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
