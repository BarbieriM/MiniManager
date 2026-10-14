import { defineConfig } from '@playwright/test'

// End-to-end tests for the main flows (CLAUDE.md, Testing), in a phone-sized browser, because the MVP is done
// when they work on a phone. Run them with `make e2e`, which prepares the API and its throwaway database.
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5174'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  // No retries: a retry would run against the same database, already changed by the first attempt.
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `yarn vite --port ${new URL(baseURL).port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
